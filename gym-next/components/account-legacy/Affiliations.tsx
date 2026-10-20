"use client";
import { useCallback, useEffect, useState } from "react";
import type { Affiliation } from "@/lib/affiliations";
import styles from "@/components/group-booking.module.css";

type Row = Affiliation & { coachName: string };
export function Affiliations({ role, onActiveChange }: { role: "club" | "coach"; onActiveChange?: (contacts: Array<{ value: string; label: string }>) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [candidates, setCandidates] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const res = await fetch("/api/affiliations", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Affiliations indisponibles");
    if (!Array.isArray(body.data)) throw new Error("Affiliations indisponibles");
    setRows(body.data); setCandidates(body.candidates); setLoaded(true);
    onActiveChange?.((body.data as Row[]).filter(row => row.status === "accepted" && row.coachConsent && row.structureConsent).map(row => ({ value: role === "club" ? row.coachId : row.structureEmail, label: role === "club" ? row.coachName : row.structureEmail })));
  }, [role, onActiveChange]);
  useEffect(() => { void load().catch(e => setMessage(e.message)); }, [load]);
  async function save(method: "POST" | "PATCH", body: object) {
    setBusy(true); setMessage("");
    try {
      const res = await fetch("/api/affiliations", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json(); if (!res.ok) throw new Error(payload.error);
      await load(); window.dispatchEvent(new Event("gym-affiliations-updated"));
      setMessage(method === "POST" ? "Demande enregistrée. L’affiliation exige l’accord des deux parties ; consultez son état ci-dessous." : "Votre réponse est enregistrée.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action impossible"); }
    finally { setBusy(false); }
  }
  return <section className={`account-dashboard-card ${styles.card}`} id="affiliations" data-affiliations>
    <h2>{role === "club" ? "Mes coachs affiliés" : "Mes structures affiliées"}</h2>
    <p>Vous pouvez demander une affiliation. L’envoi exprime votre accord ; l’autre partie doit accepter pour l’activer.</p>
    <p>L’affiliation ne remplace pas la validation du profil coach. Mode démonstration : aucun message externe ni abonnement activé.</p>
    <form className={styles.fields} onSubmit={e => { e.preventDefault(); const data = new FormData(e.currentTarget); void save("POST", role === "club" ? { coachId: data.get("coachId") } : { structureEmail: data.get("structureEmail") }); }}>
      {role === "club" ? <label className="auth-field">Coach à inviter<select name="coachId" required disabled={!loaded || busy}><option value="">Choisir un coach</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        : <label className="auth-field">Email du compte structure<input name="structureEmail" type="email" maxLength={254} required autoComplete="off" /></label>}
      <button className="auth-primary" type="submit" disabled={busy || !loaded}>Demander une affiliation</button>
    </form>
    <p role="status">{message}</p>
    <button className="auth-secondary" type="button" disabled={busy} onClick={() => { setMessage(""); void load().catch(e => setMessage(e.message)); }}>Actualiser les affiliations</button>
    {loaded && !rows.length ? <p>Aucune affiliation pour le moment.</p> : null}
    {rows.map(row => <article key={row.id} data-affiliation={row.id} className={styles.note}>
      <h3>{role === "club" ? row.coachName : row.structureEmail}</h3>
      <p>{row.status === "accepted" ? "Active — accord des deux parties" : row.status === "rejected" ? "Refusée — affiliation inactive" : row.requestedBy === role ? "En attente de l’accord du destinataire" : "Demande reçue — votre accord est nécessaire"}</p>
      {row.fixture ? <p>Association de recette historique, simulée pour la démo.</p> : null}
      {row.status === "pending" && row.requestedBy !== role ? <div className={styles.fields}>
        <button className="auth-primary" type="button" disabled={busy} onClick={() => void save("PATCH", { id: row.id, action: "accept" })}>Accepter l’affiliation</button>
        <button className="auth-secondary" type="button" disabled={busy} onClick={() => void save("PATCH", { id: row.id, action: "reject" })}>Refuser l’affiliation</button>
      </div> : null}
    </article>)}
  </section>;
}
