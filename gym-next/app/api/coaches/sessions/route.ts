import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getCoach } from "@/lib/coaches";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";
import { parsePublishedSession } from "@/lib/domain/published-session";
import { createCoachSession, listStructureOffers, publicSessionOffer, publicStructureOffer } from "@/lib/structure-offers";
const isolatedDemo = () => isDemoFallbackAllowed() && !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY;
export async function GET(request: Request) {
  if (!isolatedDemo()) return NextResponse.json({ error: "Séances coach disponibles en démonstration isolée uniquement" }, { status: 503 });
  const params = new URL(request.url).searchParams;
  const mine = params.get("mine") === "1", session = mine ? await requireRole("coach") : null;
  if (mine && !session?.coachId) return NextResponse.json({ error: "Connexion coach requise" }, { status: 401 });
  const coachId = mine ? session!.coachId : params.get("coachId");
  if (!coachId || !/^[a-z0-9-]{1,120}$/.test(coachId)) return NextResponse.json({ error: "Coach invalide" }, { status: 400 });
  try {
    const coach = await getCoach(coachId);
    const offers = (await listStructureOffers(mine ? session!.email : undefined)).filter(o => o.source === "coach" && o.coachId === coachId);
    return NextResponse.json({ data: mine || coach?.verified ? await Promise.all(offers.map(offer => publicSessionOffer(offer))) : [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Séances indisponibles" }, { status: 503 }); }
}
export async function POST(request: Request) {
  const session = await requireRole("coach");
  if (!session?.coachId) return NextResponse.json({ error: "Connexion coach requise" }, { status: 401 });
  if (!isolatedDemo()) return NextResponse.json({ error: "Publication disponible en démonstration isolée uniquement" }, { status: 503 });
  if (bodyExceedsLimit(request, 4096)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  if (!rateLimit(request, "coach-session", 20, 60000).allowed) return NextResponse.json({ error: "Trop de publications" }, { status: 429 });
  const body = await request.json().catch(() => null), input = parsePublishedSession(body, true);
  if (!input) return NextResponse.json({ error: "Indiquez un titre, un lieu, une durée, un créneau futur daté et une capacité de 2 à 50 places" }, { status: 400 });
  if (body.coachId !== undefined && body.coachId !== session.coachId) return NextResponse.json({ error: "Publication pour un autre coach interdite" }, { status: 403 });
  try { return NextResponse.json({ data: publicStructureOffer(await createCoachSession(session.email, session.coachId, input)) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Publication impossible : un profil coach validé est nécessaire" }, { status: 409 }); }
}
