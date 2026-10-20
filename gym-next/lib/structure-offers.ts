import { intervalsOverlap } from "@/lib/domain/booking-time";
import { reservedPlaces } from "@/lib/domain/participants";
import { getCoach } from "@/lib/coaches";
import { activeCoachIds, listAffiliations } from "@/lib/affiliations";
import { randomUUID } from "node:crypto";
import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";
import { listReservations } from "@/lib/reservations";
import type { Reservation } from "@/lib/domain";

export type StructureOffer = { id: string; ownerEmail: string; coachId: string; title: string; duration: string; slots: string[]; capacity?: number; createdAt: string; source?: "coach" | "structure"; location?: string; sport?: string };
export const memoryStructureOffers: StructureOffer[] = [];
const memory = memoryStructureOffers;


export async function listStructureOffers(ownerEmail?: string) {
  assertDemoFallbackAllowed("Séances de structure (démonstration)");
  const offers = isHostedDemo() ? (await readDemoState()).structureOffers ?? [] : memory;
  return offers.filter((offer) => !ownerEmail || offer.ownerEmail === ownerEmail);
}

export async function getStructureOffer(id: string) { return (await listStructureOffers()).find((offer) => offer.id === id) ?? null; }

export async function createStructureOffer(email: string, title: string, duration: string, slots: string[], capacity = 1, selectedCoachId?: string) {
  assertDemoFallbackAllowed("Séances de structure (démonstration)");
  const allowed = activeCoachIds(await listAffiliations({ role: "club", email }), email);
  const coachId = selectedCoachId ?? (allowed.includes("coach-demo-01") ? "coach-demo-01" : allowed.length === 1 ? allowed[0] : undefined);
  if (selectedCoachId !== undefined && !allowed.includes(selectedCoachId)) throw new Error("Coach non affilié à cette structure.");
  if (!coachId) throw new Error("Un coach doit être affilié à votre structure avant de proposer une séance.");
  const offer: StructureOffer = { id: `offer-${randomUUID()}`, ownerEmail: email, coachId, title, duration, slots, capacity, createdAt: new Date().toISOString() };
  return persistOffer(offer);
}

export async function structureReservationSummaries(email: string) {
  const ids = new Set((await listStructureOffers(email)).filter(o => o.source !== "coach").map((offer) => offer.id));
  const reservations: Reservation[] = await listReservations();
  return reservations.filter((r) => r.structureOfferId && ids.has(r.structureOfferId)).map((r) => ({ id: r.id, structureOfferId: r.structureOfferId, coachName: r.coachName, participantCount: r.participantCount ?? 1, service: r.service, slots: r.slots, status: r.status, price: r.price, reservationCode: ["accepted", "paid"].includes(r.status) ? r.reservationCode : undefined }));
}

export function publicStructureOffer({ ownerEmail: _ownerEmail, ...offer }: StructureOffer) { return offer; }

async function persistOffer(offer: StructureOffer) {
  if (isHostedDemo()) return mutateDemoState(state => { (state.structureOffers ??= []).push(offer); return offer; });
  memory.push(offer); return offer;
}
export async function createCoachSession(email: string, coachId: string, input: { title: string; duration: string; slots: string[]; capacity: number; location?: string }) {
  assertDemoFallbackAllowed("Séances coach (démonstration)");
  const coach = await getCoach(coachId);
  if (!coach || coach.id !== coachId || !coach.verified) throw new Error("Profil coach validé requis");
  return persistOffer({ id: `offer-${randomUUID()}`, ownerEmail: email, coachId, ...input, source: "coach", sport: coach.sport, createdAt: new Date().toISOString() });
}
export async function publicSessionOffer(offer: StructureOffer, projection?: { coach: Awaited<ReturnType<typeof getCoach>>; reservations: Reservation[] }) {
  const coach = projection ? projection.coach : await getCoach(offer.coachId);
  const reservations: Reservation[] = projection ? projection.reservations : await listReservations();
  const active = reservations.filter(r => r.coachId === offer.coachId && ["requested", "accepted", "paid"].includes(r.status));
  const availability = offer.slots.map(slot => {
    let remaining = offer.capacity ?? 1;
    for (const r of active) {
      if (!intervalsOverlap([slot], offer.duration, r.slots, r.duration)) continue;
      if (r.structureOfferId !== offer.id || r.slots.length !== 1 || r.slots[0] !== slot) { remaining = 0; break; }
      remaining -= reservedPlaces(r);
    }
    return { slot, remaining: Math.max(0, remaining) };
  });
  return { ...publicStructureOffer(offer), coachName: coach?.name, individualPrice: coach?.priceFrom, groupPrices: coach?.groupPrices ?? [], availability };
}
