"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CoachProfile } from "@/lib/domain";

export function DiscoveryCoachPreview() {
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [status, setStatus] = useState("Chargement des profils disponibles…");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/coaches", { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(payload => { setCoaches((payload.data ?? []).slice(0, 6)); setStatus("Les tarifs et profils proviennent du catalogue disponible."); })
      .catch(() => { if (!controller.signal.aborted) setStatus("Le catalogue est momentanément indisponible. Réessaie depuis la recherche."); });
    return () => controller.abort();
  }, []);
  return <section data-gym-ui="section" aria-labelledby="discovery-coaches-title">
    <p data-gym-ui="sectionKicker">Les mentors</p>
    <h2 id="discovery-coaches-title">Des coachs à découvrir</h2>
    <p role="status">{status}</p>
    <div className="discovery-coach-grid">
      {coaches.map(coach => <article key={coach.id} className="discovery-coach-card" data-discovery-coach={coach.id}>
        <h3>{coach.name}</h3>
        <p>{coach.specialty} · {coach.city}</p>
        <p>{coach.reviewCount > 0 ? `${coach.rating.toFixed(1)} / 5 · ${coach.reviewCount} avis` : "Pas encore d’avis"}</p>
        <p>À partir de <strong>{coach.priceFrom} EUR</strong></p>
        <Link href={`/coach?${new URLSearchParams({ coach: coach.id, sport: coach.sport === "fitness" ? "metiers-de-la-forme" : coach.sport, city: coach.city })}`}>Voir le profil</Link>
      </article>)}
    </div>
    <Link href="/coachs">Explorer tous les coachs</Link>
  </section>;
}
