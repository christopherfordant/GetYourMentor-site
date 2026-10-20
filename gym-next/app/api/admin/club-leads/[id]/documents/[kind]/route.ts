import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { deleteClubLeadDocument, getClubLeadDocumentSignedUrl, type ClubDocumentKind } from "@/lib/clubs";
import { textExceedsLimit } from "@/lib/request-guards";

type RouteProps = { params: Promise<{ id: string; kind: string }> };

export async function GET(_request: Request, { params }: RouteProps) {
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Connexion admin requise" }, { status: 401 });
  const { id, kind } = await params;
  if (textExceedsLimit(id, 128) || (kind !== "logo" && kind !== "identity")) {
    return NextResponse.json({ error: "Document club invalide" }, { status: 400 });
  }
  try {
    const url = await getClubLeadDocumentSignedUrl(id, kind as ClubDocumentKind);
    return url
      ? NextResponse.json({ data: { url, expiresIn: 300 } })
      : NextResponse.json({ error: "Document club introuvable" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Document club indisponible" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  if (!(await requireRole("admin"))) return NextResponse.json({ error: "Connexion admin requise" }, { status: 401 });
  const { id, kind } = await params;
  if (textExceedsLimit(id, 128) || (kind !== "logo" && kind !== "identity")) {
    return NextResponse.json({ error: "Document club invalide" }, { status: 400 });
  }
  try {
    const deleted = await deleteClubLeadDocument(id, kind as ClubDocumentKind);
    return deleted ? NextResponse.json({ data: { deleted: true } }) : NextResponse.json({ error: "Document club introuvable" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Suppression du document impossible" }, { status: 503 });
  }
}
