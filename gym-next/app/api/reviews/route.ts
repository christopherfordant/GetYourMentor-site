import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getReservation, listReservations } from "@/lib/reservations";
import { createReview, listReviews } from "@/lib/reviews";
import { bodyExceedsLimit, textExceedsLimit, rateLimit } from "@/lib/request-guards";
import { canReviewReservation } from "@/lib/domain/review-rules";
import { getCoach } from "@/lib/coaches";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { randomUUID } from "node:crypto";

export async function GET(request: Request) {
  const coachId = new URL(request.url).searchParams.get("coachId");
  try {
    if (coachId !== null) {
      if (!isDemoFallbackAllowed() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Avis publics disponibles en démonstration isolée uniquement" }, { status: 503 });
      if (!/^[a-z0-9-]{1,120}$/.test(coachId)) return NextResponse.json({ error: "Coach invalide" }, { status: 400 });
      if (!(await getCoach(coachId))?.verified) return NextResponse.json({ data: [] }, { headers: { "Cache-Control": "no-store" } });
      const ids = new Set((await listReservations({ coachId })).map(reservation => reservation.id));
      const data = (await listReviews()).filter(review => review.coachId ? review.coachId === coachId : ids.has(review.reservationId)).map(({ id, rating, comment, createdAt }) => ({ id, rating, comment, createdAt }));
      return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
    }
    const session = await requireRole("sportif");
    if (!session) return NextResponse.json({ error: "Connexion sportif requise" }, { status: 401 });
    return NextResponse.json({ data: await listReviews(session.email) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Avis indisponibles" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const session = await requireRole("sportif");
  if (!session) return NextResponse.json({ error: "Connexion sportif requise" }, { status: 401 });
  if (bodyExceedsLimit(request, 16 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  if (!rateLimit(request, "reviews", 20, 60000).allowed) return NextResponse.json({ error: "Trop de demandes d’avis. Réessayez dans un instant." }, { status: 429 });

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (textExceedsLimit(body?.reservationId, 128) || textExceedsLimit(body?.comment, 2000) || typeof body?.reservationId !== "string" || !body.reservationId || !Number.isInteger(rating) || rating < 1 || rating > 5 || typeof body.comment !== "string" || !body.comment.trim()) {
    return NextResponse.json({ error: "reservationId, note de 1 à 5 et commentaire requis" }, { status: 400 });
  }

  const reservation = await getReservation(body.reservationId);
  if (!reservation) return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  if (reservation.ownerEmail !== session.email) return NextResponse.json({ error: "Cette réservation appartient à un autre compte" }, { status: 403 });
  if (!canReviewReservation(reservation)) return NextResponse.json({ error: "Avis disponible après la fin d’une séance payée" }, { status: 409 });

  try {
    const review = await createReview({
      id: `review-${randomUUID()}`,
      reservationId: reservation.id,
      authorEmail: session.email,
      rating,
      comment: body.comment.trim(),
      createdAt: new Date().toISOString(),
      coachId: reservation.coachId,
    });
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Avis impossible" }, { status: 409 });
  }
}
