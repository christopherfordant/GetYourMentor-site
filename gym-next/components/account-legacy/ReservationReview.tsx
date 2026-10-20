"use client";
import { useState } from "react";
import type { Reservation } from "@/lib/domain";
import { canReviewReservation } from "@/lib/domain/review-rules";

export function ReservationReview({ reservation, reviewed, ready, onCreated }: { reservation: Reservation; reviewed: boolean; ready: boolean; onCreated: () => void }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (reviewed) return <p>Votre avis pour cette séance a été enregistré.</p>;
  if (!canReviewReservation(reservation)) return <p>Vous pourrez donner votre avis après la fin prévue de cette séance payée.</p>;
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage(""); const values = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reservationId: reservation.id, rating: Number(values.get("rating")), comment: values.get("comment") }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Avis impossible.");
      onCreated();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Avis impossible."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={publish} aria-label={`Donner mon avis sur ${reservation.service}`}>
    <p>Votre note et votre commentaire seront visibles sur la fiche du coach, sans votre adresse email. Ne partagez aucune information personnelle ou médicale.</p>
    <label className="auth-field">Note sur 5<select name="rating" defaultValue="5" required disabled={busy || !ready}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>
    <label className="auth-field">Votre avis<textarea name="comment" maxLength={2000} rows={3} required disabled={busy || !ready} /></label>
    <button className="auth-primary" type="submit" disabled={busy || !ready}>{busy ? "Publication…" : "Publier mon avis"}</button>
    {!ready ? <p>Vérification de vos avis indisponible ou en cours. Actualisez votre compte pour réessayer.</p> : null}
    {message ? <p role="alert">{message}</p> : null}
  </form>;
}
