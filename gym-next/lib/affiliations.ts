import { randomUUID } from "node:crypto";
import type { Session } from "@/lib/auth";
import { isDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";

export type Affiliation = {
  id: string; structureEmail: string; coachId: string;
  requestedBy: "club" | "coach"; status: "pending" | "accepted" | "rejected";
  structureConsent: boolean; coachConsent: boolean;
  createdAt: string; respondedAt?: string; fixture?: boolean;
};
export const memoryAffiliations: Affiliation[] = [];
const fixture: Affiliation = { id: "fixture-club-steven", structureEmail: "club@example.com", coachId: "coach-demo-01", requestedBy: "club", status: "accepted", structureConsent: true, coachConsent: true, createdAt: "2026-10-15T00:00:00.000Z", fixture: true };
export class AffiliationError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export function assertAffiliationDemo() {
  if (!isDemoFallbackAllowed() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) throw new AffiliationError("Affiliations disponibles en démonstration isolée uniquement", 503);
}
export function allAffiliations(rows: Affiliation[] = []) { return [fixture, ...rows.filter(r => r.id !== fixture.id && !(r.structureEmail === fixture.structureEmail && r.coachId === fixture.coachId))]; }
export async function listAffiliations(session: Session) {
  assertAffiliationDemo();
  const rows = allAffiliations(isHostedDemo() ? (await readDemoState()).affiliations : memoryAffiliations);
  return rows.filter(r => session.role === "admin" || (session.role === "club" && r.structureEmail === session.email) || (session.role === "coach" && !!session.coachId && r.coachId === session.coachId));
}
export function activeCoachIds(rows: Affiliation[], email: string) { return rows.filter(r => r.structureEmail === email && r.status === "accepted" && r.structureConsent && r.coachConsent).map(r => r.coachId); }
export async function requestAffiliation(session: Session, structureEmail: string, coachId: string) {
  assertAffiliationDemo();
  if (!((session.role === "club" && session.email === structureEmail) || (session.role === "coach" && session.coachId === coachId))) throw new AffiliationError("Demande non autorisée", 403);
  const change = (rows: Affiliation[]) => {
    const existing = allAffiliations(rows).find(r => r.structureEmail === structureEmail && r.coachId === coachId);
    if (existing) {
      // Two explicit requests from opposite parties express both consents.
      // Repeating the same party's request does not grant the other's consent.
      if (existing.status === "pending" && existing.requestedBy !== session.role) {
        existing.status = "accepted"; existing.structureConsent = true; existing.coachConsent = true;
        existing.respondedAt = new Date().toISOString();
      }
      return existing;
    }
    const affiliation: Affiliation = { id: randomUUID(), structureEmail, coachId, requestedBy: session.role as "club" | "coach", status: "pending", structureConsent: session.role === "club", coachConsent: session.role === "coach", createdAt: new Date().toISOString() };
    rows.push(affiliation); return affiliation;
  };
  return isHostedDemo() ? mutateDemoState(state => change(state.affiliations ??= [])) : change(memoryAffiliations);
}
export async function respondAffiliation(session: Session, id: string, action: "accept" | "reject") {
  assertAffiliationDemo();
  const change = (rows: Affiliation[]) => {
    const row = allAffiliations(rows).find(r => r.id === id);
    if (!row) throw new AffiliationError("Affiliation introuvable", 404);
    const party = session.role === "club" && session.email === row.structureEmail ? "club" : session.role === "coach" && session.coachId === row.coachId ? "coach" : null;
    if (!party || party === row.requestedBy || row.fixture) throw new AffiliationError("Seul le destinataire peut répondre à cette demande", 403);
    const next = action === "accept" ? "accepted" : "rejected";
    if (row.status === next) return row;
    if (row.status !== "pending") throw new AffiliationError("Cette demande a déjà reçu une réponse", 409);
    row.status = next; row.respondedAt = new Date().toISOString();
    if (action === "accept") { row.structureConsent = true; row.coachConsent = true; }
    return row;
  };
  return isHostedDemo() ? mutateDemoState(state => change(state.affiliations ??= [])) : change(memoryAffiliations);
}
