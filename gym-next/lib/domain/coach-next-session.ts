import type { Reservation } from "@/lib/domain";
import { durationMinutes, reservationStart } from "./booking-time";

export function coachNextSession(rows: Reservation[], coachId: string, now = Date.now()) {
  const seen = new Set<string>();
  let unknownSchedule = 0;
  const sessions: Array<{ reservation: Reservation; start: number; end: number }> = [];
  for (const reservation of rows) {
    if (reservation.coachId !== coachId || seen.has(reservation.id)) continue;
    seen.add(reservation.id);
    if (reservation.status !== "accepted" && reservation.status !== "paid") continue;
    const start = reservationStart(reservation), minutes = durationMinutes(reservation.duration);
    if (start === null || minutes === null) { unknownSchedule++; continue; }
    const end = start + minutes * 60000;
    if (end > now) sessions.push({ reservation, start, end });
  }
  sessions.sort((a, b) => a.start - b.start || a.reservation.id.localeCompare(b.reservation.id));
  const next = sessions[0] ?? null;
  return { next, ongoing: next !== null && next.start <= now, unknownSchedule };
}
