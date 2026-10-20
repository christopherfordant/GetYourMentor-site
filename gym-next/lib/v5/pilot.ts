import { validateV5Episode, validateV5Evidence, type V5CandidateRule, type V5Episode, type V5Evidence, type V5HumanReview, type V5Objection, type V5TestReport } from "./contracts";
const episodes: V5Episode[] = [];
const evidence: V5Evidence[] = [];
const objections: V5Objection[] = [];
const reviews: V5HumanReview[] = [];
const rules: V5CandidateRule[] = [];
const reports: V5TestReport[] = [];
const activeSignatures = new Set<string>();
let cycles = 0;
let failures = 0;
const maxCycles = () => Number(process.env.V5_MAX_CYCLES ?? 10);
const maxFailures = () => Number(process.env.V5_MAX_FAILURES ?? 3);
export function isV5Enabled() { return process.env.V5_ENABLED === "true"; }
function requireEnabled() { if (!isV5Enabled()) throw new Error("V5_DISABLED"); }
export function recordV5Episode(value: V5Episode) { requireEnabled(); validateV5Episode(value); episodes.push(structuredClone(value)); return value.id; }
export function recordV5Evidence(value: V5Evidence) { requireEnabled(); validateV5Evidence(value); evidence.push(structuredClone(value)); return value.id; }
export function recordV5Objection(value: V5Objection) { requireEnabled(); objections.push(structuredClone(value)); return value.id; }
export function recordV5Review(value: V5HumanReview) { requireEnabled(); reviews.push(structuredClone(value)); return value.id; }
export function proposeV5Rule(value: V5CandidateRule) { requireEnabled(); if (value.status === "ILLUSTRATIF" || value.approvalRequired !== true) throw new Error("V5_RULE_REQUIRES_HUMAN_APPROVAL"); rules.push(structuredClone(value)); return value.id; }
export function recordV5TestReport(value: V5TestReport) { requireEnabled(); reports.push(structuredClone(value)); return value.id; }
export function searchV5Episodes(context: string) { requireEnabled(); const query = context.trim().toLowerCase(); return episodes.filter((episode) => episode.context.toLowerCase().includes(query)); }
export function beginV5Cycle(signature: string) { requireEnabled(); if (!signature.trim()) throw new Error("V5_SIGNATURE_REQUIRED"); if (activeSignatures.has(signature)) throw new Error("V5_REENTRY_OR_REPEAT"); if (cycles >= maxCycles()) throw new Error("V5_MAX_CYCLES_REACHED"); activeSignatures.add(signature); cycles += 1; return { cycle: cycles, timeoutMs: Number(process.env.V5_TIMEOUT_MS ?? 30000), retries: Number(process.env.V5_MAX_RETRIES ?? 2) }; }
export function endV5Cycle(signature: string, failed = false) { activeSignatures.delete(signature); if (failed) failures += 1; else failures = 0; if (failures >= maxFailures()) throw new Error("V5_MAX_FAILURES_REACHED"); }
export function getV5GuardState() { return { cycles, failures, active: activeSignatures.size, maxCycles: maxCycles(), maxFailures: maxFailures() }; }
export function resetV5PilotForTests() { episodes.length = 0; evidence.length = 0; objections.length = 0; reviews.length = 0; rules.length = 0; reports.length = 0; activeSignatures.clear(); cycles = 0; failures = 0; }
