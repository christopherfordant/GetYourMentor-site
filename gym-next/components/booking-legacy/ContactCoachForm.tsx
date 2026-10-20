"use client";

import { type FormEvent, useRef, useState } from "react";

export function ContactCoachForm({ coach }: { coach: string }) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const inFlight = useRef(false);
  const requestId = useRef("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim() || inFlight.current) return;
    inFlight.current = true;
    requestId.current ||= crypto.randomUUID();
    setError("");
    setSending(true);
    try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientName: coach, body, requestId: requestId.current }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? "Message impossible");
    }
    setSent(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Envoi non confirmé. Réessayez ce message.");
    } finally { inFlight.current = false; setSending(false); }
  }

  return (
    <article className="de-booking-contact-card" data-contact-form>
      <div className="de-booking-contact-heading">
        <span className="de-booking-contact-eyebrow"><span className="de-booking-contact-status-dot" />Échange direct</span>
        <span className="de-booking-contact-secure">Via la messagerie</span>
      </div>
      <div className="de-booking-contact-title-row">
        <div className="de-booking-contact-avatar" aria-hidden="true">{coach.split(" ").map((part) => part[0]).join("").slice(0, 2)}</div>
        <div>
          <h3>Une question pour {coach} ?</h3>
          <p>Écrivez avant de réserver pour valider votre objectif ou un créneau.</p>
        </div>
      </div>
      {sent ? <div className="de-booking-contact-success"><span aria-hidden="true">✓</span><div><strong>Message envoyé</strong><p data-contact-success>Votre message a bien été envoyé.</p><small>Votre demande a bien été transmise à {coach}.</small></div></div> : (
        <form onSubmit={submit}>
          <div className="de-booking-contact-prompts" aria-label="Suggestions de message">
            {[
              "Quel créneau vous conviendrait ?",
              "La séance est-elle adaptée à mon niveau ?",
              "Quel objectif pouvons-nous travailler ?",
            ].map((prompt) => <button key={prompt} type="button" disabled={sending} onClick={() => { setBody(prompt); requestId.current = ""; }}>{prompt}</button>)}
          </div>
          <label className="de-booking-contact-field">
            <span>Votre message</span>
            <textarea value={body} disabled={sending} maxLength={500} onChange={(event) => { setBody(event.target.value); requestId.current = ""; }} placeholder="Posez votre question en quelques mots…" />
          </label>
          <div className="de-booking-contact-form-meta"><span>Réponse selon les disponibilités du coach</span><span>{body.length}/500</span></div>
          <button className="de-booking-contact-submit" type="submit" disabled={!body.trim() || sending}>{sending ? "Envoi en cours…" : "Envoyer le message"}<span aria-hidden="true">↗</span></button>
          {error ? <p className="de-booking-contact-error" role="alert">{error}</p> : null}
        </form>
      )}
    </article>
  );
}
