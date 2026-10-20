"use client";
import { StructureOffers } from "@/components/StructureOffers";
import { CoachReviews } from "@/components/discovery/CoachReviews";

import type { RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";
import { DiscoveryFrame } from "@/components/discovery/DiscoveryFrame";
import { CoachDetails } from "@/components/discovery/CoachDetails";
import { coachProfiles, type CoachProfile } from "@/lib/domain";

type ReserverSeanceLegacyPageProps = {
  params: Record<string, string | undefined>;
  allowDemoFallback?: boolean;
};

type WeekDay = {
  day: string;
  date: string;
  slots: string[];
};

const bookingProfileDictionary = { football: true, basketball: true, "metiers-de-la-forme": true, "sports-de-combat": true } as const;

type BookingProfile = {
  ratingValue?: string;
  priceFrom?: number;
  followers: string;
  specialty: string;
  bio: string;
  reviews: string;
  qualification: string;
  diploma: string;
  disciplines?: string;
  sessionTypes?: string;
  availability?: string;
};

const bookingVisualDictionary = {
  football: {
    hero:
      'linear-gradient(180deg, rgba(14, 18, 28, 0.14), rgba(14, 18, 28, 0.10)), url("/images/demo-sport.svg") center 18% / cover no-repeat',
  },
  basketball: {
    hero:
      'linear-gradient(180deg, rgba(14, 18, 28, 0.14), rgba(14, 18, 28, 0.10)), url("/images/demo-sport.svg") center 14% / cover no-repeat',
  },
  "metiers-de-la-forme": {
    hero:
      'linear-gradient(180deg, rgba(14, 18, 28, 0.12), rgba(14, 18, 28, 0.08)), url("/images/demo-sport.svg") center 10% / cover no-repeat',
  },
  "sports-de-combat": {
    hero:
      'linear-gradient(180deg, rgba(14, 18, 28, 0.14), rgba(14, 18, 28, 0.10)), url("/images/demo-sport.svg") center 18% / cover no-repeat',
  },
} as const;

const weekSets: WeekDay[][] = [
  [
    { day: "jeudi", date: "26 mars", slots: ["10:00", "11:00", "11:30", "12:00", "13:30"] },
    { day: "vendredi", date: "27 mars", slots: ["10:00", "10:30", "11:00", "13:30", "14:00"] },
    { day: "samedi", date: "28 mars", slots: ["10:00", "17:30", "18:00"] },
    { day: "dimanche", date: "29 mars", slots: [] },
    { day: "lundi", date: "30 mars", slots: [] },
    { day: "mardi", date: "31 mars", slots: ["10:00", "10:30", "11:00", "11:30", "12:00"] },
    { day: "mercredi", date: "01 avr.", slots: ["10:00", "10:30", "11:00", "11:30", "12:00"] },
  ],
  [
    { day: "jeudi", date: "02 avr.", slots: ["09:30", "10:30", "11:30", "12:30"] },
    { day: "vendredi", date: "03 avr.", slots: ["10:00", "11:00", "16:00"] },
    { day: "samedi", date: "04 avr.", slots: ["09:00", "10:00", "11:00"] },
    { day: "dimanche", date: "05 avr.", slots: ["09:30", "10:30"] },
    { day: "lundi", date: "06 avr.", slots: [] },
    { day: "mardi", date: "07 avr.", slots: ["10:00", "12:00", "14:00"] },
    { day: "mercredi", date: "08 avr.", slots: ["09:30", "10:30", "11:30"] },
  ],
];


function BookingScorePanel({
  profile,
}: {
  profile: BookingProfile;
}) {
  return (
    <section className="de-booking-score-panel de-booking-score-panel-side">
      <p className="de-booking-score-label">Note :</p>
      <div className="de-booking-score-display" data-booking-score-large>
        {profile.ratingValue ?? "Pas encore de note"}
      </div>
      <p className="de-booking-score-meta" data-booking-score-copy>
        {profile.reviews}
      </p>
      <p className="de-booking-score-breakdown">Note du catalogue ; sous-notes non disponibles.</p>
      <div className="de-booking-score-facts">
        <div className="de-booking-score-fact">
          <span>Activité</span>
          <strong data-booking-score-followers>{profile.followers}</strong>
        </div>
        <div className="de-booking-score-fact">
          <span>Qualification</span>
          <strong data-booking-qualification>{profile.qualification}</strong>
        </div>
        <div className="de-booking-score-fact">
          <span>Diplome</span>
          <strong data-booking-diploma>{profile.diploma}</strong>
        </div>
      </div>
    </section>
  );
}

function BookingHeroSection({
  coach,
  city,
  profile,
  heroBackground,
  activeTab,
  onTabChange,
  galleryMainRef,
}: {
  coach: string;
  city: string;
  profile: BookingProfile;
  heroBackground: string;
  activeTab: "apropos" | "planning" | "contenus";
  onTabChange: (value: "apropos" | "planning" | "contenus") => void;
  galleryMainRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <section className="de-booking-profile-hero">
      <div className="de-booking-profile-top">
        <p className="de-eyebrow">03 / TON COACH, TA PROCHAINE SÉANCE</p>
        <div className="de-booking-title-wrap">
          <h1 data-booking-name>{coach}</h1>
        </div>

        <p data-booking-price>À partir de {profile.priceFrom} EUR</p>
        <div className="de-booking-profile-meta" data-booking-geo-hover>
          <div className="de-booking-address" data-booking-address>{city}</div>
        </div>
      </div>

      <div className="de-booking-profile-showcase">
        <div className="de-booking-profile-showcase-grid">
          <div className="de-booking-gallery de-booking-gallery-profile">
            <div
              ref={galleryMainRef}
              className="de-booking-gallery-main"
              data-booking-gallery-main
              style={{ background: heroBackground }}
            ></div>
            <span className="de-booking-gallery-caption">Visuel d’illustration, sans identification du coach.</span>
          </div>

          <aside className="de-booking-profile-score-wrap">
            <BookingScorePanel profile={profile} />
          </aside>
        </div>
      </div>

      <div className="de-booking-profile-lead">
        <div>
          <strong data-booking-heading>{`Construis ta prochaine session avec ${coach}`}</strong>
          <p>Choisis ton objectif, propose tes disponibilités et reçois la validation du coach.</p>
        </div>
        <button className="de-booking-primary-action" type="button" onClick={() => onTabChange("planning")}>
          Réserver
        </button>
      </div>

      <nav
        className="de-booking-tabs de-booking-tabs-profile"
        aria-label="Sections du profil"
      >
        <button
          className={`de-booking-tab${activeTab === "apropos" ? " is-active" : ""}`}
          type="button"
          data-booking-tab="apropos" aria-pressed={activeTab === "apropos"} aria-controls="booking-apropos-section"
          onClick={() => onTabChange("apropos")}
        >
          A propos
        </button>
        <button
          className={`de-booking-tab${activeTab === "planning" ? " is-active" : ""}`}
          type="button"
          data-booking-tab="planning" aria-pressed={activeTab === "planning"} aria-controls="booking-planning-section"
          onClick={() => onTabChange("planning")}
        >
          Planning
        </button>
        <button
          className={`de-booking-tab${activeTab === "contenus" ? " is-active" : ""}`}
          type="button"
          data-booking-tab="contenus" aria-pressed={activeTab === "contenus"} aria-controls="booking-contenus-section"
          onClick={() => onTabChange("contenus")}
        >
          Contenus
        </button>
      </nav>
      <div className="de-booking-tabs-spacer" data-booking-tabs-spacer aria-hidden="true"></div>
    </section>
  );
}

function BookingPlanningPane({
  isActive,
  weekIndex,
  selectedSlot,
  confirmHref,
  onPrevWeek,
  onNextWeek,
  onSelectSlot,
}: {
  isActive: boolean;
  weekIndex: number;
  selectedSlot: string;
  confirmHref: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectSlot: (slot: string) => void;
}) {
  const currentWeek = weekSets[weekIndex];

  return (
    <section className={`de-booking-pane${isActive ? " is-active" : ""}`} hidden={!isActive} data-booking-pane="planning" id="booking-planning-section">
      <div className="de-booking-planning-shell">
        <p className="de-discovery-note">Planning indicatif de présentation. Les créneaux, la durée et le prix de la prestation sont vérifiés à l’étape de réservation. Toute demande reste soumise à l’acceptation du coach.</p>
        <header className="de-booking-section-head de-booking-section-head-planning">
          <h2>Date et heure</h2>
          <p>Explore cet aperçu indicatif, puis choisis un créneau vérifié à l’étape suivante.</p>
        </header>

        <div className="de-reservation-calendar-card de-booking-calendar-card">
          <div className="de-reservation-calendar-head">
            <button className="de-calendar-arrow" type="button" aria-label="Semaine precedente" data-booking-calendar-prev onClick={onPrevWeek}>
              ‹
            </button>
            <strong data-booking-days aria-live="polite">Exemple · {currentWeek[0].date} – {currentWeek[6].date}</strong>
            <button className="de-calendar-arrow" type="button" aria-label="Semaine suivante" data-booking-calendar-next onClick={onNextWeek}>
              ›
            </button>
          </div>
          <div className="de-reservation-slots-grid" data-booking-slots-grid>
            {currentWeek.map((item) => (
              <div className="de-reservation-slot-column" key={`${item.day}-${item.date}-slots`}>
                <div className="de-reservation-day"><strong>{item.day}</strong><span>{item.date}</span></div>
                {item.slots.length ? (
                  item.slots.map((slot) => (
                    <button
                      key={`${item.day}-${slot}`}
                      className={`de-reservation-slot${slot === selectedSlot ? " is-selected" : ""}`}
                      type="button"
                      data-booking-slot={slot}
                      aria-pressed={slot === selectedSlot}
                      onClick={() => onSelectSlot(slot)}
                    >
                      {slot}
                    </button>
                  ))
                ) : (
                  <button className="de-reservation-slot" type="button" disabled>
                    -
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="de-reservation-cta-row de-booking-cta-row">
          <a className="de-reservation-confirm-button" href={confirmHref} data-booking-confirm>
            Reserver mon creneau
          </a>
        </div>
      </div>
    </section>
  );
}

function BookingContenusPane({
  allowDemoPreview,
  isActive,
  coach,
  specialty,
}: {
  allowDemoPreview: boolean;
  isActive: boolean;
  coach: string;
  specialty: string;
}) {
  const [unlocked, setUnlocked] = useState(false);

  return (
    <section className={`de-booking-pane${isActive ? " is-active" : ""}`} hidden={!isActive} data-booking-pane="contenus" id="booking-contenus-section">
      <section className="de-booking-content-social" data-content-lock-root>
        <div className="de-booking-content-profile">
          <div className="de-booking-content-cover"></div>
          <div className="de-booking-content-avatar"></div>
          <div className="de-booking-content-profile-copy">
            <strong data-content-coach-name>{coach}</strong>
            <span data-content-specialty>{specialty}</span>
          </div>
          <button
            className="de-booking-content-subscribe"
            type="button"
            data-content-unlock
            onClick={() => setUnlocked(true)}
            disabled={!allowDemoPreview || unlocked}
          >
            {unlocked ? "Prévisualisation de démo" : allowDemoPreview ? "Prévisualiser les contenus (simulation)" : "Fonction à venir"}
          </button>
        </div>

        <div className="de-booking-content-lock-note" data-content-lock-note>
          Aperçu de contenus en préparation. Aucun abonnement actif, aucun avantage Premium et aucun paiement déclenché.
        </div>

        <div className={`de-booking-content-feed ${unlocked ? "is-unlocked" : "is-locked"}`} data-content-feed>
          <article className="de-booking-content-tile de-booking-content-tile-1">
            <span className="de-booking-content-lock">Verrouille</span>
          </article>
          <article className="de-booking-content-tile de-booking-content-tile-2">
            <span className="de-booking-content-lock">Verrouille</span>
          </article>
          <article className="de-booking-content-tile de-booking-content-tile-3">
            <span className="de-booking-content-lock">Verrouille</span>
          </article>
          <article className="de-booking-content-tile de-booking-content-tile-4">
            <span className="de-booking-content-lock">Verrouille</span>
          </article>
          <article className="de-booking-content-tile de-booking-content-tile-5">
            <span className="de-booking-content-lock">Verrouille</span>
          </article>
          <article className="de-booking-content-tile de-booking-content-tile-6">
            <span className="de-booking-content-lock">Verrouille</span>
          </article>
        </div>
      </section>
    </section>
  );
}


export function ReserverSeanceLegacyPage({ params, allowDemoFallback = false }: ReserverSeanceLegacyPageProps) {
  const sportSlug = useMemo(() => {
    const sport = params.sport;
    if (sport && Object.hasOwn(bookingProfileDictionary, sport)) {
      return sport as keyof typeof bookingProfileDictionary;
    }
    return "metiers-de-la-forme";
  }, [params.sport]);

  const coach = params.coach || "Studio Démo";
  const city = params.city || "Paris";
  const [coachData, setCoachData] = useState<CoachProfile | null>(() => allowDemoFallback ? coachProfiles.find(item => item.id === coach || item.name.toLowerCase() === coach.toLowerCase()) ?? null : null);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "error">(() => coachData ? "ready" : "loading");
  useEffect(() => {
    let active = true;
    fetch(`/api/coaches/${encodeURIComponent(coach)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Profil indisponible"))))
      .then((payload) => {
        if (!payload.data || !(payload.data.id === coach || payload.data.name?.toLowerCase() === coach.toLowerCase())) throw new Error("Profil indisponible");
        if (active) { setCoachData(payload.data as CoachProfile); setProfileState("ready"); }
      })
      .catch(() => { if (active) setProfileState("error"); });
    return () => {
      active = false;
    };
  }, [coach]);
  const profile = {
    followers: "Activité non publiée",
    qualification: coachData?.verified ? "Profil vérifié" : "Vérification à confirmer",
    reviews: coachData?.reviewCount ? `${coachData.reviewCount} avis` : "Pas encore d’avis",
    ratingValue: coachData?.reviewCount ? `${coachData.rating.toFixed(1)} / 5` : "Pas encore de note",
    priceFrom: coachData?.priceFrom,
    specialty: coachData?.specialty ?? "",
    bio: coachData?.description ?? "",
    diploma: coachData?.diplomas?.replace(/\s+—\s+à compléter$/i, "") ?? "",
    disciplines: coachData?.disciplines ?? "",
    sessionTypes: coachData?.sessionTypes ?? "",
    availability: coachData?.availability ?? "",
  };
  const coachLabel = coachData?.name ?? coach;
  const coachCity = coachData?.city ?? city;
  const resolvedSport = coachData?.sport === "fitness" ? "metiers-de-la-forme" : coachData?.sport ?? sportSlug;
  const visual = bookingVisualDictionary[resolvedSport];
  const [selectedSlot, setSelectedSlot] = useState(params.slot || weekSets[0][0].slots[0] || "10:00");
  const confirmHref = useMemo(
    () =>
      buildNextPath(nextRoutes.slot, {
        sport: resolvedSport,
        city: coachCity,
        coach: coachData?.id ?? coach,
        service: coachData?.specialty ?? "Coaching",
        duration: "45min",
        price: String(coachData?.priceFrom ?? ""),
        slot: selectedSlot,
        mentor: coach,
      }),
    [resolvedSport, coachCity, coach, coachData, selectedSlot],
  );
  const [activeTab, setActiveTab] = useState<"apropos" | "planning" | "contenus">("apropos");
  const [weekIndex, setWeekIndex] = useState(0);
  const galleryMainRef = useRef<HTMLDivElement | null>(null);
  const hasMountedRef = useRef(false);


  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const targets = {
      apropos: "booking-apropos-section",
      planning: "booking-planning-section",
      contenus: "booking-contenus-section",
    } as const;

    const target = document.getElementById(targets[activeTab]);
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [activeTab]);

  return (
    <>
      <DiscoveryFrame page="profile" demo={allowDemoFallback}>
        <main className="de-booking-page de-booking-profile-page" data-booking-page>
          {!coachData ? (
            <section className="de-booking-card" data-coach-unavailable role="status" aria-busy={profileState === "loading"}>
              <h1>{profileState === "loading" ? "Chargement du profil…" : "Profil coach indisponible"}</h1>
              <p>{profileState === "loading" ? "Nous récupérons les informations du catalogue." : "Ce profil est introuvable ou le catalogue est momentanément indisponible."}</p>
              {profileState === "error" && <a className="de-button" href={buildNextPath(nextRoutes.directory, { sport: sportSlug, city })}>Revenir aux coachs</a>}
            </section>
          ) : (
            <>
              <BookingHeroSection
                coach={coachLabel}
                city={coachCity}
                profile={profile}
                heroBackground={visual.hero}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                galleryMainRef={galleryMainRef}
              />
              <CoachDetails coach={coachLabel} profile={profile} isActive={activeTab === "apropos"} />
              <BookingPlanningPane
                isActive={activeTab === "planning"}
                weekIndex={weekIndex}
                selectedSlot={selectedSlot}
                confirmHref={confirmHref}
                onPrevWeek={() => setWeekIndex((current) => (current === 0 ? weekSets.length - 1 : current - 1))}
                onNextWeek={() => setWeekIndex((current) => (current + 1) % weekSets.length)}
                onSelectSlot={setSelectedSlot}
              />
              <BookingContenusPane allowDemoPreview={allowDemoFallback} isActive={activeTab === "contenus"} coach={coachLabel} specialty={profile.specialty} />
              {allowDemoFallback && coachData ? <section id="collective-sessions"><h2>Séances collectives de ce coach</h2><p>Choisissez votre groupe et consultez le prix total. Paiements simulés en démonstration.</p><StructureOffers coachId={coachData.id} /></section> : null}
              {allowDemoFallback && coachData ? <CoachReviews coachId={coachData.id} /> : null}
            </>
          )}
        </main>
      </DiscoveryFrame>
    </>
  );
}
