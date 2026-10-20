import { parsePublishedSession } from "@/lib/domain/published-session";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";
import { createStructureOffer, listStructureOffers, publicStructureOffer, publicSessionOffer } from "@/lib/structure-offers";

export async function GET(request: Request) {
  if (!isDemoFallbackAllowed()) return NextResponse.json({ error: "Parcours structure disponible en démonstration uniquement" }, { status: 503 });
  const own = new URL(request.url).searchParams.get("mine") === "1";
  const session = own ? await requireRole("club") : null;
  if (own && !session) return NextResponse.json({ error: "Connexion structure requise" }, { status: 401 });
  try { return NextResponse.json({ data: await Promise.all((await listStructureOffers(session?.email)).filter(o => o.source !== "coach").map(offer => publicSessionOffer(offer))) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Séances indisponibles" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const session = await requireRole("club");
  if (!session) return NextResponse.json({ error: "Connexion structure requise" }, { status: 401 });
  if (!isDemoFallbackAllowed()) return NextResponse.json({ error: "Publication de séances en démonstration uniquement" }, { status: 503 });
  if (!rateLimit(request, "structure-offer", 20, 60_000).allowed) return NextResponse.json({ error: "Trop de demandes" }, { status: 429 });
  if (bodyExceedsLimit(request, 4096)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  const input = parsePublishedSession(body);
  if (!input) return NextResponse.json({ error: "Titre, dates, durée ou capacité invalides" }, { status: 400 });
  if (body.coachId !== undefined && (typeof body.coachId !== "string" || !body.coachId || body.coachId.length > 120)) return NextResponse.json({ error: "Coach invalide" }, { status: 400 });
  try { return NextResponse.json({ data: publicStructureOffer(await createStructureOffer(session.email, input.title, input.duration, input.slots, input.capacity, body.coachId)) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Publication impossible : vérifiez l'affiliation de votre coach" }, { status: 409 }); }
}
