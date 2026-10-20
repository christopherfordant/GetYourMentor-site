import type { Reservation } from "@/lib/domain";
export function reservationForRole(reservation: Reservation, role: string): Reservation {
  if (role !== "coach" || !reservation.additionalParticipants) return reservation;
  return { ...reservation, additionalParticipants: reservation.additionalParticipants.map(p => ({ ...p, email: "" })) };
}
