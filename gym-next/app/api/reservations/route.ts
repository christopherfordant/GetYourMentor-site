import { attemptFingerprint, attemptIdValid, attemptScope, BookingAttemptError, type AttemptInput } from "@/lib/booking-attempt-server";
import { readBookingAttempt } from "@/lib/repositories/reservation-repository";
import { reservationForRole } from "@/lib/domain/reservation-privacy";
import { normalizeSlots } from "@/lib/domain/booking-time";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { currentSession } from "@/lib/auth";
import type { Reservation } from "@/lib/domain";
import { getCoach } from "@/lib/coaches";
import { createReservation, hasSlotConflict, listReservations, ReservationSlotConflictError } from "@/lib/reservations";
import { parseReservationInput } from "@/lib/domain/validation/reservation-input";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";
import { reservationClaimToken } from "@/lib/reservation-claims";
import { getStructureOffer } from "@/lib/structure-offers";
import { isDemoFallbackAllowed } from "@/lib/runtime";

export async function POST(request: Request) {
  const limit = rateLimit(request, "reservation-create", 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de demandes, réessayez plus tard" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (bodyExceedsLimit(request, 32 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const session = await currentSession();
  if (session && session.role !== "sportif") return NextResponse.json({ error: "Seul un sportif peut demander une réservation" }, { status: 403 });
  const body = await request.json().catch(() => null);
  let attempt: AttemptInput | undefined;
  if (body?.creationAttemptId !== undefined) {
    if (!attemptIdValid(body.creationAttemptId) || body.structureOfferId || (body.participantCount !== undefined && body.participantCount !== 1)) return NextResponse.json({ error: "Tentative individuelle invalide" }, { status: 400 });
    try {
      const scope = await attemptScope(session?.email);
      if (body.creationContext !== scope) throw new BookingAttemptError(403);
      attempt = { id: body.creationAttemptId, scope, fingerprint: attemptFingerprint(body) };
      const previous = await readBookingAttempt(attempt.id, scope, attempt.fingerprint);
      if (previous) {
        const claimToken = previous.ownerEmail ? undefined : reservationClaimToken(previous.id);
        return NextResponse.json({ data: { ...previous, ...(claimToken ? { claimToken } : {}) } }, { headers: { "Cache-Control": "no-store" } });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof BookingAttemptError ? error.message : "Résultat non confirmé" }, { status: error instanceof BookingAttemptError ? error.status : 502, headers: { "Cache-Control": "no-store" } });
    }
  }
  let structureOfferId: string | undefined;
  if (body?.structureOfferId !== undefined) {
    if (!isDemoFallbackAllowed() || typeof body.structureOfferId !== "string" || body.structureOfferId.length > 128) return NextResponse.json({ error: "Séance collective indisponible" }, { status: 400 });
    if ((await currentSession())?.role !== "sportif") return NextResponse.json({ error: "Connexion élève requise pour réserver cette séance" }, { status: 401 });
    let offer;
    try { offer = await getStructureOffer(body.structureOfferId); }
    catch { return NextResponse.json({ error: "Séance temporairement indisponible" }, { status: 503 }); }
    if (!offer) return NextResponse.json({ error: "Séance introuvable" }, { status: 404 });
    if (body.coachId && body.coachId !== offer.coachId) return NextResponse.json({ error: "Coach incohérent avec la séance" }, { status: 403 });
    if (Array.isArray(body.slots) && body.slots.every((s: unknown) => typeof s === "string")) body.slots = normalizeSlots(body.slots) ?? [];
    if (!Array.isArray(body.slots) || body.slots.length !== 1 || body.slots.some((slot: unknown) => typeof slot !== "string" || !offer.slots.includes(slot) || Date.parse(slot) <= Date.now())) return NextResponse.json({ error: "Choisissez un créneau futur proposé pour cette séance" }, { status: 400 });
    structureOfferId = offer.id;
    body.coachId = offer.coachId; body.service = offer.title; body.duration = offer.duration;
    body.appointmentAt = body.slots[0];
  }
  const input = parseReservationInput(body);
  if (!input.ok) return NextResponse.json({ error: input.error }, { status: 400 });
  if (input.data.participantCount > 1 && (!isDemoFallbackAllowed() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY || !structureOfferId || session?.role !== "sportif")) return NextResponse.json({ error: "Choisissez une séance collective publiée et connectez-vous comme sportif" }, { status: 409 });
  const coach = await getCoach(input.data.coachId);
  const { coachId, service, duration, slots, appointmentAt } = input.data;

  if (!coach || !coach.verified) return NextResponse.json({ error: "Coach indisponible" }, { status: 404 });

  if (structureOfferId && input.data.participantCount === 1 && coach.priceFrom <= 0) return NextResponse.json({ error: "Le coach doit définir un tarif pour un participant" }, { status: 409 });

  const groupPrice = input.data.participantCount > 1 ? coach.groupPrices?.find(p => p.participantCount === input.data.participantCount) : undefined;
  if (input.data.participantCount > 1 && !groupPrice) return NextResponse.json({ error: "Le coach n’a pas encore défini de tarif total pour cette taille de groupe" }, { status: 409 });
  try {
    if (!attempt && await hasSlotConflict(coach.id, slots, undefined, duration, structureOfferId)) {
      return NextResponse.json({ error: "Un des créneaux est déjà demandé ou réservé" }, { status: 409 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vérification du créneau impossible" }, { status: 502 });
  }

  const reservation: Reservation = {
    id: `res-${randomUUID()}`,
    ownerEmail: session?.email,
    coachId: coach.id || coachId,
    coachName: coach.name,
    sport: coach.sport,
    city: coach.city,
    service,
    duration,
    // Le tarif est une donnée métier serveur : ne jamais faire confiance au montant envoyé par le navigateur.
    price: groupPrice ? groupPrice.totalCents / 100 : coach.priceFrom,
    ...(input.data.participantCount > 1 ? { participantCount: input.data.participantCount, additionalParticipants: input.data.additionalParticipants } : {}),
    slots,
    status: "requested",
    createdAt: new Date().toISOString(),
    appointmentAt: appointmentAt ?? slots[0],
    ...(structureOfferId ? { structureOfferId } : {}),
  };

  try {
    const saved = await createReservation(reservation, attempt);
    const claimToken = saved.ownerEmail ? undefined : reservationClaimToken(saved.id);
    return NextResponse.json({ data: { ...saved, ...(claimToken ? { claimToken } : {}) } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof BookingAttemptError ? error.status : error instanceof ReservationSlotConflictError ? 409 : 502;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur de persistance" }, { status });
  }
}

export async function GET(request: Request) {
  try {
    const session = await currentSession();
    const requestedCoach = new URL(request.url).searchParams.get("coachId") ?? undefined;
    const requestedProfile = requestedCoach ? await getCoach(requestedCoach) : null;
    if (requestedCoach && !requestedProfile) return NextResponse.json({ error: "Coach introuvable" }, { status: 404 });
    if (requestedProfile && !requestedProfile.verified && (!session || (session.role !== "admin" && !(session.role === "coach" && session.coachId === requestedProfile.id)))) {
      return NextResponse.json({ error: "Coach indisponible" }, { status: 404 });
    }

    // Le planning public ne doit exposer que les créneaux déjà pris, jamais les données de réservation.
    if (!session && requestedProfile) {
      const reservations = await listReservations({ coachId: requestedProfile.id });
      return NextResponse.json({
        data: reservations.map((reservation: Reservation) => ({ status: reservation.status, slots: reservation.slots, duration: reservation.duration })),
      });
    }
    if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });

    if (session.role === "coach") {
      if (!session.coachId) return NextResponse.json({ data: [] });
      if (requestedProfile && requestedProfile.id !== session.coachId) {
        return NextResponse.json({ error: "Accès aux réservations refusé" }, { status: 403 });
      }
      return NextResponse.json({ data: (await listReservations({ coachId: session.coachId })).map((r: Reservation) => reservationForRole(r, session.role)) });
    }
    if (session.role === "sportif") {
      if (requestedProfile) {
        const reservations = await listReservations({ coachId: requestedProfile.id });
        return NextResponse.json({
          data: reservations.map((reservation: Reservation) => ({ status: reservation.status, slots: reservation.slots, duration: reservation.duration })),
        });
      }
      return NextResponse.json({ data: await listReservations({ ownerEmail: session.email }) });
    }
    if (session.role !== "admin") return NextResponse.json({ error: "Accès aux réservations refusé" }, { status: 403 });
    return NextResponse.json({ data: await listReservations() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erreur de lecture" }, { status: 502 });
  }
}
