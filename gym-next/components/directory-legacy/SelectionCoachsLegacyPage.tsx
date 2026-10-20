"use client";

import { useMemo, useState } from "react";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";
import { DiscoveryFrame, DiscoveryIntro, DiscoverySteps, discoverySports } from "@/components/discovery/DiscoveryFrame";

type SelectionCoachsLegacyPageProps = {
  sport?: string;
  city?: string;
  initialCoaches?: CoachEntry[];
  demo?: boolean;
  catalogUnavailable?: boolean;
};

type CoachEntry = {
  id?: string;
  city?: string;
  name: string;
  address: string;
  meta: string;
  morning: string[];
  afternoon: string[];
  cta: string;
  gender?: "homme" | "femme";
  practice?: "interieur" | "exterieur";
  level?: "debutant" | "intermediaire" | "confirme";
  format?: "presentiel" | "visio";
  availability?: "morning" | "afternoon";
  price?: number;
  rating?: number;
  verified?: boolean;
  distanceKm?: number;
};

type DirectoryFilters = {
  gender: "all" | CoachEntry["gender"];
  practice: "all" | CoachEntry["practice"];
  level: "all" | CoachEntry["level"];
  format: "all" | CoachEntry["format"];
  availability: "all" | NonNullable<CoachEntry["availability"]>;
  budget: "all" | "under-40" | "40-60" | "over-60";
  rating: "all" | "4" | "4.5";
  verified: boolean;
};

type DirectorySort = "relevance" | "rating-desc" | "price-asc" | "price-desc";

const defaultDirectoryFilters: DirectoryFilters = {
  gender: "all",
  practice: "all",
  level: "all",
  format: "all",
  availability: "all",
  budget: "all",
  rating: "all",
  verified: false,
};

const directoryDictionary = {
  football: { name: "Football", getTitle: () => "Trouve ton coach de football" },
  basketball: { name: "Basketball", getTitle: () => "Trouve ton coach de basketball" },
  "metiers-de-la-forme": { name: "Fitness", getTitle: () => "Trouve ton coach fitness" },
  "sports-de-combat": { name: "Sports de combat", getTitle: () => "Trouve ton coach de sports de combat" },
} as const;

const normalize = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const inferSportSlug = (value = "") => {
  const normalized = normalize(value);

  if (normalized.includes("basket")) return "basketball";
  if (normalized.includes("combat") || normalized.includes("boxe") || normalized.includes("mma")) {
    return "sports-de-combat";
  }
  if (
    normalized.includes("forme") ||
    normalized.includes("fitness") ||
    normalized.includes("pilates") ||
    normalized.includes("muscu")
  ) {
    return "metiers-de-la-forme";
  }

  return "football";
};

const navigateToSearch = (sportValue: string, cityValue: string) => {
  const sportSlug = inferSportSlug(sportValue);
  const city = cityValue.trim();

  if (city) {
    window.location.href = buildNextPath(nextRoutes.directory, { sport: sportSlug, city });
    return;
  }

  window.location.href = buildNextPath(nextRoutes.search, { sport: sportSlug });
};


function DirectoryToolbar({
  sportLabel,
  city,
  filters,
  onFiltersChange,
  onLocate,
  isLocating,
  locationStatus,
  radiusKm,
  onRadiusChange,
  sort,
  onSortChange,
}: {
  sportLabel: string;
  city: string;
  filters: DirectoryFilters;
  onFiltersChange: (filters: DirectoryFilters) => void;
  onLocate: () => void;
  isLocating: boolean;
  locationStatus: string;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  sort: DirectorySort;
  onSortChange: (sort: DirectorySort) => void;
}) {
  const [sportInput, setSportInput] = useState(sportLabel);
  const [cityInput, setCityInput] = useState(city);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <section className="de-coach-directory-toolbar">
      <form
        className="de-coach-directory-search"
        aria-label="Recherche coach"
        data-directory-form
        onSubmit={(event) => {
          event.preventDefault();
          navigateToSearch(sportInput, cityInput);
        }}
      >
        <label className="de-directory-field">
          <span>Discipline</span>
          <select
            aria-label="Discipline"
            data-directory-sport-input
            value={sportInput}
            onChange={(event) => setSportInput(event.target.value)}
          >{discoverySports.map(([slug, label]) => <option key={slug} value={label}>{label}</option>)}</select>
        </label>
        <label className="de-directory-field">
          <span>Zone d’entraînement</span>
          <input
            type="text"
            data-directory-city-input
            value={cityInput}
            onChange={(event) => setCityInput(event.target.value)}
          />
        </label>
        <label className="de-directory-field">
          <span>Disponibilités</span>
          <input type="text" value="À préciser dans les filtres" data-directory-availability-input readOnly />
        </label>
        <button className="de-directory-search-button" type="submit" aria-label="Rechercher">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M20 20 15.5 15.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </form>

      <div className="de-directory-chip-row" aria-label="Filtres">
        <button className="de-directory-chip de-directory-chip-secondary" type="button" onClick={onLocate} disabled={isLocating} data-directory-locate>
          {isLocating ? "Recherche…" : "Utiliser ma position"}
        </button>
        <label className="de-directory-chip de-directory-chip-secondary">
          Rayon
          <select value={radiusKm} onChange={(event) => onRadiusChange(Number(event.target.value))} aria-label="Rayon de recherche">
            <option value="1">1 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
          </select>
        </label>
        <button className="de-directory-chip de-directory-chip-filter" type="button" onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} aria-controls="directory-filters">
          Filtres
        </button>
        <label className="de-directory-chip de-directory-chip-secondary">
          Trier par
          <select value={sort} onChange={(event) => onSortChange(event.target.value as DirectorySort)} aria-label="Trier les coachs">
            <option value="relevance">Pertinence</option>
            <option value="rating-desc">Mieux notés</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </label>
      </div>
      {locationStatus ? <p className="de-directory-location-status" role="status" aria-live="polite" data-directory-location-status>{locationStatus}</p> : null}
      {filtersOpen ? (
        <div className="de-directory-filter-panel" id="directory-filters" data-directory-filter-panel>
          <label>
            Genre
            <select aria-label="Genre" value={filters.gender} onChange={(event) => onFiltersChange({ ...filters, gender: event.target.value as DirectoryFilters["gender"] })}>
              <option value="all">Tous</option>
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
            </select>
          </label>
          <label>
            Lieu de pratique
            <select aria-label="Lieu de pratique" value={filters.practice} onChange={(event) => onFiltersChange({ ...filters, practice: event.target.value as DirectoryFilters["practice"] })}>
              <option value="all">Tous</option>
              <option value="interieur">Intérieur</option>
              <option value="exterieur">Extérieur</option>
            </select>
          </label>
          <label>
            Niveau
            <select aria-label="Niveau" value={filters.level} onChange={(event) => onFiltersChange({ ...filters, level: event.target.value as DirectoryFilters["level"] })}>
              <option value="all">Tous</option>
              <option value="debutant">Débutant</option>
              <option value="intermediaire">Intermédiaire</option>
              <option value="confirme">Confirmé</option>
            </select>
          </label>
          <label>
            Format
            <select aria-label="Format" value={filters.format} onChange={(event) => onFiltersChange({ ...filters, format: event.target.value as DirectoryFilters["format"] })}>
              <option value="all">Tous</option>
              <option value="presentiel">Présentiel</option>
              <option value="visio">Visio</option>
            </select>
          </label>
          <label>
            Disponibilité
            <select aria-label="Disponibilité" value={filters.availability} onChange={(event) => onFiltersChange({ ...filters, availability: event.target.value as DirectoryFilters["availability"] })}>
              <option value="all">Toutes</option>
              <option value="morning">Matin</option>
              <option value="afternoon">Après-midi</option>
            </select>
          </label>
          <label>
            Budget
            <select aria-label="Budget" value={filters.budget} onChange={(event) => onFiltersChange({ ...filters, budget: event.target.value as DirectoryFilters["budget"] })}>
              <option value="all">Tous</option>
              <option value="under-40">Moins de 40 €</option>
              <option value="40-60">40 à 60 €</option>
              <option value="over-60">Plus de 60 €</option>
            </select>
          </label>
          <label>
            Note minimale
            <select aria-label="Note minimale" value={filters.rating} onChange={(event) => onFiltersChange({ ...filters, rating: event.target.value as DirectoryFilters["rating"] })}>
              <option value="all">Toutes</option>
              <option value="4">4+</option>
              <option value="4.5">4,5+</option>
            </select>
          </label>
          <label className="de-directory-filter-check">
            <input type="checkbox" checked={filters.verified} onChange={(event) => onFiltersChange({ ...filters, verified: event.target.checked })} />
            Coach vérifié
          </label>
          <button type="button" onClick={() => onFiltersChange(defaultDirectoryFilters)}>Réinitialiser</button>
        </div>
      ) : null}
    </section>
  );
}

function CoachResultCard({
  coach,
  sportSlug,
  city,
  index,
}: {
  coach: CoachEntry;
  sportSlug: string;
  city: string;
  index: number;
}) {
  const detailsLink = buildNextPath(nextRoutes.coach, {
    sport: sportSlug,
    city: coach.city ?? city,
    coach: coach.id ?? coach.name,
  });

  const dayMap = new Map<string, { day: string; periods: string[] }>();

  coach.morning.forEach((slot) => {
    const existing = dayMap.get(slot) || { day: slot, periods: [] };
    existing.periods.push("Matin");
    dayMap.set(slot, existing);
  });

  coach.afternoon.forEach((slot) => {
    const existing = dayMap.get(slot) || { day: slot, periods: [] };
    existing.periods.push("Apres-midi");
    dayMap.set(slot, existing);
  });

  return (
    <article className="de-coach-result-card" data-coach-card>
      <div
        className="de-coach-result-media"
        aria-hidden="true"
      ><span>{coach.name.split(" ").map(part => part[0]).slice(0, 2).join("")}</span><small>{directoryDictionary[sportSlug as keyof typeof directoryDictionary]?.name}</small></div>
      <div className="de-coach-result-body">
        <div className="de-coach-result-top">
          <h2>{coach.name}</h2>
          <div className="de-coach-result-address">{coach.address}</div>
          {coach.distanceKm != null ? <div className="de-coach-result-distance">À {coach.distanceKm.toFixed(1)} km</div> : null}
          <div className="de-coach-result-meta">{coach.meta}</div>
          {coach.price != null ? <p className="de-coach-price" data-coach-price>À partir de <strong>{coach.price} EUR</strong></p> : <p>Tarif à confirmer</p>}
        </div>
        <div className="de-coach-result-slots">
          {!dayMap.size && <p className="de-note">Consulte la fiche pour proposer tes disponibilités.</p>}
          {Array.from(dayMap.values()).map((entry) => (
            <div className="de-coach-day-card" key={`${coach.name}-${entry.day}`}>
              <strong>{entry.day}</strong>
              <div className="de-coach-day-periods">
                {entry.periods.map((period) => (
                  <span className="de-coach-day-period" key={`${entry.day}-${period}`}>
                    {period}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="de-coach-result-footer">
          <a className="de-coach-more-link" href={detailsLink}>
            Plus d'informations
          </a>
          <a className="de-coach-book-button" data-coach-link href={detailsLink}>
            {coach.cta}
          </a>
        </div>
      </div>
    </article>
  );
}

function DirectoryContent({
  sportSlug,
  city,
  coaches,
  filters,
  sort,
  onResetFilters,
}: {
  sportSlug: string;
  city: string;
  coaches: CoachEntry[];
  filters: DirectoryFilters;
  sort: DirectorySort;
  onResetFilters: () => void;
}) {
  const visibleCoaches = [...coaches].filter((coach) => {
    if (filters.gender !== "all" && coach.gender && coach.gender !== filters.gender) return false;
    if (filters.practice !== "all" && coach.practice && coach.practice !== filters.practice) return false;
    if (filters.level !== "all" && coach.level && coach.level !== filters.level) return false;
    if (filters.format !== "all" && coach.format && coach.format !== filters.format) return false;
    if (filters.availability === "morning" && (coach.morning.length > 0 || coach.afternoon.length > 0) && coach.morning.length === 0) return false;
    if (filters.availability === "afternoon" && (coach.morning.length > 0 || coach.afternoon.length > 0) && coach.afternoon.length === 0) return false;
    if (filters.verified && coach.verified === false) return false;
    if (filters.rating !== "all" && coach.rating != null && coach.rating < Number(filters.rating)) return false;
    if (filters.budget === "under-40" && coach.price != null && coach.price >= 40) return false;
    if (filters.budget === "40-60" && coach.price != null && (coach.price < 40 || coach.price > 60)) return false;
    if (filters.budget === "over-60" && coach.price != null && coach.price <= 60) return false;
    return true;
  }).sort((first, second) => {
    if (sort === "rating-desc") return (second.rating ?? 0) - (first.rating ?? 0);
    if (sort === "price-asc") return (first.price ?? Number.POSITIVE_INFINITY) - (second.price ?? Number.POSITIVE_INFINITY);
    if (sort === "price-desc") return (second.price ?? 0) - (first.price ?? 0);
    return (first.distanceKm ?? Number.POSITIVE_INFINITY) - (second.distanceKm ?? Number.POSITIVE_INFINITY);
  });

  return (
    <section className="de-coach-directory-content">
      <div className="de-coach-directory-list">
        <p className="de-results-count" role="status" aria-live="polite">{visibleCoaches.length} profil{visibleCoaches.length > 1 ? "s" : ""} correspondant aux filtres</p>
        <div className="de-coach-results" data-coach-results>
          {visibleCoaches.map((coach, index) => (
            <CoachResultCard
              key={`${coach.name}-${index}`}
              coach={coach}
              sportSlug={sportSlug}
              city={city}
              index={index}
            />
          ))}
          {visibleCoaches.length === 0 ? (
            <div className="de-directory-empty-state" data-directory-empty role="status">
              <span className="de-directory-empty-icon" aria-hidden="true">⌕</span>
              <strong>Aucun coach ne correspond à ces filtres.</strong>
              <p>Élargissez la zone de recherche ou retirez un filtre pour voir davantage de profils.</p>
              <button type="button" onClick={onResetFilters}>Effacer les filtres</button>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="de-coach-directory-map" aria-label="Proximité des coachs">
        <div className="de-coach-map-panel">
          <p className="de-eyebrow">TON PÉRIMÈTRE</p>
          <div className="de-coach-map-summary">
            <strong>Autour de {city || "ta recherche"}</strong>
            <span>{visibleCoaches.length} coach{visibleCoaches.length > 1 ? "s" : ""} correspondant aux filtres</span>
          </div>
          <div className="de-coach-map-distance-list" aria-label="Distances des coachs">
            {visibleCoaches.slice(0, 5).map((coach) => (
              <div className="de-coach-map-distance-row" key={`distance-${coach.name}`}>
                <span>{coach.name}</span>
                <strong>{coach.distanceKm != null ? `${coach.distanceKm.toFixed(1)} km` : "Distance non calculée"}</strong>
              </div>
            ))}
            {visibleCoaches.length === 0 ? <span>Aucun resultat dans ce rayon.</span> : null}
          </div>
          <p className="de-note">La position est demandée uniquement lorsque tu choisis « Utiliser ma position ». Aucun emplacement n’est dessiné arbitrairement.</p>
        </div>
      </aside>
    </section>
  );
}


export function SelectionCoachsLegacyPage({
  sport,
  city,
  initialCoaches,
  demo = false,
  catalogUnavailable = false,
}: SelectionCoachsLegacyPageProps) {
  const sportSlug = useMemo(() => {
    if (sport && Object.hasOwn(directoryDictionary, sport)) {
      return sport as keyof typeof directoryDictionary;
    }

    return "football";
  }, [sport]);

  const currentDirectory = directoryDictionary[sportSlug];
  const cityValue = city || "Paris";
  const [filters, setFilters] = useState<DirectoryFilters>(defaultDirectoryFilters);
  const [radiusKm, setRadiusKm] = useState(10);
  const [sort, setSort] = useState<DirectorySort>("relevance");
  const [locationStatus, setLocationStatus] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locatedCoaches, setLocatedCoaches] = useState<CoachEntry[] | null>(null);
  const coaches = initialCoaches ?? [];
  const visibleCoaches = locatedCoaches ?? coaches;

  const locateSportist = () => {
    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationStatus("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setIsLocating(true);
    setLocationStatus("Recherche des coachs à proximité…");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const query = new URLSearchParams({ sport: sportSlug, latitude: String(coords.latitude), longitude: String(coords.longitude), radiusKm: String(radiusKm) });
        const response = await fetch(`/api/coaches?${query.toString()}`);
        if (!response.ok) throw new Error("Recherche indisponible");
        const payload = await response.json() as { data?: Array<CoachEntry & { specialty?: string; city?: string; priceFrom?: number; reviewCount?: number }> };
        setLocatedCoaches((payload.data ?? []).map((coach) => ({
          ...coach,
          address: coach.city ?? "Zone d’intervention",
          meta: `${coach.rating?.toFixed(1) ?? "0.0"} (${coach.reviewCount ?? 0} avis) · ${coach.specialty ?? "Coach sportif"}`,
          morning: [],
          afternoon: [],
          cta: "Voir le profil",
          price: coach.priceFrom,
        })));
        setLocationStatus(`Résultats dans un rayon de ${radiusKm} km.`);
      } catch {
        setLocationStatus("La recherche géolocalisée est momentanément indisponible.");
      } finally {
        setIsLocating(false);
      }
    }, () => {
      setIsLocating(false);
      setLocationStatus("Autorisez la position pour rechercher les coachs autour de vous.");
    }, { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 });
  };

  return (
    <>
      <DiscoveryFrame page="directory" demo={demo}>
        <main className="de-coach-directory-page" data-coach-directory-page>
          <div className="de-directory-intro"><DiscoveryIntro step="02 / TROUVE TON MENTOR" title={currentDirectory.getTitle()}>Compare les profils de {currentDirectory.name.toLowerCase()} à {cityValue}. Le bon cadre pour ton prochain objectif.</DiscoveryIntro><DiscoverySteps active={1} /></div>
          {demo ? <p><a href={`/seances?${new URLSearchParams({ sport: sportSlug, city: cityValue })}`}>Explorer les séances collectives</a></p> : null}
          {catalogUnavailable && <p className="de-discovery-note" role="status">Le catalogue est momentanément indisponible ou non configuré dans cet environnement. Aucun profil n’est inventé pour remplacer les résultats manquants.</p>}
          <DirectoryToolbar sportLabel={currentDirectory.name} city={cityValue} filters={filters} onFiltersChange={setFilters} onLocate={locateSportist} isLocating={isLocating} locationStatus={locationStatus} radiusKm={radiusKm} onRadiusChange={(radius) => { setRadiusKm(radius); setLocatedCoaches(null); }} sort={sort} onSortChange={setSort} />
          <DirectoryContent
            sportSlug={sportSlug}
            city={cityValue}
            coaches={visibleCoaches}
            filters={filters}
            sort={sort}
            onResetFilters={() => setFilters(defaultDirectoryFilters)}
          />
        </main>
      </DiscoveryFrame>
    </>
  );
}
