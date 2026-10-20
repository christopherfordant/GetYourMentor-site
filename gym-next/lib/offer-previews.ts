import type { Session } from "@/lib/auth";
import { offersCatalog } from "@/lib/offers-catalog";
import { getCommissionSettings } from "@/lib/repositories/commission-repository";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";
import { isIsolatedDemoFeatureEnabled, isHostedDemo } from "@/lib/runtime";

export type OfferPreview = { owner: string; planId: string | null; version: number; updatedAt: string; requestId: string; action: "select" | "clear" };
const local: OfferPreview[] = [];
export const offerPreviewsEnabled = isIsolatedDemoFeatureEnabled;
export class OfferPreviewError extends Error { constructor(message: string, public status = 400) { super(message); } }
const ownerKey = (session: Session) => `${session.role}:${session.email.toLowerCase()}`;
function guard() { if (!offerPreviewsEnabled()) throw new OfferPreviewError("Aperçus disponibles en démonstration isolée uniquement", 503); }
function own(row?: OfferPreview) { return { planId: row?.planId ?? null, version: row?.version ?? 0, updatedAt: row?.updatedAt ?? null }; }
export async function readOfferPreview(session: Session) {
  guard();
  const rows = isHostedDemo() ? (await readDemoState()).offerPreviews ?? [] : local;
  const commission = await getCommissionSettings();
  return { role: session.role, preview: own(rows.find(row => row.owner === ownerKey(session))),
    eligiblePlanId: session.role === "coach" ? offersCatalog.coach.id : session.role === "club" ? offersCatalog.club.id : null,
    effective: { premiumEnabled: false, sessionCommissionBps: commission.bps, commissionVersion: commission.version, billingEnabled: false } };
}
export async function saveOfferPreview(session: Session, input: Record<string, unknown>) {
  guard();
  if (session.role !== "coach" && session.role !== "club") throw new OfferPreviewError("Aucun aperçu payant à sélectionner pour ce profil", 403);
  if (input.action !== "select" && input.action !== "clear") throw new OfferPreviewError("Action invalide");
  const action = input.action;
  const expectedPlan = offersCatalog[session.role].id;
  if (input.action === "select" && input.planId !== expectedPlan) throw new OfferPreviewError("Offre non disponible pour ce profil", 403);
  if (!Number.isSafeInteger(input.expectedVersion) || (input.expectedVersion as number) < 0) throw new OfferPreviewError("Version invalide");
  if (typeof input.requestId !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(input.requestId)) throw new OfferPreviewError("Identifiant invalide");
  const change = (rows: OfferPreview[]) => {
    const index = rows.findIndex(row => row.owner === ownerKey(session)), current = rows[index];
    if (current?.requestId === input.requestId) {
      if (current.action !== action) throw new OfferPreviewError("Identifiant déjà utilisé pour une autre action", 409);
      return own(current);
    }
    if ((current?.version ?? 0) !== input.expectedVersion) throw new OfferPreviewError("L’aperçu a changé. Actualise avant de réessayer.", 409);
    const row: OfferPreview = { owner: ownerKey(session), planId: action === "select" ? expectedPlan : null, action,
      version: (current?.version ?? 0) + 1, requestId: input.requestId as string, updatedAt: new Date().toISOString() };
    if (index < 0) rows.push(row); else rows[index] = row;
    return own(row);
  };
  return isHostedDemo() ? mutateDemoState(state => change(state.offerPreviews ??= [])) : change(local);
}
