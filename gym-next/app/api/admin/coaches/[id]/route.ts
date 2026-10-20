import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { setStoredCoachVerification } from "@/lib/coaches";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Connexion admin requise" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (typeof body?.verified !== "boolean") return NextResponse.json({ error: "Le statut verified est requis" }, { status: 400 });
  const coach = await setStoredCoachVerification((await params).id, body.verified);
  return coach ? NextResponse.json({ data: coach }) : NextResponse.json({ error: "Coach introuvable" }, { status: 404 });
}
