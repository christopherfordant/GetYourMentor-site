import type { Reservation } from "@/lib/domain";

export type ReservationRow = Record<string, unknown>;

export function reservationFromRow(row: ReservationRow): Reservation {
  return {
    id: row.id,
    ownerEmail: row.owner_email,
    participantCount: row.participant_count ?? undefined,
    additionalParticipants: row.additional_participants ?? undefined,
    coachId: row.coach_id,
    coachName: row.coach_name,
    sport: row.sport,
    city: row.city,
    service: row.service,
    duration: row.duration,
    price: row.price,
    slots: row.slots,
    status: row.status,
    createdAt: row.created_at,
    reservationCode: row.reservation_code,
    acceptedAt: row.accepted_at,
    appointmentAt: row.appointment_at,
    refundPercent: row.refund_percent,
    refundAmount: row.refund_amount,
    stripePaymentIntentId: row.stripe_payment_intent_id,
    stripeCheckoutSessionId: row.stripe_checkout_session_id,
    structureOfferId: row.structure_offer_id,
    stripeRefundId: row.stripe_refund_id,
    refundStatus: row.refund_status,
    cancelledAt: row.cancelled_at,
    financials: row.financial_snapshot ?? undefined,
    refundedPlatformFeeCents: row.refunded_platform_fee_cents ?? undefined,
  } as Reservation;
}

export function reservationToRow(reservation: Reservation) {
  return {
    id: reservation.id,
    owner_email: reservation.ownerEmail ?? null,
    ...(reservation.participantCount !== undefined ? { participant_count: reservation.participantCount } : {}),
    ...(reservation.additionalParticipants !== undefined ? { additional_participants: reservation.additionalParticipants } : {}),
    coach_id: reservation.coachId,
    coach_name: reservation.coachName,
    sport: reservation.sport,
    city: reservation.city,
    service: reservation.service,
    duration: reservation.duration,
    price: reservation.price,
    slots: reservation.slots,
    status: reservation.status,
    created_at: reservation.createdAt,
    appointment_at: reservation.appointmentAt,
    reservation_code: reservation.reservationCode ?? null,
    accepted_at: reservation.acceptedAt ?? null,
    cancelled_at: reservation.cancelledAt ?? null,
    refund_percent: reservation.refundPercent ?? 0,
    refund_amount: reservation.refundAmount ?? 0,
    stripe_payment_intent_id: reservation.stripePaymentIntentId ?? null,
    stripe_checkout_session_id: reservation.stripeCheckoutSessionId ?? null,
    ...(reservation.structureOfferId ? { structure_offer_id: reservation.structureOfferId } : {}),
    stripe_refund_id: reservation.stripeRefundId ?? null,
    refund_status: reservation.refundStatus ?? "not_required",
    financial_snapshot: reservation.financials ?? null,
    refunded_platform_fee_cents: reservation.refundedPlatformFeeCents ?? null,
  };
}
