"use client";

import { useState } from "react";
import { DiscoveryFrame, DiscoveryIntro, DiscoverySteps, discoverySports } from "@/components/discovery/DiscoveryFrame";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";

const cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nice"];

export function RechercheCoachLegacyPage({ sport, city, demo = false }: { sport?: string; city?: string; demo?: boolean }) {
  const initial = discoverySports.find(([slug]) => slug === sport) ?? discoverySports[0];
  const [sportSlug, setSportSlug] = useState<string>(initial[0]);
  const [cityValue, setCityValue] = useState(city || "Paris");
  const label = discoverySports.find(([slug]) => slug === sportSlug)?.[1] ?? initial[1];
  const title = sportSlug === "metiers-de-la-forme" ? "Trouver un coach fitness qui te correspond" : `Trouver un coach de ${label.toLowerCase()} qui te correspond`;

  return <DiscoveryFrame page="search">
    <main className="de-main" data-sport-page data-sport-theme={sportSlug}>
      <section className="de-search-hero" aria-label="Trouver un coach">
        <div>
          <DiscoveryIntro step="01 / TON SPORT, TON TERRAIN" title={title}>Un objectif, une discipline, un lieu. Fais le premier pas vers le coach qui te correspond.</DiscoveryIntro>
          <DiscoverySteps active={0} />
          {demo ? <p><a className="de-search-collective" href={`/seances?${new URLSearchParams({ sport: sportSlug, city: cityValue.trim() })}`}>Explorer les séances collectives</a></p> : null}
        </div>
        <form className="de-search-form" aria-labelledby="de-search-title" aria-describedby="de-search-help" data-sport-search-form onSubmit={event => {
          event.preventDefault();
          window.location.href = buildNextPath(cityValue.trim() ? nextRoutes.directory : nextRoutes.search, { sport: sportSlug, city: cityValue.trim() });
        }}>
          <div><p className="de-eyebrow">TA PROCHAINE SÉANCE</p><h2 id="de-search-title">À toi de choisir le terrain.</h2></div>
          <label>Quelle discipline ?<select aria-label="Quelle discipline ?" data-sport-query value={sportSlug} onChange={event => setSportSlug(event.target.value)}>{discoverySports.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select></label>
          <label>Où veux-tu t’entraîner ?<input data-sport-city value={cityValue} placeholder="Ville" autoComplete="address-level2" onChange={event => setCityValue(event.target.value)} /></label>
          <button className="de-button" type="submit">Explorer les coachs <span aria-hidden="true">↗</span></button>
          <p className="de-note" id="de-search-help">Compare les profils avant de proposer un créneau. La séance reste soumise à l’acceptation du coach.</p>
        </form>
      </section>
      <section className="de-city-section" aria-labelledby="de-cities-title">
        <div className="de-section-heading"><div><p className="de-eyebrow" data-sport-kicker>{label}</p><h2 id="de-cities-title">Ton prochain terrain.<br />Près de chez toi.</h2></div><p>Explore une ville ou précise ton lieu dans la recherche. Les résultats dépendent du catalogue disponible.</p></div>
        <div className="de-city-grid" data-sport-grid>{cities.map((name, i) => <a className="de-city-card" key={name} href={buildNextPath(nextRoutes.directory, { sport: sportSlug, city: name })}><span className="de-city-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span><span><span className="de-note">DÉCOUVRIR</span><h3>{["Paris", "Lyon", "Marseille"].includes(name) ? `Coachs de ${label} - ${name}` : `Coachs de ${label} à ${name}`}</h3></span><span className="de-city-arrow" aria-hidden="true">↗</span></a>)}</div>
      </section>
    </main>
  </DiscoveryFrame>;
}
