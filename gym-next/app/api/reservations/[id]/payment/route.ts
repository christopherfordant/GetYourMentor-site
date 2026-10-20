import { hasPrivateReservationProof } from "@/lib/private-reservation-proof";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { payReservation } from "@/lib/reservations";
import { createCheckoutSession } from "@/lib/payments";
import { getReservation } from "@/lib/reservations";
import { privateReservationTokenValid } from "@/lib/private-reservation-proof";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("sportif");
  if (!session) {
    return NextResponse.json({ error: "Connexion sportif requise pour payer" }, { status: 401 });
  }
  try {
    const reservationId = (await params).id;
    const current = await getReservation(reservationId);
    if (!current) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    if (current.ownerEmail && current.ownerEmail !== session.email) return NextResponse.json({ error: "Cette réservation appartient à un autre compte" }, { status: 403 });
    if (!current.ownerEmail && !(await hasPrivateReservationProof(current)) && !privateReservationTokenValid(current, request.headers.get("x-reservation-claim-token") ?? undefined)) {
      return NextResponse.json({ error: "Reservation claim token required" }, { status: 403 });
    }
    if (current.status === "paid") return NextResponse.json({ data: current });
    const checkout = await createCheckoutSession({ ...current, ownerEmail: current.ownerEmail ?? session.email });
    if (checkout) return NextResponse.json({ data: { ...checkout, provider: "stripe", status: "pending" } });
    const reservation = await payReservation(reservationId, session.email);
    return reservation ? NextResponse.json({ data: reservation }) : NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Paiement non autorisé" }, { status: 409 });
  }
}
