import { slotInstant } from "@/lib/domain/booking-time";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { rescheduleReservation } from "@/lib/reservations";
import { bodyExceedsLimit } from "@/lib/request-guards";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session || session.role !== "sportif") return NextResponse.json({ error: "Connexion sportif requise" }, { status: 401 });
  if (bodyExceedsLimit(request, 16 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.slots) || body.slots.some((slot: unknown) => typeof slot !== "string")) return NextResponse.json({ error: "Créneaux invalides" }, { status: 400 });
  const slots = Array.isArray(body?.slots) ? body.slots.filter((slot: unknown) => typeof slot === "string" && slot.trim()).map((slot: string) => slot.trim()) : [];
  if (body.expected!==undefined && (!body.expected || typeof body.expected!=="object" || !Array.isArray(body.expected.slots) || body.expected.slots.length<1 || body.expected.slots.length>3 || body.expected.slots.some((s:unknown)=>typeof s!=="string"||slotInstant(s)===null) || (body.expected.appointmentAt!==null && (typeof body.expected.appointmentAt!=="string"||slotInstant(body.expected.appointmentAt)===null)))) return NextResponse.json({error:"État initial invalide"},{status:400});
  try {
    const reservation = await rescheduleReservation((await params).id, session.email, slots, body.expected);
    return reservation ? NextResponse.json({ data: reservation }) : NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Déplacement impossible" }, { status: 409 });
  }
}
