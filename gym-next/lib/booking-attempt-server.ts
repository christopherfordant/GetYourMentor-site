import { createHash, createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { isIsolatedDemoFeatureEnabled } from "./runtime";
import type { Reservation } from "./domain";

export type BookingAttempt = { id: string; scope: string; fingerprint: string; expiresAt: number; receipt: Reservation };
export type AttemptInput = Pick<BookingAttempt, "id" | "scope" | "fingerprint">;
export class BookingAttemptError extends Error {
  constructor(public status: number, message = "Reprise indisponible pour cette tentative") { super(message); }
}
export const attemptIdValid = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function attemptFingerprint(body: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify([body.coachId, body.service, body.duration, body.slots, body.appointmentAt ?? null, body.participantCount ?? 1, body.additionalParticipants ?? [], body.structureOfferId ?? null])).digest("hex");
}
export function previousAttempt(rows: BookingAttempt[], id: string, scope: string, fingerprint?: string, now = Date.now()) {
  const previous = rows.find(row => row.id === id);
  if (!previous) return null;
  if (previous.scope !== scope) throw new BookingAttemptError(403);
  if (previous.expiresAt <= now) throw new BookingAttemptError(410, "Cette tentative a expiré. Vérifiez vos réservations avant toute nouvelle demande.");
  if (fingerprint !== undefined && previous.fingerprint !== fingerprint) throw new BookingAttemptError(409, "Cette tentative correspond à une autre demande");
  return previous.receipt;
}
export function bookingRecoveryEnabled() {
  return isIsolatedDemoFeatureEnabled() && (process.env.SESSION_SECRET?.length ?? 0) >= 32;
}
export async function attemptScope(email?: string, initialize = false) {
  if (!bookingRecoveryEnabled()) throw new BookingAttemptError(503);
  const store = await cookies();
  let proof = store.get("gym-booking-browser")?.value;
  if (!proof || !/^[0-9a-f]{64}$/.test(proof)) {
    if (!initialize) throw new BookingAttemptError(403);
    proof = randomBytes(32).toString("hex");
    store.set("gym-booking-browser", proof, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/reservations", maxAge: 7 * 86400 });
  }
  return createHmac("sha256", process.env.SESSION_SECRET!).update(JSON.stringify(["booking-attempt-v1", proof, email?.toLowerCase() ?? null])).digest("hex");
}
