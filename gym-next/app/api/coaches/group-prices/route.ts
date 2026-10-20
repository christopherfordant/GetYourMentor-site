import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getCoach, updateCoach } from "@/lib/coaches";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";

export async function PATCH(request: Request) {
  const session = await requireRole("coach");
  if (!session?.coachId) return NextResponse.json({ error: "Connexion coach requise" }, { status: 401 });
  if (!isDemoFallbackAllowed() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Réglage disponible en démonstration uniquement" }, { status: 503 });
  if (bodyExceedsLimit(request, 8192)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  if (!rateLimit(request, "group-prices", 30, 60000).allowed) return NextResponse.json({ error: "Trop de modifications" }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (!Array.isArray(body?.prices) || body.prices.length > 49 || body.prices.some((p: { participantCount?: number; totalCents?: number } | null) => !p || !Number.isInteger(p.participantCount) || p.participantCount! < 2 || p.participantCount! > 50 || !Number.isInteger(p.totalCents) || p.totalCents! < 1 || p.totalCents! > 1000000) || new Set(body.prices.map((p: { participantCount: number }) => p.participantCount)).size !== body.prices.length) return NextResponse.json({ error: "Indiquez des tailles distinctes (2–50) et des prix totaux valides" }, { status: 400 });
  try {
    if (!await getCoach(session.coachId)) return NextResponse.json({ error: "Coach introuvable" }, { status: 404 });
    const prices = body.prices.map((p: { participantCount: number; totalCents: number }) => ({ participantCount: p.participantCount, totalCents: p.totalCents }));
    const coach = await updateCoach(session.coachId, { groupPrices: prices });
    return NextResponse.json({ data: coach?.groupPrices ?? [] });
  } catch { return NextResponse.json({ error: "Enregistrement des tarifs indisponible" }, { status: 503 }); }
}
