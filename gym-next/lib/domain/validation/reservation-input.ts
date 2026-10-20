import { parseBookingParty, type BookingParty } from "@/lib/domain/participants";
import { normalizeSlots, durationMinutes, slotInstant } from "@/lib/domain/booking-time";

export type ReservationInput = BookingParty & {
  coachId: string;
  service: string;
  duration: string;
  slots: string[];
  appointmentAt?: string;
};

type ValidationResult =
  | { ok: true; data: ReservationInput }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function tooLong(value: unknown, max: number) {
  return typeof value === "string" && value.length > max;
}

export function parseReservationInput(body: unknown): ValidationResult {
  if (!isRecord(body)) return { ok: false, error: "coachId, service, duration et 1 à 3 créneaux sont requis" };

  const coachId = typeof body.coachId === "string" ? body.coachId : "";
  const service = typeof body.service === "string" ? body.service : "";
  const duration = typeof body.duration === "string" ? body.duration : "";
  const slots = Array.isArray(body.slots)
    ? Array.from(new Set(body.slots.filter((slot): slot is string => typeof slot === "string")))
    : [];
  const appointmentAt = typeof body.appointmentAt === "string" ? body.appointmentAt : undefined;

  const invalid =
    tooLong(coachId, 128) ||
    tooLong(service, 256) ||
    tooLong(duration, 128) ||
    slots.some((slot) => tooLong(slot, 256) || !slot.trim()) ||
    tooLong(appointmentAt, 128) ||
    !coachId ||
    !service ||
    !duration ||
    slots.length < 1 ||
    slots.length > 3;

  if (!Array.isArray(body.slots) || body.slots.length > 3 || (body.appointmentAt !== undefined && typeof body.appointmentAt !== "string") || body.slots.some(slot => typeof slot !== "string")) return { ok: false, error: "Créneaux invalides" };
  if (invalid) return { ok: false, error: "coachId, service, duration et 1 à 3 créneaux sont requis" };
  const normalized = normalizeSlots(slots);
  if (!normalized || !durationMinutes(duration)) return { ok: false, error: "Indiquez des dates futures avec fuseau et une durée valide (1 à 480 minutes)" };
  if (appointmentAt !== undefined && slotInstant(appointmentAt) !== slotInstant(normalized[0])) return { ok: false, error: "La date du rendez-vous doit correspondre au premier créneau" };
  const party = parseBookingParty(body.participantCount, body.additionalParticipants);
  if (!party) return { ok: false, error: "Renseignez le nombre de participants et les informations de chaque personne supplémentaire" };
  return { ok: true, data: { ...party, coachId, service, duration, slots: normalized, appointmentAt: normalized[0] } };
}
