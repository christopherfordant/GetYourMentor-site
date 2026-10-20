import type { Reservation } from "@/lib/domain";
import type { Session } from "@/lib/auth";

export function canViewReservation(session: Session, reservation: Reservation, claimTokenValid = false) {
  if (session.role === "admin") return true;
  if (session.role === "sportif") {
    if (reservation.ownerEmail) return reservation.ownerEmail === session.email;
    return claimTokenValid;
  }
  if (session.role === "coach") return Boolean(session.coachId && session.coachId === reservation.coachId);
  return false;
}

export function canManageReservation(session: Session, reservation: Reservation) {
  return session.role === "coach" && Boolean(session.coachId && session.coachId === reservation.coachId);
}

export function canViewPrivateCoach(session: Session | null, coachId: string) {
  return Boolean(session && (session.role === "admin" || (session.role === "coach" && session.coachId === coachId)));
}

export function canEditCoachProfile(session: Session, coachId: string) {
  return session.role === "coach" && Boolean(session.coachId && session.coachId === coachId);
}
