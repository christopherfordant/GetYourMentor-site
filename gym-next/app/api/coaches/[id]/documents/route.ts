import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { deleteCoachDocument, getCoachDocumentSignedUrl, saveCoachDocument, type CoachDocumentKind } from "@/lib/coaches";
import { bodyExceedsLimit, textExceedsLimit } from "@/lib/request-guards";

const allowedKinds = new Set<CoachDocumentKind>(["identity", "diploma"]);
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

async function authorized(id: string) {
  const session = await currentSession();
  if (!session || !["coach", "admin"].includes(session.role)) return null;
  if (session.role === "coach" && session.coachId !== id) return null;
  return session;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (textExceedsLimit(id, 128) || !(await authorized(id))) return NextResponse.json({ error: "Accès coach ou admin requis" }, { status: 403 });
  if (bodyExceedsLimit(request, 6 * 1024 * 1024)) return NextResponse.json({ error: "Document trop volumineux" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const kind = String(form?.get("kind") ?? "") as CoachDocumentKind;
  const file = form?.get("file");
  if (!allowedKinds.has(kind) || !(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Type et fichier requis" }, { status: 400 });
  if (file.size > 5 * 1024 * 1024 || !allowedTypes.has(file.type)) return NextResponse.json({ error: "PDF ou image de 5 Mo maximum attendu" }, { status: 400 });
  try {
    const data = await saveCoachDocument(id, kind, file);
    return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Stockage Supabase indisponible" }, { status: 503 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dépôt impossible" }, { status: 502 });
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (textExceedsLimit(id, 128) || !(await authorized(id))) return NextResponse.json({ error: "Accès coach ou admin requis" }, { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") as CoachDocumentKind;
  if (!allowedKinds.has(kind)) return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  try {
    const signedUrl = await getCoachDocumentSignedUrl(id, kind);
    return signedUrl ? NextResponse.json({ data: { signedUrl, expiresIn: 300 } }) : NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Document indisponible" }, { status: 502 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (textExceedsLimit(id, 128) || !(await authorized(id))) return NextResponse.json({ error: "Accès coach ou admin requis" }, { status: 403 });
  const kind = new URL(request.url).searchParams.get("kind") as CoachDocumentKind;
  if (!allowedKinds.has(kind)) return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  try {
    return NextResponse.json({ data: { deleted: await deleteCoachDocument(id, kind) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Suppression impossible" }, { status: 502 });
  }
}
