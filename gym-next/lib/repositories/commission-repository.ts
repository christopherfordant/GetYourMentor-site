import { randomUUID } from "node:crypto";
import { validateCommissionBps } from "@/lib/domain/commission";
import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { supabaseHeaders } from "@/lib/supabase";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";

export type CommissionChange = { id: string; fromBps: number; toBps: number; version: number; changedBy: string; changedAt: string };
export type CommissionSettings = { bps: number; version: number; updatedAt: string; history: CommissionChange[] };
let memory: CommissionSettings | undefined;

function initialSettings(): CommissionSettings {
  // Cahier des charges MVP and business plan p.35: 15% non-premium. Override only on server.
  const bps = validateCommissionBps(Number(process.env.PLATFORM_COMMISSION_BPS ?? 1500));
  return { bps, version: 1, updatedAt: new Date().toISOString(), history: [] };
}

function config() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  assertDemoFallbackAllowed("Paramètres financiers");
  return null;
}

export class CommissionConflictError extends Error {}

export async function getCommissionSettings(): Promise<CommissionSettings> {
  const db = config();
  if (!db) {
    if (isHostedDemo()) {
      const state = await readDemoState();
      if (state.commission) return state.commission;
      return mutateDemoState((s) => s.commission ??= initialSettings());
    }
    return memory ??= initialSettings();
  }
  const response = await fetch(`${db.url}/rest/v1/gym_commission_settings?id=eq.platform&select=*`, { headers: supabaseHeaders(db.key), cache: "no-store" });
  if (!response.ok) throw new Error("Paramètres financiers indisponibles : migration requise");
  const [row] = await response.json();
  if (!row) throw new Error("Commission non configurée");
  return { bps: validateCommissionBps(row.bps), version: row.version, updatedAt: row.updated_at, history: row.history ?? [] };
}

export async function updateCommissionSettings(bps: number, expectedVersion: number, actor: string) {
  validateCommissionBps(bps);
  const db = config();
  function update(current: CommissionSettings) {
    if (current.version !== expectedVersion) throw new CommissionConflictError("Le taux a changé : rechargez les paramètres");
    const changedAt = new Date().toISOString();
    return { bps, version: current.version + 1, updatedAt: changedAt, history: [...current.history, { id: randomUUID(), fromBps: current.bps, toBps: bps, version: current.version + 1, changedBy: actor, changedAt }] };
  }
  if (!db) {
    if (isHostedDemo()) return mutateDemoState((s) => s.commission = update(s.commission ?? initialSettings()));
    memory = update(await getCommissionSettings());
    return memory;
  }
  const response = await fetch(`${db.url}/rest/v1/rpc/gym_update_commission`, {
    method: "POST", headers: supabaseHeaders(db.key, { "Content-Type": "application/json" }),
    body: JSON.stringify({ new_bps: bps, expected_version: expectedVersion, actor }),
  });
  if (response.status === 409) throw new CommissionConflictError("Le taux a changé : rechargez les paramètres");
  if (!response.ok) throw new Error("Mise à jour de la commission impossible");
  return getCommissionSettings();
}
