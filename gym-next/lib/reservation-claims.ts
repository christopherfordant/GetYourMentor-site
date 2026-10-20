import { createHmac, timingSafeEqual } from "node:crypto";
import { isDemoFallbackAllowed } from "@/lib/runtime";

function claimSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  return isDemoFallbackAllowed() ? "getyourmentor-demo-reservation-claim-secret" : null;
}

export function reservationClaimToken(reservationId: string) {
  const secret = claimSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(`reservation:${reservationId}`).digest("base64url");
}

export function isReservationClaimTokenValid(reservationId: string, token: string | null | undefined) {
  const expected = reservationClaimToken(reservationId);
  if (!expected || !token) return false;
  const received = Buffer.from(token, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}
