import { NextResponse } from "next/server";
import { currentSession, demoStructureExists } from "@/lib/auth";
import { getCoach, listCoaches } from "@/lib/coaches";
import { AffiliationError, assertAffiliationDemo, listAffiliations, requestAffiliation, respondAffiliation } from "@/lib/affiliations";
import { bodyExceedsLimit, rateLimit } from "@/lib/request-guards";

function failure(error: unknown) { return NextResponse.json({ error: error instanceof AffiliationError ? error.message : "Affiliations indisponibles" }, { status: error instanceof AffiliationError ? error.status : 503 }); }
export async function GET() {
  const session = await currentSession();
  if (!session || !["club", "coach", "admin"].includes(session.role)) return NextResponse.json({ error: "Connexion autorisée requise" }, { status: 401 });
  try {
    assertAffiliationDemo();
    const rows = await listAffiliations(session);
    const data = await Promise.all(rows.map(async r => ({ ...r, coachName: (await getCoach(r.coachId))?.name ?? r.coachId })));
    const candidates = session.role === "club" ? (await listCoaches()).map(c => ({ id: c.id, name: c.name })) : [];
    return NextResponse.json({ data, candidates }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
async function mutate(request: Request, response: boolean) {
  const session = await currentSession();
  if (!session || !["club", "coach"].includes(session.role)) return NextResponse.json({ error: "Connexion coach ou structure requise" }, { status: 401 });
  try {
    assertAffiliationDemo();
    if (bodyExceedsLimit(request, 2048)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
    if (!rateLimit(request, "affiliations", 40, 60000).allowed) return NextResponse.json({ error: "Trop de demandes" }, { status: 429 });
    const body = await request.json().catch(() => null);
    if (response) {
      if (typeof body?.id !== "string" || body.id.length > 120 || !["accept", "reject"].includes(body?.action)) return NextResponse.json({ error: "Réponse invalide" }, { status: 400 });
      return NextResponse.json({ data: await respondAffiliation(session, body.id, body.action) });
    }
    const structureEmail = session.role === "club" ? session.email : typeof body?.structureEmail === "string" ? body.structureEmail.trim().toLowerCase() : "";
    const coachId = session.role === "coach" ? session.coachId : body?.coachId;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(structureEmail) || structureEmail.length > 254 || typeof coachId !== "string" || !/^[a-z0-9-]{1,120}$/.test(coachId)) return NextResponse.json({ error: "Indiquez un coach et une structure valides" }, { status: 400 });
    if (!await demoStructureExists(structureEmail) || (await getCoach(coachId))?.id !== coachId) return NextResponse.json({ error: "Destinataire indisponible en démonstration" }, { status: 404 });
    return NextResponse.json({ data: await requestAffiliation(session, structureEmail, coachId) });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) { return mutate(request, false); }
export async function PATCH(request: Request) { return mutate(request, true); }
