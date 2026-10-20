export type AdditionalParticipant = { firstName: string; lastName: string; age: number; email: string };
export type BookingParty = { participantCount: number; additionalParticipants: AdditionalParticipant[] };
export const DEMO_PARTICIPANT_INPUT_LIMIT = 50; // Technical input bound, not a commercial capacity.

export function parseBookingParty(count: unknown, people: unknown): BookingParty | null {
  const participantCount = count === undefined ? 1 : count;
  const participants = people === undefined ? [] : people;
  if (!Number.isInteger(participantCount) || typeof participantCount !== "number" || participantCount < 1 || participantCount > DEMO_PARTICIPANT_INPUT_LIMIT || !Array.isArray(participants) || participants.length !== participantCount - 1) return null;
  const additionalParticipants: AdditionalParticipant[] = [];
  for (const value of participants) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const { firstName, lastName, age, email } = value;
    if (typeof firstName !== "string" || !firstName.trim() || firstName.length > 80 || typeof lastName !== "string" || !lastName.trim() || lastName.length > 80 || !Number.isInteger(age) || age < 0 || age > 120 || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    additionalParticipants.push({ firstName: firstName.trim(), lastName: lastName.trim(), age, email: email.trim() });
  }
  return { participantCount, additionalParticipants };
}

export function reservedPlaces(reservation: { participantCount?: number }) {
  const count = reservation.participantCount ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > DEMO_PARTICIPANT_INPUT_LIMIT) throw new Error("Nombre de participants invalide");
  return count;
}
