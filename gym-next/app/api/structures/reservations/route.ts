import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { structureReservationSummaries } from "@/lib/structure-offers";

export async function GET() {
  const session = await requireRole("club");
  if (!session) return NextResponse.json({ error: "Connexion structure requise" }, { status: 401 });
  if (!isDemoFallbackAllowed()) return NextResponse.json({ error: "Planning de structure en démonstration uniquement" }, { status: 503 });
  try { return NextResponse.json({ data: await structureReservationSummaries(session.email) }); }
  catch { return NextResponse.json({ error: "Planning indisponible" }, { status: 503 }); }
}
