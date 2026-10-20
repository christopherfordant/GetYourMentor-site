import { normalizeSlots } from "@/lib/domain/booking-time";
import type { ReservationStatus } from "@/lib/domain";

export const ACTIVE_RESERVATION_STATUSES: ReadonlySet<ReservationStatus> = new Set([
  "requested",
  "accepted",
  "paid",
]);

export function hasOverlappingSlot(slots: readonly string[], candidateSlots: readonly string[]) {
  const available = new Set(slots);
  return candidateSlots.some((slot) => available.has(slot));
}

export function validateReservationSlots(slots: readonly string[]) {
  const normalized = normalizeSlots(slots);
  return { valid: normalized !== null, slots: normalized ?? [] } as const;
}

export function canTransitionReservation(status: ReservationStatus, nextStatus: "accepted" | "rejected" | "cancelled") {
  return status === "requested" && ["accepted", "rejected", "cancelled"].includes(nextStatus);
}

export function refundPercentForAppointment(appointmentAt: string, now = new Date()) {
  const hoursUntil = (new Date(appointmentAt).getTime() - now.getTime()) / 3_600_000;
  if (hoursUntil > 48) return 100;
  if (hoursUntil >= 24) return 50;
  return 0;
}
