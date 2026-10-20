"use client";
import { useEffect, useState } from "react";
type Price = { participantCount: number; totalCents: number };
export function GroupPrices({ coachId }: { coachId?: string }) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!coachId) return;
    fetch(`/api/coaches/${encodeURIComponent(coachId)}`).then(async r => { if (!r.ok) throw new Error(); setPrices((await r.json()).data.groupPrices ?? []); setReady(true); }).catch(() => setMessage("Chargement des tarifs impossible. Rechargez la page."));
  }, [coachId]);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    const entry = { participantCount: Number(data.get("count")), totalCents: Math.round(Number(String(data.get("total")).replace(",", ".")) * 100) };
    const next = [...prices.filter(p => p.participantCount !== entry.participantCount), entry].sort((a,b) => a.participantCount-b.participantCount);
    try {
      const response = await fetch("/api/coaches/group-prices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prices: next }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setPrices(payload.data); setMessage("Tarif total enregistré. Les réservations existantes conservent leur montant.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setBusy(false); }
  }
  return <section className="account-dashboard-card" data-group-prices id="coach-group-prices"><h3>Mes tarifs de groupe</h3><p>Fixez un prix total pour chaque taille de groupe. Il s’applique aux séances collectives proposées en démonstration, sans multiplication du tarif individuel.</p><form onSubmit={save}><label className="auth-field">Nombre de participants<input name="count" type="number" min="2" max="50" defaultValue="2" required /></label><label className="auth-field">Prix total du groupe (EUR)<input name="total" type="number" min="0.01" max="10000" step="0.01" required /></label><button className="auth-primary" disabled={!ready || busy}>{busy ? "Enregistrement…" : "Enregistrer le tarif de groupe"}</button></form>{message ? <p role="status">{message}</p> : null}<ul>{prices.map(p => <li key={p.participantCount}>{p.participantCount} participants : {(p.totalCents/100).toFixed(2)} EUR au total</li>)}</ul></section>;
}
