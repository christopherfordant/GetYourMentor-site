import { previousAttempt, type AttemptInput, type BookingAttempt, BookingAttemptError } from "@/lib/booking-attempt-server";
import { randomUUID } from "node:crypto";
import { validateReservationSlots } from "@/lib/domain/booking-rules";
import { reservedPlaces } from "@/lib/domain/participants";
import { intervalsOverlap } from "@/lib/domain/booking-time";
import { memoryStructureOffers, type StructureOffer } from "@/lib/structure-offers";
import type { Reservation } from "@/lib/domain";
import { assertDemoFallbackAllowed, isHostedDemo, isIsolatedDemoFeatureEnabled } from "@/lib/runtime";
import { mutateDemoState, readDemoState, type DemoState } from "@/lib/repositories/demo-state";
import { claimReservationSlots, releaseReservationSlots, ReservationSlotConflictError } from "@/lib/repositories/reservation-slot-repository";
import { reservationFromRow, reservationToRow } from "@/lib/repositories/reservation-mapper";

export type ReservationPersistenceConfig = { url: string; key: string };
const localBookingState = globalThis as typeof globalThis & { gymReservationState?: { reservations: Reservation[]; attempts: BookingAttempt[] } };
const local = localBookingState.gymReservationState ??= { reservations: [], attempts: [] };
export const memoryReservations = local.reservations;
const memoryBookingAttempts = local.attempts;

export async function readBookingAttempt(id: string, scope: string, fingerprint?: string) {
  if (reservationPersistenceConfig()) throw new BookingAttemptError(503);
  const rows = isHostedDemo() ? (await readDemoState()).bookingAttempts ?? [] : memoryBookingAttempts;
  return previousAttempt(rows, id, scope, fingerprint);
}

export async function hasBookingBrowserProof(reservationId: string, scope: string) {
  if (reservationPersistenceConfig()) return false;
  const rows = isHostedDemo() ? (await readDemoState()).bookingAttempts ?? [] : memoryBookingAttempts;
  return rows.some(row => row.receipt.id === reservationId && row.scope === scope && row.expiresAt > Date.now());
}


export function reservationPersistenceConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key } satisfies ReservationPersistenceConfig;
  assertDemoFallbackAllowed("Supabase Reservations");
  return null;
}

function headers(config: ReservationPersistenceConfig, extra: Record<string, string> = {}) {
  return { apikey: config.key, Authorization: `Bearer ${config.key}`, ...extra };
}

function conflicts(reservations: Reservation[], candidate: Pick<Reservation, "id" | "coachId" | "slots" | "duration" | "structureOfferId" | "ownerEmail" | "participantCount">, offers: StructureOffer[]) {
  const active = reservations.filter(r => r.id !== candidate.id && r.coachId === candidate.coachId && ["requested", "accepted", "paid"].includes(r.status));
  const offer = offers.find(o => o.id === candidate.structureOfferId);
  let seats = reservedPlaces(candidate);
  for (const r of active) {
    if (!intervalsOverlap(r.slots, r.duration, candidate.slots, candidate.duration)) continue;
    if (!offer || r.structureOfferId !== offer.id || r.slots.length !== 1 || candidate.slots.length !== 1 || r.slots[0] !== candidate.slots[0]) return true;
    if (candidate.ownerEmail && r.ownerEmail === candidate.ownerEmail) return true;
    seats += reservedPlaces(r);
  }
  return seats > (offer?.capacity ?? 1);
}

export async function hasReservationSlotConflict(coachId: string, slots: string[], excludeId?: string, duration = "1 heure", structureOfferId?: string) {
  const config = reservationPersistenceConfig();
  const candidate = { id: excludeId ?? "", coachId, slots, duration, structureOfferId };
  if (!config) {
    const state = isHostedDemo() ? await readDemoState() : null;
    return conflicts(state?.reservations ?? memoryReservations, candidate, state?.structureOffers ?? memoryStructureOffers);
  }
  const reservations = await listPersistedReservations({ coachId });
  return conflicts(reservations, candidate, []);
}

export async function createPersistedReservation(reservation: Reservation, attempt?: AttemptInput, demoMutate?: <T>(change: (state: DemoState) => T) => Promise<T>) {
  const config = reservationPersistenceConfig();
  if (!config) {
    const add = (reservations: Reservation[], offers: StructureOffer[], attempts: BookingAttempt[]) => {
      if (attempt) {
        const previous = previousAttempt(attempts, attempt.id, attempt.scope, attempt.fingerprint);
        if (previous) return previous;
      }
      if (conflicts(reservations, reservation, offers)) throw new ReservationSlotConflictError();
      reservations.push(reservation);
      if (attempt) attempts.push({ ...attempt, expiresAt: Date.now() + 86400000, receipt: structuredClone(reservation) });
      return reservation;
    };
    if (isHostedDemo() || demoMutate) return (demoMutate ?? mutateDemoState)((s) => add(s.reservations, s.structureOffers ?? [], s.bookingAttempts ??= []));
    return add(memoryReservations, memoryStructureOffers, memoryBookingAttempts);
  }
  if (attempt) throw new BookingAttemptError(503);
  if (reservedPlaces(reservation) > 1) throw new Error("Réservations groupées limitées au stockage de démonstration");
  const response = await fetch(`${config.url}/rest/v1/gym_reservations`, {
    method: "POST",
    headers: headers(config, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(reservationToRow(reservation)),
  });
  if (!response.ok) throw new Error(`Supabase reservation error (${response.status})`);
  const [saved] = await response.json();
  const savedReservation = { ...reservation, id: saved.id ?? reservation.id, createdAt: saved.created_at ?? reservation.createdAt };
  try {
    await claimReservationSlots(config, savedReservation.id, savedReservation.coachId, savedReservation.slots);
  } catch (error) {
    await deletePersistedReservation(savedReservation.id).catch(() => undefined);
    throw error;
  }
  return savedReservation;
}

export async function listPersistedReservations(options: { coachId?: string; ownerEmail?: string } = {}) {
  const config = reservationPersistenceConfig();
  if (!config) {
    const reservations = isHostedDemo() ? (await readDemoState()).reservations : memoryReservations;
    return reservations.filter((reservation) =>
      (!options.coachId || reservation.coachId === options.coachId) &&
      (!options.ownerEmail || reservation.ownerEmail === options.ownerEmail),
    );
  }
  const coachFilter = options.coachId ? `&coach_id=eq.${encodeURIComponent(options.coachId)}` : "";
  const ownerFilter = options.ownerEmail ? `&owner_email=eq.${encodeURIComponent(options.ownerEmail)}` : "";
  const response = await fetch(`${config.url}/rest/v1/gym_reservations?select=*&order=created_at.desc${coachFilter}${ownerFilter}`, {
    headers: headers(config),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase reservation error (${response.status})`);
  return (await response.json()).map((row: Record<string, unknown>) => reservationFromRow(row));
}

export async function getPersistedReservation(id: string) {
  const config = reservationPersistenceConfig();
  if (!config) return (isHostedDemo() ? (await readDemoState()).reservations : memoryReservations).find((reservation) => reservation.id === id) ?? null;
  const response = await fetch(`${config.url}/rest/v1/gym_reservations?id=eq.${encodeURIComponent(id)}&select=*`, {
    headers: headers(config),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase reservation error (${response.status})`);
  const [row] = await response.json();
  return row ? reservationFromRow(row) : null;
}

export async function updatePersistedReservation(
  id: string,
  patch: Record<string, unknown>,
  expectedStatus?: Reservation["status"],
  expectedSchedule?: {slots:string[];appointmentAt:string|null},
) {
  const config = reservationPersistenceConfig();
  if (!config) {
    const update = (reservations: Reservation[], offers: StructureOffer[]) => {
      const index = reservations.findIndex((reservation) => reservation.id === id);
      if (index < 0 || (expectedStatus && reservations[index].status !== expectedStatus)) return null;
      if (expectedSchedule && (JSON.stringify(reservations[index].slots)!==JSON.stringify(expectedSchedule.slots) || (reservations[index].appointmentAt??null)!==expectedSchedule.appointmentAt)) return null;
      const next = reservationFromRow({ ...reservationToRow(reservations[index]), ...patch });
      // Demo evidence is outside the SQL mapper and immutable through ordinary updates.
      if (reservations[index].demoPaymentConfirmation) next.demoPaymentConfirmation = reservations[index].demoPaymentConfirmation;
      if (["requested", "accepted", "paid"].includes(next.status) && conflicts(reservations, next, offers)) throw new ReservationSlotConflictError();
      reservations[index] = next;
      return next;
    };
    if (isHostedDemo()) return mutateDemoState((s) => update(s.reservations, s.structureOffers ?? []));
    return update(memoryReservations, memoryStructureOffers);
  }
  const statusFilter = expectedStatus ? `&status=eq.${encodeURIComponent(expectedStatus)}` : "";
  const scheduleFilter=expectedSchedule ? `&slots=eq.${encodeURIComponent(JSON.stringify(expectedSchedule.slots))}&appointment_at=${expectedSchedule.appointmentAt===null?"is.null":`eq.${encodeURIComponent(expectedSchedule.appointmentAt)}`}` : "";
  const response = await fetch(`${config.url}/rest/v1/gym_reservations?id=eq.${encodeURIComponent(id)}${statusFilter}${scheduleFilter}`, {
    method: "PATCH",
    headers: headers(config, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Supabase reservation error (${response.status})`);
  const [row] = await response.json();
  return row ? reservationFromRow(row) : null;
}

export async function deletePersistedReservation(id: string) {
  const config = reservationPersistenceConfig();
  if (!config) {
    if (isHostedDemo()) return mutateDemoState((s) => { s.reservations = s.reservations.filter((r) => r.id !== id); });
    const index = memoryReservations.findIndex((reservation) => reservation.id === id);
    if (index >= 0) memoryReservations.splice(index, 1);
    return;
  }
  const response = await fetch(`${config.url}/rest/v1/gym_reservations?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(config),
  });
  if (!response.ok) throw new Error(`Supabase reservation error (${response.status})`);
}

export { releaseReservationSlots, ReservationSlotConflictError };

// Status, owner and evidence share the existing demo document CAS. No SQL columns.
export async function confirmDemoReservationPayment(id:string,ownerEmail?:string) {
  if(!isIsolatedDemoFeatureEnabled() || process.env.PAYMENT_PROVIDER === "stripe")throw new Error("Confirmation simulée indisponible pour cet environnement");
  const confirm=(reservations:Reservation[],offers:StructureOffer[])=>{
    const index=reservations.findIndex(row=>row.id===id);if(index<0)return null;
    const current=reservations[index];
    if(current.ownerEmail && current.ownerEmail!==ownerEmail)throw new Error("Cette réservation appartient à un autre compte");
    if(current.status==="paid")return {reservation:current,confirmedNow:false}; // Never backfill legacy rows.
    if(current.status!=="accepted")throw new Error("Le paiement est disponible après acceptation du coach");
    if(!validateReservationSlots(current.slots).valid)throw new Error("Ce créneau est passé ou invalide");
    if(current.demoPaymentConfirmation)throw new Error("Confirmation préexistante incompatible avec l’état de la réservation");
    const next:Reservation={...current,status:"paid",ownerEmail:current.ownerEmail ?? ownerEmail,
      demoPaymentConfirmation:{mode:"simulated",confirmedAt:new Date().toISOString(),reference:`demo-pay-${randomUUID()}`}};
    if(conflicts(reservations,next,offers))throw new ReservationSlotConflictError();
    reservations[index]=next;return {reservation:next,confirmedNow:true};
  };
  return isHostedDemo()?mutateDemoState(state=>confirm(state.reservations,state.structureOffers ?? [])):confirm(memoryReservations,memoryStructureOffers);
}
