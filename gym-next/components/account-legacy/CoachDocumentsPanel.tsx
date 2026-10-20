"use client";

import { useState } from "react";

export function CoachDocumentsPanel({ coachId }: { coachId: string }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"identity" | "diploma" | "">("");

  async function upload(kind: "identity" | "diploma", file: File | undefined) {
    if (!file) return;
    setBusy(kind);
    setStatus("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const response = await fetch(`/api/coaches/${encodeURIComponent(coachId)}/documents`, { method: "POST", body: form });
    const payload = await response.json();
    setBusy("");
    setStatus(response.ok ? `${kind === "identity" ? "Identité" : "Diplôme"} transmis pour vérification.` : payload.error ?? "Dépôt impossible");
  }

  return <section className="account-dashboard-card" id="coach-documents" data-coach-documents>
    <h3>Justificatifs de vérification</h3>
    <p>Déposez des fichiers PDF ou image de 5 Mo maximum. Ils restent privés et ne sont visibles que par l’équipe habilitée.</p>
    <div className="account-inline-actions">
      <label className="auth-secondary">Pièce d’identité<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(event) => upload("identity", event.target.files?.[0])} /></label>
      <label className="auth-secondary">Diplôme / certification<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" hidden onChange={(event) => upload("diploma", event.target.files?.[0])} /></label>
    </div>
    {busy ? <p role="status">Envoi en cours...</p> : null}
    {status ? <p role="status">{status}</p> : null}
  </section>;
}
