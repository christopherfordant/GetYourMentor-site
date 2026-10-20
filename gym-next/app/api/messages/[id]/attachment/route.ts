import { rateLimit } from "@/lib/request-guards";
import { currentSession } from "@/lib/auth";
import { listMessages } from "@/lib/messages";
import { messageParticipant } from "@/lib/message-access";
import { getMessageFile } from "@/lib/message-attachment-server";
import { isIsolatedDemoFeatureEnabled } from "@/lib/runtime";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401, headers });
  if (!rateLimit(_request, `message-file-${session.role}-${session.email}`, 30, 60000).allowed) return NextResponse.json({ error: "Trop de téléchargements. Réessayez dans un instant." }, { status: 429, headers });
  if (!isIsolatedDemoFeatureEnabled()) return NextResponse.json({ error: "Fichier indisponible" }, { status: 404, headers });
  try {
    const { id } = await params;
    const message = (await listMessages()).find(m => m.id === id);
    if (!message?.attachment || !await messageParticipant(message, session)) return NextResponse.json({ error: "Fichier inaccessible" }, { status: 404, headers });
    const bytes = await getMessageFile(message.attachment);
    return new Response(Uint8Array.from(bytes).buffer, { headers: { ...headers, "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": "attachment; filename=piece-jointe.txt", "Content-Length": String(bytes.length) } });
  } catch {
    return NextResponse.json({ error: "Fichier indisponible. Réessayez ultérieurement." }, { status: 503, headers });
  }
}
