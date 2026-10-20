import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { type Reservation } from "@/lib/domain";
import { listCoaches } from "@/lib/coaches";
import { listReservations } from "@/lib/reservations";
import { listClubLeads, updateClubLeadStatus, type ClubLead } from "@/lib/clubs";
import { bodyExceedsLimit, textExceedsLimit } from "@/lib/request-guards";

export async function GET() {
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Connexion admin requise" }, { status: 401 });
  try {
    const reservations: Reservation[] = await listReservations();
    const coachProfiles = await listCoaches();
    const clubLeads = await listClubLeads();
    return NextResponse.json({ data: {
      coaches: coachProfiles.length,
      verifiedCoaches: coachProfiles.filter((coach) => coach.verified).length,
      reservations: reservations.length,
      requested: reservations.filter((reservation) => reservation.status === "requested").length,
      accepted: reservations.filter((reservation) => reservation.status === "accepted").length,
      paid: reservations.filter((reservation) => reservation.status === "paid").length,
      coachList: coachProfiles.map((coach) => ({
        id: coach.id,
        name: coach.name,
        sport: coach.sport,
        city: coach.city,
        verified: coach.verified,
        verificationStatus: coach.verificationStatus ?? (coach.verified ? "approved" : "pending"),
        profileComplete: Boolean(coach.specialty && coach.city && coach.description && coach.disciplines && coach.diplomas && coach.sessionTypes && coach.photoUrl && coach.bankAccountLast4),
      })),
      reservationList: reservations.map((reservation) => ({ id: reservation.id, coachName: reservation.coachName, service: reservation.service, status: reservation.status, price: reservation.price })),
      clubLeads: clubLeads.length,
      pendingClubLeads: clubLeads.filter((lead) => lead.status === "pending").length,
      clubLeadList: clubLeads.map((lead) => ({ id: lead.id, clubName: lead.clubName, managerName: lead.managerName, email: lead.email, createdAt: lead.createdAt, status: lead.status })),
    } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vue admin indisponible" }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Connexion admin requise" }, { status: 401 });
  if (bodyExceedsLimit(request, 8 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (typeof body?.clubLeadId !== "string" || textExceedsLimit(body.clubLeadId, 128) || (status !== "pending" && status !== "contacted" && status !== "closed")) {
    return NextResponse.json({ error: "Identifiant et statut de demande club requis" }, { status: 400 });
  }
  try {
    const lead = await updateClubLeadStatus(body.clubLeadId, status as ClubLead["status"]);
    return lead ? NextResponse.json({ data: lead }) : NextResponse.json({ error: "Demande club introuvable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mise à jour impossible" }, { status: 502 });
  }
}
