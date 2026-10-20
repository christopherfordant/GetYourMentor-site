import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { bodyExceedsLimit } from "@/lib/request-guards";
import { CommissionConflictError, getCommissionSettings, updateCommissionSettings } from "@/lib/repositories/commission-repository";
import { validateCommissionBps } from "@/lib/domain/commission";

export async function GET() {
  if (!await requireRole("admin")) return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 });
  try { return NextResponse.json({ data: await getCommissionSettings() }); }
  catch { return NextResponse.json({ error: "Paramètres financiers indisponibles" }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const admin = await requireRole("admin");
  if (!admin) return NextResponse.json({ error: "Accès administrateur requis" }, { status: 401 });
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const expectedOrigin = `${url.protocol}//${request.headers.get("host") ?? url.host}`;
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : expectedOrigin;
  if (origin && origin !== expectedOrigin && origin !== configuredOrigin) return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  if (bodyExceedsLimit(request, 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  try { validateCommissionBps(body?.bps); }
  catch { return NextResponse.json({ error: "Taux invalide (0 à 100 %, deux décimales maximum)" }, { status: 400 }); }
  if (!Number.isSafeInteger(body?.version) || body.version < 1) return NextResponse.json({ error: "Version requise" }, { status: 400 });
  try { return NextResponse.json({ data: await updateCommissionSettings(body.bps, body.version, admin.email) }); }
  catch (error) { return NextResponse.json({ error: error instanceof CommissionConflictError ? error.message : "Mise à jour impossible" }, { status: error instanceof CommissionConflictError ? 409 : 503 }); }
}
