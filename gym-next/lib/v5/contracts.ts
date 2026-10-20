export const V5_STATUSES = ["ILLUSTRATIF", "DOCUMENTÉ", "VALIDÉ_PAR_EXPERT", "CONTESTÉ", "OBSOLÈTE"] as const;
export type V5Status = (typeof V5_STATUSES)[number];
export type V5Episode = { id: string; project: string; route?: string; context: string; task: string; hypotheses: string[]; observations: string[]; decision?: string; alternativesRejected: string[]; evidenceIds: string[]; result?: string; humanCorrection?: string; status: V5Status; confidence: number; createdAt: string; reviewAt?: string };
export type V5Evidence = { id: string; type: "PLAYWRIGHT" | "TEST" | "SCREENSHOT" | "LOG" | "HUMAN"; source: string; route?: string; viewport?: string; action?: string; before?: string; after?: string; artifact?: string; timestamp: string; reliability: number };
export type V5Objection = { id: string; role: string; claim: string; counterargument: string; risk: string; resolution?: string; status: V5Status };
export type V5HumanReview = { id: string; reviewer: string; scope: string; decision: "APPROVE" | "REJECT" | "REQUEST_CHANGES"; comments: string; approved: boolean; createdAt: string };
export type V5CandidateRule = { id: string; originEpisode: string; trigger: string; proposedChange: string; scope: string; risk: string; testsRequired: string[]; approvalRequired: true; status: V5Status };
export type V5TestReport = { id: string; scope: string; command: string; passed: boolean; evidenceIds: string[]; regressions: string[]; createdAt: string };
export function isV5Status(value: unknown): value is V5Status { return typeof value === "string" && (V5_STATUSES as readonly string[]).includes(value); }
export function assertV5Status(value: unknown): asserts value is V5Status { if (!isV5Status(value)) throw new Error("Statut V5 invalide"); }
export function validateV5Episode(value: V5Episode) {
  if (!value.id.trim() || !value.project.trim() || !value.context.trim() || !value.task.trim()) throw new Error("V5_EPISODE_REQUIRED_FIELDS");
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) throw new Error("V5_CONFIDENCE_OUT_OF_RANGE");
  assertV5Status(value.status);
  return value;
}
export function validateV5Evidence(value: V5Evidence) {
  if (!value.id.trim() || !value.source.trim() || !Number.isFinite(value.reliability) || value.reliability < 0 || value.reliability > 1) throw new Error("V5_EVIDENCE_INVALID");
  return value;
}
