import type { Reservation } from "./domain";
import type { Session } from "./auth";
import { readBookingSummary } from "./booking-summary";
export function summaryProofWindow(reservation: Pick<Reservation, "createdAt">, now = Date.now()) {
  const created = Date.parse(reservation.createdAt);
  return Number.isFinite(created) && created <= now && now - created < 86400000;
}
export function summaryAccess(session: Session | null, reservation: Reservation, proofValid: boolean) {
  if (session && session.role !== "sportif") return false;
  if (reservation.ownerEmail) return session?.role === "sportif" && session.email === reservation.ownerEmail;
  return proofValid;
}
export function summaryFields(r: Reservation, authenticated: boolean) {
  return readBookingSummary({ id:r.id,coachName:r.coachName,sport:r.sport,city:r.city,service:r.service,duration:r.duration,price:r.price,
    slots:r.slots,appointmentAt:r.appointmentAt,status:r.status,participantCount:r.participantCount ?? 1,authenticated },r.id);
}
