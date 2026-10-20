import type { AttemptInput } from "@/lib/booking-attempt-server";
import { isIsolatedDemoFeatureEnabled } from "@/lib/runtime";
import type { Reservation } from "@/lib/domain";
import { refundPercentForAppointment, validateReservationSlots } from "@/lib/domain/booking-rules";
import {
  claimReservationSlots as claimReservationSlotsRepository,
  releaseReservationSlots as releaseReservationSlotsRepository,
  ReservationSlotConflictError as RepositoryReservationSlotConflictError,
} from "@/lib/repositories/reservation-slot-repository";
import {
  confirmDemoReservationPayment,
  createPersistedReservation,
  getPersistedReservation,
  hasReservationSlotConflict,
  listPersistedReservations,
  reservationPersistenceConfig,
  updatePersistedReservation,
} from "@/lib/repositories/reservation-repository";
import { sendReservationConfirmation } from "@/lib/notifications";
import { refundStripePayment } from "@/lib/payments";
import { financialSnapshot, eurosToCents, refundedCommissionCents } from "@/lib/domain/commission";
import { getCommissionSettings } from "@/lib/repositories/commission-repository";

function supabaseConfig() {
  return reservationPersistenceConfig();
}

export const ReservationSlotConflictError = RepositoryReservationSlotConflictError;

async function claimReservationSlots(config: { url: string; key: string }, reservationId: string, coachId: string, slots: string[]) {
  try {
    await claimReservationSlotsRepository(config, reservationId, coachId, slots);
  } catch (error) {
    if (error instanceof RepositoryReservationSlotConflictError) throw new ReservationSlotConflictError();
    throw error;
  }
}

async function releaseReservationSlots(config: { url: string; key: string }, reservationId: string, slots?: string[]) {
  await releaseReservationSlotsRepository(config, reservationId, slots);
}

export async function hasSlotConflict(coachId: string, slots: string[], excludeId?: string, duration = "1 heure", structureOfferId?: string) {
  return hasReservationSlotConflict(coachId, slots, excludeId, duration, structureOfferId);
}

export async function createReservation(reservation: Reservation, attempt?: AttemptInput) {
  const settings = await getCommissionSettings();
  return createPersistedReservation({ ...reservation, financials: financialSnapshot(reservation.price, settings.bps, settings.version) }, attempt);
}

export async function listReservations(options: { coachId?: string; ownerEmail?: string } = {}): Promise<Reservation[]> {
  return listPersistedReservations(options);
}

export async function getReservation(id: string) {
  return getPersistedReservation(id);
}

export async function transitionReservation(id: string, status: "accepted" | "rejected" | "cancelled", selectedSlot?: string) {
  const current = await getReservation(id);
  if (!current) return null;
  if (status === "accepted" && !validateReservationSlots(current.slots).valid) throw new Error("Créneau passé ou invalide : demandez une nouvelle réservation");
  if (current.status !== "requested") throw new Error(`Transition impossible depuis ${current.status}`);

  const chosen = selectedSlot ? validateReservationSlots([selectedSlot]).slots[0] : current.slots[0];
  if (status === "accepted" && !current.slots.includes(chosen)) throw new Error("Choisissez un créneau de cette demande");
  const acceptedAt = status === "accepted" ? new Date().toISOString() : undefined;
  const reservationCode = status === "accepted" ? `GYM-${id.slice(-6).toUpperCase()}` : undefined;
  const config = supabaseConfig();
  const saved = await updatePersistedReservation(id, {
    status,
    ...(status === "accepted" ? { slots: [chosen], appointment_at: chosen } : {}),
    accepted_at: acceptedAt ?? null,
    reservation_code: reservationCode ?? null,
  }, "requested");
  if (!saved) return null;
  if (config && status !== "accepted") await releaseReservationSlots(config, id);
  if (config && status === "accepted") {
    const unused = current.slots.filter(slot => slot !== chosen);
    if (unused.length) await releaseReservationSlots(config, id, unused);
  }
  return saved;
}

export async function payReservation(id: string, ownerEmail?: string, stripePaymentIntentId?: string) {
  const current = await getReservation(id);
  if (!current) return null;
  if (current.ownerEmail && current.ownerEmail !== ownerEmail) throw new Error("Cette réservation appartient à un autre compte");
  if (current.status === "paid") return current;
  if (!validateReservationSlots(current.slots).valid) throw new Error("Ce créneau est passé ou invalide");
  if (current.status !== "accepted") throw new Error("Le paiement est disponible après acceptation du coach");
  const simulated = !stripePaymentIntentId && process.env.PAYMENT_PROVIDER !== "stripe" && isIsolatedDemoFeatureEnabled();
  let saved:Reservation|null;let confirmedNow=true;
  if(simulated){
    const outcome=await confirmDemoReservationPayment(id,ownerEmail);
    saved=outcome?.reservation ?? null;confirmedNow=outcome?.confirmedNow ?? false;
  }else{
    // Existing Stripe path: no simulated evidence or unprovisioned SQL column.
    saved=await updatePersistedReservation(id,{
      status:"paid",owner_email:current.ownerEmail ?? ownerEmail ?? null,
      stripe_payment_intent_id:current.stripePaymentIntentId ?? stripePaymentIntentId ?? null,
    },"accepted");
  }
  if(!saved){
    const latest=await getReservation(id);
    if(latest?.ownerEmail && latest.ownerEmail!==ownerEmail)throw new Error("Cette réservation appartient à un autre compte");
    if(latest?.status==="paid")return latest;
    throw new Error("La réservation n’est plus payable dans son état actuel");
  }
  if(!confirmedNow)return saved;
  const confirmation=await sendReservationConfirmation(saved).catch(()=>({status:"skipped" as const}));
  return {...saved,confirmationStatus:confirmation.status};
}

export function refundPercentFor(appointmentAt: string, now = new Date()) {
  return refundPercentForAppointment(appointmentAt, now);
}

export async function cancelReservation(id: string, ownerEmail?: string) {
  const current = await getReservation(id);
  if (!current) return null;
  if (current.ownerEmail && ownerEmail && current.ownerEmail !== ownerEmail) throw new Error("Cette réservation appartient à un autre compte");
  if (current.status === "cancelled") return current;
  if (!["requested", "accepted", "paid"].includes(current.status)) {
    throw new Error(`Annulation impossible depuis ${current.status}`);
  }

  const refundPercent = current.status === "paid" && current.appointmentAt ? refundPercentFor(current.appointmentAt) : 0;
  const next: Reservation = {
    ...current,
    ownerEmail: current.ownerEmail ?? ownerEmail,
    status: "cancelled" as const,
    cancelledAt: new Date().toISOString(),
    refundPercent,
    refundAmount: Math.round(eurosToCents(current.price) * refundPercent / 100) / 100,
    refundedPlatformFeeCents: current.financials ? refundedCommissionCents(current.financials, Math.round(eurosToCents(current.price) * refundPercent / 100)) : undefined,
    refundStatus: refundPercent > 0 ? ("pending" as const) : ("not_required" as const),
  };
  let stripeRefundId: string | undefined;
  if (current.status === "paid" && refundPercent > 0) {
    if (!current.stripePaymentIntentId && process.env.PAYMENT_PROVIDER === "stripe") {
      throw new Error("Remboursement impossible : identifiant de paiement Stripe absent");
    }
    const refund = current.stripePaymentIntentId
      ? await refundStripePayment({
          paymentIntentId: current.stripePaymentIntentId,
          amountCents: Math.round((next.refundAmount ?? 0) * 100),
          reservationId: id,
        })
      : null;
    if (refund) {
      stripeRefundId = refund.id;
      next.refundStatus = refund.status;
    } else {
      next.refundStatus = "succeeded";
    }
  }
  const config = supabaseConfig();
  const saved = await updatePersistedReservation(id, {
    status: "cancelled",
    owner_email: next.ownerEmail ?? null,
    cancelled_at: next.cancelledAt,
    refund_percent: refundPercent,
    refund_amount: next.refundAmount,
    stripe_refund_id: stripeRefundId ?? null,
    refund_status: next.refundStatus,
    refunded_platform_fee_cents: next.refundedPlatformFeeCents ?? null,
  }, current.status);
  if (!saved) return null;
  if (config) await releaseReservationSlots(config, id);
  return { ...saved, stripeRefundId };
}

export async function rescheduleReservation(id: string, ownerEmail: string, slots: string[], expected?: {slots:string[];appointmentAt:string|null}) {
  const current = await getReservation(id);
  if (!current) return null;
  if (current.ownerEmail && current.ownerEmail !== ownerEmail) throw new Error("Cette réservation appartient à un autre compte");
  if (!current.ownerEmail) throw new Error("La réservation n'est pas rattachée à un compte sportif");
  if (!["accepted", "paid"].includes(current.status)) throw new Error("Cette réservation ne peut pas être déplacée dans son état actuel");
  if (current.structureOfferId) throw new Error("Annulez puis demandez un autre créneau publié pour cette séance collective");
  const validatedSlots = validateReservationSlots(slots);
  if (!validatedSlots.valid) throw new Error("Un à trois créneaux sont requis");
  if (JSON.stringify(current.slots)===JSON.stringify(validatedSlots.slots) && current.appointmentAt===validatedSlots.slots[0]) return current;
  if (expected && (JSON.stringify(current.slots)!==JSON.stringify(expected.slots)||(current.appointmentAt??null)!==expected.appointmentAt)) throw new Error("Réservation modifiée : vérifiez son état avant de poursuivre");
  if (await hasSlotConflict(current.coachId, validatedSlots.slots, id, current.duration)) throw new Error("Un des nouveaux créneaux est déjà demandé ou réservé");

  const next = { ...current, slots: validatedSlots.slots, appointmentAt: validatedSlots.slots[0] };
  const config = supabaseConfig();
  const addedSlots = validatedSlots.slots.filter((slot) => !current.slots.includes(slot));
  if (config) await claimReservationSlots(config, id, current.coachId, addedSlots);
  const saved = await updatePersistedReservation(id, { slots: validatedSlots.slots, appointment_at: next.appointmentAt }, current.status, {slots:current.slots,appointmentAt:current.appointmentAt??null});
  if (!saved) {
    const latest=await getReservation(id);
    if (latest && latest.status===current.status && JSON.stringify(latest.slots)===JSON.stringify(validatedSlots.slots) && latest.appointmentAt===next.appointmentAt) return latest;
    if (config && latest) await releaseReservationSlots(config, id, addedSlots.filter(slot=>!latest.slots.includes(slot))).catch(() => undefined);
    throw new Error("Réservation modifiée : vérifiez son état avant de poursuivre");
  }
  const releasedSlots = current.slots.filter((slot) => !validatedSlots.slots.includes(slot));
  if (config && releasedSlots.length) await releaseReservationSlots(config, id, releasedSlots);
  return saved;
}
