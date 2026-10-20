import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { Reservation } from "@/lib/domain";
import { sendReservationReminder } from "@/lib/notifications";
import { listReservations } from "@/lib/reservations";

// This endpoint must be evaluated on every request: the secret is supplied by
// Netlify at runtime and the reservation window moves continuously.
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? request.headers.get("x-cron-secret") ?? "";
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  if (!isAuthorized(request)) return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
  const now = Date.now();
  const candidates = (await listReservations()).filter((reservation: Reservation) => {
    if (!reservation.appointmentAt || !["accepted", "paid"].includes(reservation.status)) return false;
    const hoursUntil = (new Date(reservation.appointmentAt).getTime() - now) / 3_600_000;
    return Number.isFinite(hoursUntil) && hoursUntil > 48 && hoursUntil <= 72;
  });
  const results = await Promise.allSettled(candidates.map((reservation: Reservation) => sendReservationReminder(reservation)));
  const sent = results.filter((result) => result.status === "fulfilled" && result.value.status === "sent").length;
  const queued = results.filter((result) => result.status === "fulfilled" && result.value.status === "queued").length;
  return NextResponse.json({ data: { inspected: candidates.length, sent, queued, failed: results.length - sent - queued } });
}
