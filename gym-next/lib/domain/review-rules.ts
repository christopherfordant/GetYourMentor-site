import type { Reservation } from "@/lib/domain";
import { durationMinutes, reservationStart } from "./booking-time";

export function canReviewReservation(reservation: Pick<Reservation, "status" | "slots" | "duration" | "appointmentAt">, now = Date.now()) {
  const start = reservationStart(reservation), minutes = durationMinutes(reservation.duration);
  return reservation.status === "paid" && start !== null && minutes !== null && start + minutes * 60000 <= now;
}

export function withReviewStats<T extends { id: string; rating: number; reviewCount: number }>(coaches: T[], reviews: Array<{ coachId?: string; reservationId: string; rating: number }>, reservations: Array<{ id: string; coachId: string }>) {
  const ids = new Map(reservations.map(reservation => [reservation.id, reservation.coachId]));
  const totals = new Map<string, { count: number; total: number }>();
  const seen = new Set<string>();
  for (const review of reviews) {
    const coachId = review.coachId ?? ids.get(review.reservationId);
    if (!coachId || seen.has(review.reservationId) || !Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) continue;
    seen.add(review.reservationId);
    const previous = totals.get(coachId) ?? { count: 0, total: 0 };
    totals.set(coachId, { count: previous.count + 1, total: previous.total + review.rating });
  }
  return coaches.map(coach => { const stats = totals.get(coach.id); return { ...coach, rating: stats ? stats.total / stats.count : 0, reviewCount: stats?.count ?? 0 }; });
}
