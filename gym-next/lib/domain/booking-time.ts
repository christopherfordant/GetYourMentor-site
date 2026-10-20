import type { Reservation } from "@/lib/domain";
// Storage and comparisons use UTC; visitor-facing dates use the project timezone.
export const BOOKING_TIME_ZONE = "Europe/Paris";

export function slotInstant(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d, h, min, sec = "0", , offset] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > days || Number(h) > 23 || Number(min) > 59 || Number(sec) > 59) return null;
  if (offset !== "Z" && (Number(offset.slice(1, 3)) > 14 || Number(offset.slice(4)) > 59 || (Number(offset.slice(1, 3)) === 14 && offset.slice(4) !== "00"))) return null;
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

export function durationMinutes(value: string): number | null {
  const match = /^(\d{1,3})\s*(min(?:utes?)?|h(?:eures?)?)(?:\s*(\d{1,2})(?:\s*min)?)?$/i.exec(value.trim());
  if (!match || (match[2].toLowerCase().startsWith("min") && match[3])) return null;
  const minutes = match[2].toLowerCase().startsWith("h") ? Number(match[1]) * 60 + Number(match[3] ?? 0) : Number(match[1]);
  return minutes >= 1 && minutes <= 480 && (!match[3] || Number(match[3]) < 60) ? minutes : null;
}

export function normalizeSlots(values: readonly string[], now = Date.now()): string[] | null {
  if (values.length < 1 || values.length > 3) return null;
  const instants = values.map(slotInstant);
  if (instants.some(t => t === null || t <= now)) return null;
  return [...new Set((instants as number[]).map(t => new Date(t).toISOString()))];
}

export function intervalsOverlap(a: readonly string[], aDuration: string, b: readonly string[], bDuration: string) {
  const aMinutes = durationMinutes(aDuration), bMinutes = durationMinutes(bDuration);
  return a.some(left => b.some(right => {
    const x = slotInstant(left), y = slotInstant(right);
    // Preserve blocking of legacy exact values without reinterpreting historical data.
    if (x === null || y === null || !aMinutes || !bMinutes) return left === right;
    return x < y + bMinutes * 60000 && y < x + aMinutes * 60000;
  }));
}

export function formatBookingSlot(value: string) {
  return slotInstant(value) === null ? value : new Intl.DateTimeFormat("fr-FR", {
    timeZone: BOOKING_TIME_ZONE, dateStyle: "medium", timeStyle: "short",
  }).format(new Date(value));
}

export function demoCalendarWeeks(now: number, count = 2) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: BOOKING_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(now));
  const start = Date.parse(`${today}T12:00:00Z`);
  return Array.from({ length: count }, (_, week) => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start + (1 + week * 7 + index) * 86400000);
    // Fixed UTC demo hours are rendered in Paris time, including DST changes.
    const slots = [8, 10, 13, 15].map(hour => { const slot = new Date(date); slot.setUTCHours(hour, 0, 0, 0); return slot.toISOString(); });
    return { day: new Intl.DateTimeFormat("fr-FR", { timeZone: BOOKING_TIME_ZONE, weekday: "long" }).format(date), date: new Intl.DateTimeFormat("fr-FR", { timeZone: BOOKING_TIME_ZONE, day: "2-digit", month: "short" }).format(date), slots };
  }));
}

// An agreed appointment wins; multiple proposed slots are not multiple sessions.
export function reservationStart(reservation: Pick<Reservation, "slots" | "appointmentAt">) {
  return slotInstant(reservation.appointmentAt ?? (reservation.slots.length === 1 ? reservation.slots[0] : ""));
}
