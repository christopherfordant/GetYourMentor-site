import { cookies } from "next/headers";
import type { Reservation } from "./domain";
import { summaryProofWindow } from "./booking-summary-server";
import { isReservationClaimTokenValid } from "./reservation-claims";
// Reuse the existing claim cookie. It never overrides an assigned owner.
export function privateReservationTokenValid(r: Reservation, token?: string) {
  return !r.ownerEmail && (process.env.SESSION_SECRET?.length ?? 0)>=32 && summaryProofWindow(r) && isReservationClaimTokenValid(r.id,token);
}
export async function hasPrivateReservationProof(r: Reservation) {
  if(r.ownerEmail) return false;
  return privateReservationTokenValid(r,(await cookies()).get(`gym-claim-${r.id}`)?.value);
}
