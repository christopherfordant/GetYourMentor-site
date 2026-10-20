import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { createFeedback, updateFeedback, listFeedback, feedbackEnabled, FeedbackError } from "@/lib/feedback";
import { rateLimit } from "@/lib/request-guards";

export const dynamic = "force-dynamic";
async function handle(request: Request, method: "GET" | "POST" | "PATCH") {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  if (!feedbackEnabled()) return NextResponse.json({ error: "Retours bêta indisponibles hors démonstration isolée" }, { status: 503 });
  const origin = request.headers.get("origin");
  // The framework's internal host can differ from the browser-facing application URL.
  const expectedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin;
  if (method !== "GET" && origin && origin !== expectedOrigin) return NextResponse.json({ error: "Origine refusée" }, { status: 403 });
  if (method !== "GET" && !rateLimit(request, `feedback-${method}-${session.role}-${session.email}`, 30, 60000).allowed) return NextResponse.json({ error: "Trop de demandes. Réessayez dans un instant." }, { status: 429 });
  try {
    if (method === "GET") return NextResponse.json({ data: await listFeedback(session, new URL(request.url).searchParams.get("view") ?? "mine") }, { headers: { "Cache-Control": "no-store" } });
    // Read a bounded stream, even when Content-Length is absent or forged.
    const reader = request.body?.getReader();
    if (!reader) throw new FeedbackError("Requête invalide");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024) { await reader.cancel(); throw new FeedbackError("Requête trop volumineuse", 413); }
      chunks.push(value);
    }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new FeedbackError("JSON invalide"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new FeedbackError("Requête invalide");
    const input = body as Record<string, unknown>;
    const data = method === "POST" ? await createFeedback(session, input) : await updateFeedback(session, input);
    return NextResponse.json({ data }, { status: method === "POST" ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof FeedbackError ? error.message : "Service indisponible. Réessayez sans modifier votre envoi." }, { status: error instanceof FeedbackError ? error.status : 503 });
  }
}
export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const PATCH = (request: Request) => handle(request, "PATCH");
