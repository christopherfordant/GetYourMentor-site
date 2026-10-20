import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { attemptIdValid, attemptScope, bookingRecoveryEnabled, BookingAttemptError } from "@/lib/booking-attempt-server";
import { readBookingAttempt } from "@/lib/repositories/reservation-repository";
import { reservationClaimToken } from "@/lib/reservation-claims";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  try {
    const session = await currentSession();
    if (!bookingRecoveryEnabled()) return NextResponse.json({ supported: false }, { headers });
    if (session && session.role !== "sportif") throw new BookingAttemptError(403);
    return NextResponse.json({ supported: true, context: await attemptScope(session?.email, true) }, { headers });
  } catch { return NextResponse.json({ error: "Préparation de la reprise indisponible" }, { status: 503, headers }); }
}
export async function POST(request: Request) {
  if (!rateLimit(request, "booking-recovery", 60, 60000).allowed) return NextResponse.json({ error: "Réessayez plus tard" }, { status: 429, headers });
  if (bodyExceedsLimit(request, 2048)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413, headers });
  try {
    const body = await request.json();
    if (!attemptIdValid(body?.creationAttemptId)) throw new BookingAttemptError(400);
    const session = await currentSession();
    if (session && session.role !== "sportif") throw new BookingAttemptError(403);
    const scope = await attemptScope(session?.email);
    if (body.creationContext !== scope) throw new BookingAttemptError(403);
    const receipt = await readBookingAttempt(body.creationAttemptId, scope);
    if (!receipt) return NextResponse.json({ state: "not-recorded" }, { headers });
    // Immutable creation receipt, not a statement of the reservation's current status.
    const claimToken = receipt.ownerEmail ? undefined : reservationClaimToken(receipt.id);
    return NextResponse.json({ data: { ...receipt, ...(claimToken ? { claimToken } : {}) } }, { headers });
  } catch (error) { return NextResponse.json({ error: error instanceof BookingAttemptError ? error.message : "Résultat non confirmé" }, { status: error instanceof BookingAttemptError ? error.status : 502, headers }); }
}
