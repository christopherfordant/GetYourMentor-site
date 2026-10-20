import { normalizeSlots, durationMinutes } from "./booking-time";
export function parsePublishedSession(body: unknown, coach = false) {
  const b = body as Record<string, unknown> | null;
  if (!b || typeof b.title !== "string" || !b.title.trim() || b.title.length > 120 || typeof b.duration !== "string" || b.duration.length > 80 || !durationMinutes(b.duration)) return null;
  if (!Array.isArray(b.slots) || b.slots.some(s => typeof s !== "string" || s.length > 80)) return null;
  const slots = normalizeSlots(b.slots as string[]);
  const capacity = b.capacity ?? 1;
  if (!slots || (coach && slots.length !== 1) || !Number.isInteger(capacity) || (capacity as number) < (coach ? 2 : 1) || (capacity as number) > 50) return null;
  if (coach && (typeof b.location !== "string" || !b.location.trim() || b.location.length > 240)) return null;
  return { title: b.title.trim(), duration: b.duration.trim(), slots, capacity: capacity as number, location: coach ? (b.location as string).trim() : undefined };
}
