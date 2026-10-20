import { NextResponse } from "next/server";
import { signUp, type UserRole } from "@/lib/auth";
import { bodyExceedsLimit, rateLimit, textExceedsLimit } from "@/lib/request-guards";

export async function POST(request: Request) {
  const limit = rateLimit(request, "auth-sign-up", 60, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de tentatives, réessayez plus tard" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (bodyExceedsLimit(request, 16 * 1024)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if ([body?.email, body?.password, body?.firstName, body?.lastName, body?.phone, body?.city].some((value) => textExceedsLimit(value, 512))) {
    return NextResponse.json({ error: "Données d’inscription trop longues" }, { status: 400 });
  }
  const role = ["sportif", "coach", "club"].includes(body?.role) ? body.role as UserRole : "sportif";
  try {
    const session = await signUp(body?.email, body?.password, role, {
      firstName: body?.firstName,
      lastName: body?.lastName,
      phone: body?.phone,
      city: body?.city,
      termsAccepted: body?.termsAccepted === true,
    });
    return NextResponse.json({ data: session }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inscription impossible" }, { status: 400 });
  }
}
