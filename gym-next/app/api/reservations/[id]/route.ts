import { hasPrivateReservationProof } from "@/lib/private-reservation-proof";
import { reservationForRole } from "@/lib/domain/reservation-privacy";
import { NextResponse } from "next/server";
import { currentSession, requireRole } from "@/lib/auth";
import { getReservation, transitionReservation } from "@/lib/reservations";
import { privateReservationTokenValid } from "@/lib/private-reservation-proof";
import { canManageReservation, canViewReservation } from "@/lib/policies/authorization";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const session = await currentSession();
    if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
    const reservation = await getReservation((await params).id);
    const claimToken = new URL(request.url).searchParams.get("claimToken");
    if (reservation && !canViewReservation(session, reservation, (await hasPrivateReservationProof(reservation)) || privateReservationTokenValid(reservation, claimToken ?? undefined))) {
      const error = session.role === "coach" ? "Cette réservation appartient à un autre coach" : session.role === "sportif" ? (reservation.ownerEmail ? "Cette réservation appartient à un autre compte" : "Reservation claim token required") : "Accès à la réservation refusé";
      return NextResponse.json({ error }, { status: 403 });
    }
    return reservation ? NextResponse.json({ data: reservationForRole(reservation, session.role) }) : NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur de lecture" }, { status: 502 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await requireRole("coach");
  if (!session) {
    return NextResponse.json({ error: "Connexion coach requise" }, { status: 401 });
  }
  const current = await getReservation((await params).id);
  if (!current) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (!canManageReservation(session, current)) {
    return NextResponse.json({ error: "Cette réservation appartient à un autre coach" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  if (!["accepted", "rejected", "cancelled"].includes(body?.status)) {
    return NextResponse.json({ error: "Statut coach invalide" }, { status: 400 });
  }

  if (body.appointmentAt !== undefined && typeof body.appointmentAt !== "string") return NextResponse.json({ error: "Créneau invalide" }, { status: 400 });
  try {
    const reservation = await transitionReservation((await params).id, body.status, body.appointmentAt);
    return reservation ? NextResponse.json({ data: reservationForRole(reservation, session.role) }) : NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transition impossible" }, { status: 409 });
  }
}
