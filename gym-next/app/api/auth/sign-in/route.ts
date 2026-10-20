import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { bodyExceedsLimit, rateLimit, textExceedsLimit } from "@/lib/request-guards";

export async function POST(request: Request) {
  const limit = rateLimit(request, "auth-sign-in", 120, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (bodyExceedsLimit(request, 16 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (textExceedsLimit(body?.email, 320) || textExceedsLimit(body?.password, 256)) {
    return NextResponse.json({ error: "Identifiants trop longs" }, { status: 400 });
  }
  const role = ["sportif", "coach", "club", "admin"].includes(body?.role) ? body.role : "sportif";

  try {
    const session = await signIn(body?.email, body?.password, role);
    return NextResponse.json({ data: session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Connexion impossible" }, { status: 401 });
  }
}
