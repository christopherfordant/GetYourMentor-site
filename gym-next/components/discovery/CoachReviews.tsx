"use client";
import { useEffect, useState } from "react";

type Review = { id: string; rating: number; comment: string; createdAt: string };
export function CoachReviews({ coachId }: { coachId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(false);
    fetch(`/api/reviews?coachId=${encodeURIComponent(coachId)}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(payload => { if (!Array.isArray(payload.data)) throw new Error(); setReviews(payload.data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [coachId, attempt]);
  return <section className="de-booking-story-card" data-coach-reviews>
    <h2>Les avis des séances</h2><p>Retours enregistrés dans cette démonstration. Aucune séance réelle ou certification n’est attestée.</p>
    {loading ? <p role="status">Chargement des avis…</p> : error ? <p role="alert">Avis indisponibles. <button type="button" onClick={() => setAttempt(value => value + 1)}>Réessayer les avis</button></p> : !reviews.length ? <p>Pas encore d’avis enregistré.</p> : reviews.map(review => <article key={review.id}><h3>Note : {review.rating} / 5</h3><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{review.comment}</p><time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</time></article>)}
  </section>;
}
