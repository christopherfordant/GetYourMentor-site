import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { bodyExceedsLimit, textExceedsLimit } from "@/lib/request-guards";

function config() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  if (bodyExceedsLimit(request, 8 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!phone || textExceedsLimit(phone, 32) || !/^\+[1-9]\d{7,14}$/.test(phone)) return NextResponse.json({ error: "Numéro international valide requis, par exemple +33612345678" }, { status: 400 });
  const supabase = config();
  if (!supabase || !session.accessToken) return NextResponse.json({ error: "La vérification téléphone Supabase n'est pas configurée pour cette session" }, { status: 503 });
  const response = await fetch(`${supabase.url}/auth/v1/user`, {
    method: "PUT",
    headers: { apikey: supabase.key, Authorization: `Bearer ${session.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });
  if (!response.ok) return NextResponse.json({ error: "Envoi du code impossible. Vérifiez la configuration SMS Supabase." }, { status: 502 });
  return NextResponse.json({ data: { status: "pending", phone } });
}
