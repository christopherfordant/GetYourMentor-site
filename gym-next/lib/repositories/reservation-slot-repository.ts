export type SupabaseServiceConfig = { url: string; key: string };

export class ReservationSlotConflictError extends Error {
  constructor() {
    super("Un des créneaux est déjà demandé ou réservé");
    this.name = "ReservationSlotConflictError";
  }
}

export async function claimReservationSlots(
  config: SupabaseServiceConfig,
  reservationId: string,
  coachId: string,
  slots: string[],
) {
  if (!slots.length) return;
  const response = await fetch(`${config.url}/rest/v1/gym_reservation_slot_claims`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(slots.map((slot) => ({ reservation_id: reservationId, coach_id: coachId, slot }))),
  });
  if (response.status === 409) throw new ReservationSlotConflictError();
  if (!response.ok) throw new Error(`Supabase reservation slot error (${response.status})`);
}

export async function releaseReservationSlots(
  config: SupabaseServiceConfig,
  reservationId: string,
  slots?: string[],
) {
  const slotFilter = slots?.length ? `&slot=in.(${slots.map((slot) => encodeURIComponent(slot)).join(",")})` : "";
  const response = await fetch(
    `${config.url}/rest/v1/gym_reservation_slot_claims?reservation_id=eq.${encodeURIComponent(reservationId)}${slotFilter}`,
    { method: "DELETE", headers: { apikey: config.key, Authorization: `Bearer ${config.key}` } },
  );
  if (!response.ok) throw new Error(`Supabase reservation slot error (${response.status})`);
}
