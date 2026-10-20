import { randomUUID } from "node:crypto";
import type { Session } from "@/lib/auth";
import { isDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";

export const feedbackKinds = ["suggestion", "bug", "positive"] as const;
export const feedbackStatuses = ["received", "reviewing", "planned", "resolved", "closed"] as const;
export type Feedback = {
  id: string; owner: string; kind: typeof feedbackKinds[number]; title: string; body: string;
  status: typeof feedbackStatuses[number]; requestId: string; createdAt: string;
  published: boolean; publicTitle: string; publicSummary: string; voters: string[];
};
const local: Feedback[] = [];
export const feedbackEnabled = () => isDemoFallbackAllowed() && ![process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY].some(Boolean);
const owner = (session: Session) => `${session.role}:${session.email.toLowerCase()}`;
export class FeedbackError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function guard() { if (!feedbackEnabled()) throw new FeedbackError("Retours bêta disponibles en démonstration isolée uniquement", 503); }
async function change<T>(callback: (rows: Feedback[]) => T): Promise<T> {
  guard();
  return isHostedDemo() ? mutateDemoState(state => callback(state.feedback ??= [])) : callback(local);
}
function text(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new FeedbackError("Texte manquant ou trop long");
  return value.trim();
}
export async function listFeedback(session: Session, view: string) {
  guard();
  if (!["mine", "suggestions", "admin"].includes(view)) throw new FeedbackError("Vue inconnue");
  if (view === "admin" && session.role !== "admin") throw new FeedbackError("Accès interdit", 403);
  const rows = isHostedDemo() ? (await readDemoState()).feedback ?? [] : local;
  if (view === "suggestions") return rows.filter(row => row.published && row.kind === "suggestion").map(row => ({
    id: row.id, title: row.publicTitle, body: row.publicSummary, status: row.status,
    createdAt: row.createdAt, votes: row.voters.length, voted: row.voters.includes(owner(session)),
  }));
  return rows.filter(row => view === "admin" || row.owner === owner(session)).map(({ owner: _owner, voters: _voters, requestId: _request, ...row }) => ({ ...row, votes: _voters.length }));
}
export async function createFeedback(session: Session, input: Record<string, unknown>) {
  if (session.role === "admin") throw new FeedbackError("Utilisez la modération pour traiter les retours", 403);
  const kind = input.kind;
  if (!feedbackKinds.includes(kind as Feedback["kind"])) throw new FeedbackError("Type de retour invalide");
  const title = text(input.title, 120), body = text(input.body, 2000);
  if (typeof input.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(input.requestId)) throw new FeedbackError("Identifiant de demande invalide");
  return change(rows => {
    const previous = rows.find(row => row.owner === owner(session) && row.requestId === input.requestId);
    if (previous) {
      if (previous.kind !== kind || previous.title !== title || previous.body !== body) throw new FeedbackError("Cette demande existe avec un contenu différent", 409);
      return { id: previous.id };
    }
    const id = `feedback-${randomUUID()}`;
    rows.push({ id, owner: owner(session), kind: kind as Feedback["kind"], title, body, requestId: input.requestId as string,
      status: "received", createdAt: new Date().toISOString(), published: false, publicTitle: "", publicSummary: "", voters: [] });
    return { id };
  });
}
export async function updateFeedback(session: Session, input: Record<string, unknown>) {
  if (typeof input.id !== "string" || !/^feedback-[a-f0-9-]{36}$/.test(input.id)) throw new FeedbackError("Retour invalide");
  if (input.action !== "vote" && input.action !== "moderate") throw new FeedbackError("Action invalide");
  if (input.action === "moderate" && session.role !== "admin") throw new FeedbackError("Accès interdit", 403);
  if (input.action === "vote" && session.role === "admin") throw new FeedbackError("Le compte administrateur ne vote pas", 403);
  return change(rows => {
    const row = rows.find(row => row.id === input.id);
    if (!row || (input.action === "vote" && (!row.published || row.kind !== "suggestion"))) throw new FeedbackError("Suggestion inaccessible", 404);
    if (input.action === "vote") {
      if (!row.voters.includes(owner(session))) row.voters.push(owner(session));
      return { id: row.id, votes: row.voters.length, voted: true };
    }
    if (!feedbackStatuses.includes(input.status as Feedback["status"]) || typeof input.published !== "boolean") throw new FeedbackError("État invalide");
    if (input.published && row.kind !== "suggestion") throw new FeedbackError("Seules les suggestions peuvent être publiées");
    const title = input.published ? text(input.publicTitle, 120) : "";
    const summary = input.published ? text(input.publicSummary, 600) : "";
    // Only deliberately approved summaries are shared; original feedback stays private.
    row.status = input.status as Feedback["status"]; row.published = input.published;
    row.publicTitle = title; row.publicSummary = summary;
    return { id: row.id, status: row.status, published: row.published };
  });
}
