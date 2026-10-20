import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { bodyExceedsLimit, textExceedsLimit } from "@/lib/request-guards";

function config() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key, serviceKey } : null;
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  if (bodyExceedsLimit(request, 8 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  if (!phone || !/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{6}$/.test(token) || textExceedsLimit(phone, 32)) return NextResponse.json({ error: "Numéro ou code invalide" }, { status: 400 });
  const supabase = config();
  if (!supabase || !session.accessToken) return NextResponse.json({ error: "La vérification téléphone Supabase n'est pas configurée pour cette session" }, { status: 503 });
  const response = await fetch(`${supabase.url}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: supabase.key, Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "phone_change", phone, token }),
  });
  if (!response.ok) return NextResponse.json({ error: "Code incorrect ou expiré" }, { status: 400 });
  if (session.role === "coach" && session.coachId && supabase.serviceKey) {
    const coachResponse = await fetch(`${supabase.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(session.coachId)}`, {
      method: "PATCH",
      headers: { apikey: supabase.serviceKey, Authorization: `Bearer ${supabase.serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ phone, phone_verified_at: new Date().toISOString() }),
    });
    if (!coachResponse.ok) return NextResponse.json({ error: "Téléphone vérifié, mais profil coach non synchronisé" }, { status: 502 });
  }
  return NextResponse.json({ data: { status: "verified", phone } });
}
