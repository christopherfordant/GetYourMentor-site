import { slotInstant, durationMinutes } from "./domain/booking-time";
export const summaryStatuses = ["requested", "accepted", "rejected", "cancelled", "paid"] as const;
export type BookingSummary = {
  id: string; coachName: string; sport: string; city: string; service: string; duration: string; price: number;
  slots: string[]; appointmentAt?: string; status: typeof summaryStatuses[number]; participantCount: number;
  authenticated: boolean; claimToken?: string;
};
export function readBookingSummary(value: unknown, expectedId: string): BookingSummary {
  if (!value || typeof value !== "object") throw new Error("Invalid summary");
  const d = value as Record<string, unknown>;
  if (d.id !== expectedId || !["coachName", "city", "service", "sport"].every(k => typeof d[k] === "string" && (d[k] as string).length > 0 && (d[k] as string).length <= 256)
    || !["fitness", "football", "basketball", "sports-de-combat"].includes(d.sport as string)
    || typeof d.duration !== "string" || !durationMinutes(d.duration) || typeof d.price !== "number" || !Number.isFinite(d.price) || d.price < 0
    || !Array.isArray(d.slots) || d.slots.length < 1 || d.slots.length > 3 || d.slots.some(s => typeof s !== "string" || slotInstant(s) === null)
    || (d.appointmentAt !== undefined && (typeof d.appointmentAt !== "string" || slotInstant(d.appointmentAt) === null || !d.slots.includes(d.appointmentAt)))
    || !summaryStatuses.includes(d.status as BookingSummary["status"]) || !Number.isInteger(d.participantCount) || (d.participantCount as number) < 1 || (d.participantCount as number) > 50
    || typeof d.authenticated !== "boolean" || (d.claimToken !== undefined && (typeof d.claimToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(d.claimToken)))) throw new Error("Invalid summary");
  return d as BookingSummary;
}
