"use client";
import { useEffect, useState } from "react";

type Settings = { bps: number; version: number; history: Array<{ id: string; fromBps: number; toBps: number; changedAt: string }> };

export function CommissionSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [percent, setPercent] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/admin/commission").then(async (r) => {
    if (!r.ok) throw new Error("Paramètres financiers indisponibles");
    const { data } = await r.json(); setSettings(data); setPercent(String(data.bps / 100));
  }).catch((e) => setMessage(e.message)); }, []);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!settings || saving) return;
    const number = Number(percent.replace(",", "."));
    const bps = Math.round(number * 100);
    if (!percent.trim() || !Number.isFinite(number) || Math.abs(number * 100 - bps) > 1e-8 || bps < 0 || bps > 10000) { setMessage("Saisissez un taux entre 0 et 100 %, avec deux décimales maximum."); return; }
    setSaving(true); setMessage("");
    try {
      const r = await fetch("/api/admin/commission", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bps, version: settings.version }) });
      const payload = await r.json(); if (!r.ok) throw new Error(payload.error);
      setSettings(payload.data); setMessage("Commission enregistrée. Les réservations existantes restent inchangées.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Mise à jour impossible"); }
    finally { setSaving(false); }
  }
  return <section className="account-dashboard-card" data-admin-commission>
    <h2>Commission de la plateforme</h2>
    <p>Le taux s’applique aux nouvelles réservations. Le prix payé par le sportif reste identique. Les frais Stripe éventuels sont distincts.</p>
    <form onSubmit={save}>
      <label className="auth-field"><span>Commission (%)</span><input aria-label="Commission (%)" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} disabled={!settings || saving} /></label>
      <button className="auth-primary" type="submit" disabled={!settings || saving}>{saving ? "Enregistrement…" : "Enregistrer la commission"}</button>
    </form>
    {message ? <p role="status">{message}</p> : null}
    {settings?.history.length ? <details><summary>Historique des changements</summary><ul>{settings.history.slice(-10).reverse().map((h) => <li key={h.id}>{h.fromBps / 100} % → {h.toBps / 100} % — {new Date(h.changedAt).toLocaleString("fr-FR")}</li>)}</ul></details> : null}
  </section>;
}
