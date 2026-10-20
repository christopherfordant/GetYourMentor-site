import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { readOfferPreview, saveOfferPreview, offerPreviewsEnabled, OfferPreviewError } from "@/lib/offer-previews";
import { rateLimit } from "@/lib/request-guards";
export const dynamic = "force-dynamic";
async function handle(request: Request, write: boolean) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  if (!offerPreviewsEnabled()) return NextResponse.json({ error: "Aperçus indisponibles hors démo isolée" }, { status: 503 });
  const json = (data: unknown) => NextResponse.json({ data }, { headers: { "Cache-Control": "no-store" } });
  try {
    if (!write) return json(await readOfferPreview(session));
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(process.env.NEXT_PUBLIC_APP_URL || request.url).origin) throw new OfferPreviewError("Origine refusée", 403);
    if (!rateLimit(request, `offer-preview-${session.role}-${session.email}`, 30, 60000).allowed) throw new OfferPreviewError("Trop de demandes. Réessayez dans un instant.", 429);
    const reader = request.body?.getReader(); if (!reader) throw new OfferPreviewError("Requête invalide");
    let bytes = 0; const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.byteLength; if (bytes > 4096) { await reader.cancel(); throw new OfferPreviewError("Requête trop volumineuse", 413); } chunks.push(value); }
    let body: unknown; try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new OfferPreviewError("JSON invalide"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new OfferPreviewError("Requête invalide");
    await saveOfferPreview(session, body as Record<string, unknown>);
    return json(await readOfferPreview(session));
  } catch (error) { return NextResponse.json({ error: error instanceof OfferPreviewError ? error.message : "Aperçu indisponible. Réessayez sans modifier votre demande." }, { status: error instanceof OfferPreviewError ? error.status : 503 }); }
}
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
