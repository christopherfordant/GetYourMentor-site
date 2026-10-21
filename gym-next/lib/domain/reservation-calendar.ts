import { createHash } from "node:crypto";
import type { Reservation } from "@/lib/domain";
import { durationMinutes, reservationStart } from "@/lib/domain/booking-time";

export function calendarEligible(row: Pick<Reservation, "status" | "slots" | "appointmentAt" | "duration">) {
  return ["accepted", "paid"].includes(row.status) && reservationStart(row) !== null && durationMinutes(row.duration) !== null;
}

const utc = (instant: number) => new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
// RFC 5545: CRLF and folding at 75 octets, without splitting a UTF-8 character.
function fold(line: string) {
  const lines: string[] = []; let current = "";
  for (const character of line) {
    if (Buffer.byteLength(current + character, "utf8") > 75) { lines.push(current); current = " "; }
    current += character;
  }
  lines.push(current); return lines.join("\r\n");
}

export function reservationCalendar(row: Reservation, now = Date.now()) {
  if (!calendarEligible(row) || !Number.isFinite(now)) throw new Error("Calendrier indisponible pour cette réservation");
  const start = reservationStart(row)!;
  const end = start + durationMinutes(row.duration)! * 60_000;
  const uid = createHash("sha256").update(row.id).digest("hex");
  // Deliberately no user-entered text, identities, access proofs, URLs or attendees.
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GetYourMentor//Demo Calendar//FR", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${uid}@getyourmentor.demo`, `DTSTAMP:${utc(now)}`, `DTSTART:${utc(start)}`, `DTEND:${utc(end)}`,
    "SUMMARY:GetYourMentor - séance de démonstration",
    "DESCRIPTION:Copie manuelle d'une séance acceptée en démonstration. Aucun paiement ni présence attesté. Les déplacements et annulations ne sont pas synchronisés. Vérifiez votre compte avant la séance.",
    "CLASS:PRIVATE", "END:VEVENT", "END:VCALENDAR", ""].map(fold).join("\r\n");
}
