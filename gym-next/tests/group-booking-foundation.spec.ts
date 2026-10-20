import { expect, test } from "@playwright/test";
import { parseBookingParty, reservedPlaces } from "../lib/domain/participants";
import { createStructureOffer, memoryStructureOffers } from "../lib/structure-offers";
import { createPersistedReservation, updatePersistedReservation, memoryReservations } from "../lib/repositories/reservation-repository";
import { financialSnapshot } from "../lib/domain/commission";
import type { Reservation } from "../lib/domain";

const person = { firstName: "Camille", lastName: "Exemple", age: 22, email: "camille@example.com" };
test("participants : données minimales, cardinalité stricte, anciennes réservations", () => {
  expect(parseBookingParty(undefined, undefined)).toEqual({ participantCount: 1, additionalParticipants: [] });
  expect(parseBookingParty(2, [{ ...person, ignored: "not persisted" }])).toEqual({ participantCount: 2, additionalParticipants: [person] });
  expect(reservedPlaces({})).toBe(1);
  for (const count of [0, -1, 2.5, "2", NaN, 51, null]) expect(parseBookingParty(count, [])).toBeNull();
  for (const patch of [{ firstName: " " }, { lastName: "" }, { age: "22" }, { age: -1 }, { age: 121 }, { email: "invalid" }]) expect(parseBookingParty(2, [{ ...person, ...patch }])).toBeNull();
  expect(parseBookingParty(3, [person])).toBeNull(); expect(parseBookingParty(1, [person])).toBeNull();
  expect(parseBookingParty(2, [{ ...person, age: 12 }])).not.toBeNull(); // Data alone does not grant parental authorization.
});

test("capacité pondérée : concurrence, refus et annulation libèrent le nombre réel de places", async () => {
  const previous = { ...process.env };
  const before = memoryReservations.length, offersBefore = memoryStructureOffers.length;
  try {
    delete process.env.SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    Object.assign(process.env, { NODE_ENV: "development", GETYOURMENTOR_ALLOW_DEMO: "true", DEPLOY_ENV: "local" });
    const slot = new Date(Date.now() + 20 * 86400000).toISOString();
    const offer = await createStructureOffer("club@example.com", "Groupe fictif", "1 heure", [slot], 6);
    const booking = (id: string, participantCount: number): Reservation => ({ id, ownerEmail: `${id}@example.com`, coachId: offer.coachId, coachName: "Coach Démo 01", sport: "basketball", city: "Marseille", service: offer.title, duration: offer.duration, price: 35, slots: [slot], status: "requested", createdAt: new Date().toISOString(), appointmentAt: slot, structureOfferId: offer.id, participantCount, additionalParticipants: Array.from({ length: participantCount - 1 }, () => ({ ...person })), financials: financialSnapshot(35, 1500, 1) });
    const responses = await Promise.allSettled([createPersistedReservation(booking("group-a", 3)), createPersistedReservation(booking("group-b", 3)), createPersistedReservation(booking("group-c", 1))]);
    expect(responses.filter(r => r.status === "fulfilled")).toHaveLength(2); expect(responses[2].status).toBe("rejected");
    const cancelled = await updatePersistedReservation("group-a", { status: "cancelled" }, "requested");
    expect(cancelled?.participantCount).toBe(3); expect(cancelled?.additionalParticipants).toHaveLength(2);
    expect((await createPersistedReservation(booking("group-c", 3))).participantCount).toBe(3);
    await updatePersistedReservation("group-b", { status: "rejected" }, "requested");
    expect((await createPersistedReservation(booking("group-d", 3))).financials).toEqual(financialSnapshot(35, 1500, 1));
    await expect(createPersistedReservation(booking("group-e", 1))).rejects.toThrow();
    await expect(createPersistedReservation({ ...booking("no-collective", 2), structureOfferId: undefined })).rejects.toThrow();
  } finally { process.env = previous; memoryReservations.splice(before); memoryStructureOffers.splice(offersBefore); }
});

test("aucun prix de groupe implicite et aucune inscription individuelle silencieuse", async ({ request }) => {
  const response = await request.post("/api/reservations", { data: { coachId: "coach-demo-01", service: "Groupe", duration: "1 heure", slots: [new Date(Date.now() + 21 * 86400000).toISOString()], participantCount: 2, additionalParticipants: [person], price: 1 } });
  expect(response.status()).toBe(409); expect((await response.json()).error).toContain("séance collective");
  const invalid = await request.post("/api/reservations", { data: { coachId: "coach-demo-01", service: "Groupe", duration: "1 heure", slots: [new Date(Date.now() + 21 * 86400000).toISOString()], participantCount: 3, additionalParticipants: [person] } });
  expect(invalid.status()).toBe(400);
});
