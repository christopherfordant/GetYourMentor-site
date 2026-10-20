import { messageBelongsToCoach as belongsToCoach } from "@/lib/message-access";
import { boundedMessageJson, parseMessageFile, MessageFileError } from "@/lib/message-attachment-server";
import { MAX_MESSAGE_REQUEST_BYTES } from "@/lib/message-attachment-contract";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { createMessage, listMessages, MessageConflictError, type Message } from "@/lib/messages";
import { getCoach } from "@/lib/coaches";
import { bodyExceedsLimit, textExceedsLimit, rateLimit } from "@/lib/request-guards";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { randomUUID } from "node:crypto";
import { getReservation } from "@/lib/reservations";
import { activeCoachIds, listAffiliations } from "@/lib/affiliations";

const isolatedDemo = () => isDemoFallbackAllowed() && !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  const session = await currentSession();
  if (!session) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  if (session.role !== "sportif" && session.role !== "coach" && session.role !== "admin" && !(isolatedDemo() && session.role === "club")) {
    return NextResponse.json({ error: "Accès messagerie non disponible pour ce rôle" }, { status: 403 });
  }
  const requestedRecipient = new URL(request.url).searchParams.get("recipientName") ?? undefined;
  try {
    if (isolatedDemo()) {
      const owner = session.role === "sportif" || session.role === "club";
      const rows = (await listMessages(owner ? { senderEmail: session.email } : {})).filter(row => !owner || (row.ownerRole ?? "sportif") === session.role);
      const data = session.role === "coach" ? (await Promise.all(rows.map(async row => await belongsToCoach(row, session.coachId) ? row : null))).filter(row => row !== null) : rows;
      return NextResponse.json({ data, canReply: ["coach", "sportif", "club"].includes(session.role) }, { headers: { "Cache-Control": "no-store" } });
    }
    const recipientName = session.role === "coach" ? (session.coachId ? (await getCoach(session.coachId))?.name : "__coach_without_profile__") : requestedRecipient;
    const data = await listMessages(session.role === "sportif" ? { senderEmail: session.email } : session.role === "coach" ? { recipientName } : {});
    return NextResponse.json({ data, canReply: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Messages indisponibles" }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session || (session.role !== "sportif" && !(isolatedDemo() && ["coach", "club"].includes(session.role)))) return NextResponse.json({ error: "Connexion autorisée requise pour écrire" }, { status: 401 });
  if (bodyExceedsLimit(request, MAX_MESSAGE_REQUEST_BYTES)) return NextResponse.json({ error: "Requête trop volumineuse" }, { status: 413 });
  if (!rateLimit(request, "messages", 60, 60000).allowed) return NextResponse.json({ error: "Trop de messages. Réessayez dans un instant." }, { status: 429 });

  // No attachment storage/download contract exists in this endpoint yet.
  // Refuse an upload explicitly rather than returning success for its text alone.
  const attachmentError = () => NextResponse.json({
    error: "Les pièces jointes ne sont pas disponibles dans la messagerie. Aucun fichier ni message n’a été enregistré.",
    code: "MESSAGE_ATTACHMENTS_UNAVAILABLE",
  }, { status: 415 });
  if (request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return attachmentError();
  let body: Record<string, any>;
  let attachment: ReturnType<typeof parseMessageFile> | undefined;
  try {
    body = await boundedMessageJson(request);
    if (["attachments", "file", "files"].some(key => Object.prototype.hasOwnProperty.call(body, key))) return attachmentError();
    if (Object.prototype.hasOwnProperty.call(body, "attachment")) {
      attachment = parseMessageFile(body.attachment);
      if (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.requestId)) return NextResponse.json({ error: "Identifiant de tentative requis pour ce fichier" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof MessageFileError ? error.message : "Requête invalide", code: error instanceof MessageFileError ? error.code : "INVALID_MESSAGE" }, { status: error instanceof MessageFileError ? error.status : 400 });
  }
  if (body?.requestId !== undefined && (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.requestId))) return NextResponse.json({ error: "Identifiant de demande invalide" }, { status: 400 });
  if (textExceedsLimit(body?.recipientName, 160) || textExceedsLimit(body?.body, 4000) || textExceedsLimit(body?.reservationId, 128) || textExceedsLimit(body?.replyToId, 128) || textExceedsLimit(body?.requestId, 80)) {
    return NextResponse.json({ error: "Message trop long" }, { status: 400 });
  }
  if (typeof body?.body !== "string" || !body.body.trim()) {
    return NextResponse.json({ error: "Destinataire et message requis" }, { status: 400 });
  }

  try {
    if (body.replyToId !== undefined) {
      if (!isolatedDemo()) return NextResponse.json({ error: "Réponses disponibles en démonstration isolée uniquement" }, { status: 503 });
      if (typeof body.replyToId !== "string" || !body.replyToId) return NextResponse.json({ error: "Message de référence invalide" }, { status: 400 });
      const parent = (await listMessages()).find(row => row.id === body.replyToId);
      if (!parent || (session.role === "coach" ? !await belongsToCoach(parent, session.coachId) : parent.senderEmail !== session.email || (parent.ownerRole ?? "sportif") !== session.role)) return NextResponse.json({ error: "Conversation inaccessible" }, { status: 403 });
      const coach = await getCoach(parent.coachId ?? parent.recipientName);
      if (!coach?.verified) return NextResponse.json({ error: "Coach indisponible" }, { status: 404 });
      if (body.requestId !== undefined && (typeof body.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(body.requestId))) return NextResponse.json({ error: "Identifiant de demande invalide" }, { status: 400 });
      const data = await createMessage({ id: `message-${randomUUID()}`, senderEmail: parent.senderEmail, recipientName: coach.name, coachId: coach.id, authorRole: session.role as "sportif" | "coach" | "club", ownerRole: parent.ownerRole ?? "sportif", replyToId: parent.id, requestId: body.requestId, reservationId: parent.reservationId, body: body.body.trim(), createdAt: new Date().toISOString() }, attachment);
      return NextResponse.json({ data }, { status: 201 });
    }
    if (isolatedDemo() && (session.role === "club" || (session.role === "coach" && body.structureEmail !== undefined))) {
      if (session.role === "coach" && !session.coachId) return NextResponse.json({ error: "Profil coach requis" }, { status: 403 });
      const structureEmail = session.role === "club" ? session.email : typeof body.structureEmail === "string" ? body.structureEmail.trim().toLowerCase() : "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(structureEmail) || structureEmail.length > 254) return NextResponse.json({ error: "Structure invalide" }, { status: 400 });
      const coach = await getCoach(session.role === "coach" ? session.coachId : typeof body.recipientName === "string" ? body.recipientName : "__missing__");
      const affiliations = await listAffiliations({ role: "club", email: structureEmail });
      if (!coach?.verified || !activeCoachIds(affiliations, structureEmail).includes(coach.id)) return NextResponse.json({ error: "Un accord d’affiliation actif est nécessaire pour cet échange" }, { status: 403 });
      const data = await createMessage({ id: `message-${randomUUID()}`, senderEmail: structureEmail, recipientName: coach.name, coachId: coach.id, authorRole: session.role as "coach" | "club", ownerRole: "club", requestId: body.requestId, body: body.body.trim(), createdAt: new Date().toISOString() }, attachment);
      return NextResponse.json({ data }, { status: 201 });
    }
    if (session.role !== "sportif") return NextResponse.json({ error: "Choisissez une conversation existante pour répondre" }, { status: 400 });
    if (typeof body.recipientName !== "string" || !body.recipientName.trim()) return NextResponse.json({ error: "Destinataire requis" }, { status: 400 });
    const coach = await getCoach(body.recipientName.trim());
    if (!coach || !coach.verified) return NextResponse.json({ error: "Coach indisponible" }, { status: 404 });
    if (body.reservationId !== undefined) {
      if (typeof body.reservationId !== "string" || !body.reservationId) return NextResponse.json({ error: "Réservation invalide" }, { status: 400 });
      const reservation = await getReservation(body.reservationId);
      if (!reservation || reservation.ownerEmail !== session.email || reservation.coachId !== coach.id) return NextResponse.json({ error: "Réservation inaccessible" }, { status: 403 });
    }
    const message = await createMessage({
      id: `message-${randomUUID()}`,
      senderEmail: session.email,
      recipientName: coach.name,
      reservationId: typeof body.reservationId === "string" ? body.reservationId : undefined,
      body: body.body.trim(),
      createdAt: new Date().toISOString(),
      ...(isolatedDemo() ? { coachId: coach.id, authorRole: "sportif" as const, requestId: body.requestId } : {}),
    }, attachment);
    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof MessageConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Message impossible. Réessayez dans un instant." }, { status: 502 });
  }
}
