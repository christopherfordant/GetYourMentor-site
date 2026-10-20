"use client";

import { useState } from "react";

export function PhoneVerificationPanel() {
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [status, setStatus] = useState("");

  async function requestCode() {
    setStatus("");
    const response = await fetch("/api/auth/phone/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error ?? "Envoi impossible"); return; }
    setPending(true);
    setStatus("Code envoyé. Consultez votre téléphone.");
  }

  async function verifyCode() {
    setStatus("");
    const response = await fetch("/api/auth/phone/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, token }) });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error ?? "Vérification impossible"); return; }
    setVerified(true);
    setStatus("Numéro vérifié.");
  }

  return <section className="account-dashboard-card" data-phone-verification>
    <h3>Téléphone</h3>
    <p>Vérifiez votre numéro pour sécuriser votre compte et votre profil coach.</p>
    <div className="account-inline-actions">
      <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+33612345678" disabled={verified} />
      {!verified ? <button type="button" className="auth-secondary" onClick={requestCode} disabled={!phone || pending}>Envoyer le code</button> : null}
    </div>
    {pending && !verified ? <div className="account-inline-actions"><input inputMode="numeric" maxLength={6} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))} placeholder="Code à 6 chiffres" /><button type="button" className="auth-primary" onClick={verifyCode} disabled={token.length !== 6}>Vérifier</button></div> : null}
    {status ? <p role="status">{status}</p> : null}
  </section>;
}
