"use client";

import Image from "next/image";
import { SiteFooter } from "@/components/SiteFooter";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import styles from "./home-refined.module.css";
const HomeFaqSection = dynamic(
  () => import("./HomeFaqSection").then((module) => module.HomeFaqSection),
  { ssr: false, loading: () => <div aria-hidden="true" className="home-deferred-placeholder home-deferred-placeholder-faq" /> },
);
const HomeBelowFoldSections = dynamic(
  () => import("./HomeBelowFoldSections").then((module) => module.HomeBelowFoldSections),
  { ssr: false, loading: () => <div aria-hidden="true" className="home-deferred-placeholder home-deferred-placeholder-sections" /> },
);
import {
  metrics,
  paymentSlides,
  profileSlides,
  slotSlides,
  sportLinks,
  type SportSlug,
} from "./home-data";

const normalize = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const inferSportSlug = (value = ""): SportSlug => {
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

const sportVisuals: Record<SportSlug, string> = {
  football: "/images/demo-sport.svg",
  basketball: "/images/demo-sport.svg",
  "metiers-de-la-forme": "/images/demo-sport.svg",
  "sports-de-combat": "/images/demo-sport.svg",
};

const experienceSlides = [
  { title: "Séances en extérieur", copy: "Entraîne-toi au grand air avec un plan sur-mesure.", image: sportVisuals.football },
  { title: "Stratégie de jeu", copy: "Analyse, placements et prise de décision pour passer un cap.", image: sportVisuals["metiers-de-la-forme"] },
  { title: "Préparation physique", copy: "Un plan progressif pour gagner en force, mobilité et confiance.", image: sportVisuals["metiers-de-la-forme"] },
  { title: "Préparation mentale", copy: "Concentration, régularité et confiance dans chaque séance.", image: sportVisuals["sports-de-combat"] },
];

const experienceGalleries = [
  [sportVisuals.basketball, sportVisuals["metiers-de-la-forme"]],
  [sportVisuals.football, sportVisuals["sports-de-combat"]],
  [sportVisuals.basketball, sportVisuals.football],
  [sportVisuals["metiers-de-la-forme"], sportVisuals.basketball],
];

function StepDots({ count, activeIndex }: { count: number; activeIndex: number }) {
  return (
    <div className={styles.dots} data-gym-ui="dots" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className={index === activeIndex ? styles.dotActive : styles.dot} />
      ))}
    </div>
  );
}

function JourneyIcon({ type }: { type: "users" | "calendar" | "check" | "trend" }) {
  const common = { width: 36, height: 36, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (type === "users") return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></svg>;
  if (type === "calendar") return <svg {...common}><path d="M8 2v4M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /></svg>;
  if (type === "check") return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>;
  return <svg {...common}><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></svg>;
}

export function HomePageClient({ allowDemoFallback = false }: { allowDemoFallback?: boolean }) {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [sportInput, setSportInput] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [profileIndex, setProfileIndex] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);
  const [paymentIndex, setPaymentIndex] = useState(0);
  const [journeyIndex, setJourneyIndex] = useState(0);
  const [experienceIndex, setExperienceIndex] = useState(0);
  const journeyViewportRef = useRef<HTMLDivElement>(null);
  const journeyTrackRef = useRef<HTMLDivElement>(null);

  const goToJourney = (index: number) => {
    const next = Math.max(0, Math.min(3, index));
    setJourneyIndex(next);
    const track = journeyTrackRef.current;
    const slide = track?.querySelectorAll<HTMLElement>("[data-journey-slide]")[next];
    if (track && slide) track.scrollTo({ left: slide.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  const goToExperience = (index: number) => {
    setExperienceIndex((index + experienceSlides.length) % experienceSlides.length);
  };

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY >= 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeProfile = profileSlides[profileIndex];
  const activeSlot = slotSlides[slotIndex];
  const activePayment = paymentSlides[paymentIndex];
  const experiencePreviousIndex = (experienceIndex + experienceSlides.length - 1) % experienceSlides.length;
  const experienceNextIndex = (experienceIndex + 1) % experienceSlides.length;
  const displayedProfile = allowDemoFallback ? activeProfile : {
    ...activeProfile,
    name: "Coach vérifié",
    meta: "Profil réel après recherche",
    detail: "Compare les disponibilités, le format et les informations du coach.",
    price: "Tarif affiché sur le profil",
    cta: "Explorer les coachs",
  };
  const displayedPayment = allowDemoFallback ? activePayment : {
    ...activePayment,
    title: "Session à confirmer",
    date: "Après validation du coach",
    detail: "Paiement sécurisé après acceptation",
    total: "Selon le coach",
  };

  const searchTarget = useMemo(() => {
    const sport = inferSportSlug(sportInput || activeProfile.meta);
    const city = cityInput.trim();
    return city ? `/recherche?sport=${sport}&city=${encodeURIComponent(city)}` : `/recherche?sport=${sport}`;
  }, [activeProfile.meta, cityInput, sportInput]);

  const handleSearch = () => {
    router.push(searchTarget);
  };

  return (
    <div className={styles.page} data-gym-ui="page" id="gym-discovery" data-gym-discovery="home">
      <header data-gsap-header className={`${styles.topbar} ${isScrolled ? styles.topbarScrolled : ""}`} data-gym-ui="topbar">
        <div className={styles.brandLockup} data-gym-ui="brandLockup">
          <Link href="/" className={styles.brandName} data-gym-ui="brandName" data-gsap-header-item>
            <span className={styles.brandIcon} data-gym-ui="brandIcon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M8.5 12h7M5 8.5v7M3 10.5v3M7 6.5v11M19 8.5v7M21 10.5v3M17 6.5v11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            GetYour<span className={styles.brandAccent} data-gym-ui="brandAccent">Mentor</span>
          </Link>
        </div>

        <nav className={styles.sportsNav} data-gym-ui="sportsNav" aria-label="Sports">
          {sportLinks.map((sport) => (
              <Link key={sport.slug} href={`/recherche?sport=${sport.slug}`} className={styles.sportLink} data-gym-ui="sportLink" data-gsap-header-item data-sport-tab={sport.slug}>
              {sport.label}
            </Link>
          ))}
        </nav>

        <div className={styles.topbarActions} data-gym-ui="topbarActions">
          <LanguageSelector />
          <Link href="/compte?mode=coach" className={styles.topbarLink} data-gym-ui="topbarLink" data-gsap-header-item>
            Je suis coach
          </Link>
          <Link href="/compte" className={styles.accountButton} data-gym-ui="accountButton" data-gsap-header-item>
            <span className={styles.accountIcon} data-gym-ui="accountIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M5 19c1.4-3 4-4.5 7-4.5s5.6 1.5 7 4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>Mon compte</span>
          </Link>
        </div>
      </header>

      <main className={styles.main} data-gym-ui="main">
        <section className={styles.hero} data-gym-ui="hero" data-gsap-hero>
          <div className={styles.heroBackdrop} data-gym-ui="heroBackdrop">
            <Image
              src="/images/demo-sport.svg"
              alt="Athlète en pleine action sportive"
                fill
                priority
                sizes="100vw"
              quality={65}
              className={styles.heroImage} data-gym-ui="heroImage"
            />
          </div>
          <div className={styles.heroOverlay} data-gym-ui="heroOverlay" />
          <div className={styles.heroContent} data-gym-ui="heroContent" data-gsap-hero-content>
            <p className={styles.eyebrow} data-gym-ui="eyebrow" data-gsap-hero-item>Ton prochain objectif commence ici</p>
            <h1 className={styles.heroTitle} data-gym-ui="heroTitle" data-gsap-hero-item><span>Trouve ton coach.</span> <span className={styles.heroAccent} data-gym-ui="heroAccent">Progresse vraiment.</span></h1>
            <p className={styles.heroCopy} data-gym-ui="heroCopy" data-gsap-hero-item>Des coachs certifiés en Football, Basketball, Fitness et Sports de combat. Réserve ta session en quelques clics.</p>

            <div className={styles.searchCard} data-gym-ui="searchCard" data-gsap-hero-item>
              <label className={styles.field} data-gym-ui="field">
                <span className={styles.fieldLabel} data-gym-ui="fieldLabel"><svg className={styles.fieldIcon} data-gym-ui="fieldIcon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>Quel sport ?</span>
                <input
                  className={styles.fieldInput} data-gym-ui="fieldInput"
                  type="text"
                  data-home-sport-input
                  placeholder="Football, fitness..."
                  value={sportInput}
                  onChange={(event) => setSportInput(event.target.value)}
                />
              </label>

              <label className={styles.field} data-gym-ui="field">
                <span className={styles.fieldLabel} data-gym-ui="fieldLabel">Où t’entraîner ?</span>
                <input
                  className={styles.fieldInput} data-gym-ui="fieldInput"
                  type="text"
                  data-home-city-input
                  placeholder="Ville ou visio"
                  value={cityInput}
                  onChange={(event) => setCityInput(event.target.value)}
                />
              </label>

              <button className={styles.searchButton} data-gym-ui="searchButton" type="button" aria-label="Rechercher" data-home-search-button onClick={handleSearch}>
                Trouver un coach
              </button>
            </div>
            {allowDemoFallback && <p className="discovery-note">Démonstration : les profils et tarifs du catalogue sont des données de recette.</p>}
            <div className={styles.heroMetrics} data-gym-ui="heroMetrics" data-gsap-hero-item aria-label="Repères GetYourMentor">
              {metrics.map((metric) => (
                <div key={metric.label} className={styles.heroMetric} data-gym-ui="heroMetric">
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.sportRail} data-gym-ui="sportRail" data-gsap-scene="sports" aria-labelledby="sport-rail-title">
          <div className={styles.sectionHeading} data-gym-ui="sectionHeading">
            <p className={styles.sectionKicker} data-gym-ui="sectionKicker">Choisir son terrain</p>
            <h2 id="sport-rail-title">Choisis ton terrain de jeu</h2>
          </div>
          <div className={styles.sportRailGrid} data-gym-ui="sportRailGrid">
            {sportLinks.map((sport, index) => (
              <Link key={sport.slug} href={`/recherche?sport=${sport.slug}`} className={styles.sportRailCard} data-gym-ui="sportRailCard" data-gsap-stagger data-sport-motion={sport.slug === "metiers-de-la-forme" ? "fitness" : sport.slug === "sports-de-combat" ? "combat" : sport.slug}>
                <Image src={sportVisuals[sport.slug]} alt="" fill loading="lazy" sizes="(max-width: 900px) 100vw, 25vw" quality={60} className={styles.sportRailImage} data-gym-ui="sportRailImage" />
                <span className={styles.sportRailShade} data-gym-ui="sportRailShade" aria-hidden="true" />
                <span className={styles.sportRailCopy} data-gym-ui="sportRailCopy">
                  <span className={styles.sportRailIndex} data-gym-ui="sportRailIndex">{String(index + 1).padStart(2, "0")}</span>
                  <strong className={styles.sportRailLabel} data-gym-ui="sportRailLabel">{sport.label}</strong>
                  <span className={styles.sportRailAction} data-gym-ui="sportRailAction">{sport.coachCount}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.experienceSection}`} data-gym-ui="section" data-gsap-scene="experiences" aria-labelledby="experience-title">
          <div className={styles.sectionHeading} data-gym-ui="sectionHeading">
            <p className={styles.sectionKicker} data-gym-ui="sectionKicker">Expériences</p>
            <h2 id="experience-title">Un coaching sur-mesure</h2>
            <span className={styles.experienceCounter} data-gym-ui="experienceCounter">{String(experienceIndex + 1).padStart(2, "0")} / 04</span>
          </div>
          <div className={styles.experienceCarousel} data-gym-ui="experienceCarousel" aria-live="polite">
            <div className={styles.experienceMedia} data-gym-ui="experienceMedia">
              <div className={styles.experienceStage} data-gym-ui="experienceStage" aria-label="Carrousel des expériences">
                {experienceSlides.map((slide, slideIndex) => {
                  const offset = (slideIndex - experienceIndex + experienceSlides.length) % experienceSlides.length;
                  return (
                  <div key={slide.title} className={`${styles.experienceSlide} ${offset === 0 ? styles.experienceSlideActive : offset === 1 ? styles.experienceSlideNext : offset === 2 ? styles.experienceSlideNextFar : styles.experienceSlidePrevious}`} data-gym-ui="experienceSlide">
                    <Image src={slide.image} alt={slide.title} fill loading="lazy" sizes="(max-width: 900px) 76vw, 52vw" quality={60} className={styles.experienceImage} data-gym-ui="experienceImage" />
                  </div>
                  );
                })}
              </div>
              <div className={styles.experienceShade} data-gym-ui="experienceShade" aria-hidden="true" />
              <div className={styles.experienceCaption} data-gym-ui="experienceCaption">
                <h3>{experienceSlides[experienceIndex].title}</h3>
                <p>{experienceSlides[experienceIndex].copy}</p>
              </div>
            </div>
            <div className={styles.experienceControls} data-gym-ui="experienceControls" aria-label="Navigation des expériences">
              <button className={styles.carouselButton} data-gym-ui="carouselButton" type="button" aria-label="Expérience précédente" onClick={() => goToExperience(experienceIndex - 1)}>‹</button>
              <div className={styles.experienceDots} data-gym-ui="experienceDots">
                {experienceSlides.map((slide, index) => <button key={slide.title} type="button" aria-label={`Aller à l'expérience ${index + 1}`} aria-current={experienceIndex === index} onClick={() => goToExperience(index)} />)}
              </div>
              <button className={styles.carouselButton} data-gym-ui="carouselButton" type="button" aria-label="Expérience suivante" onClick={() => goToExperience(experienceIndex + 1)}>›</button>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.journeyProcedure}`} data-gym-ui="section" data-gsap-section="journey">
          <div className={styles.sectionHeading} data-gym-ui="sectionHeading" data-gsap-heading>
            <p className={styles.sectionKicker} data-gym-ui="sectionKicker">Ton parcours</p>
            <h2>De l'inscription à ton premier record</h2>
            <p className={styles.carouselHint} data-gym-ui="carouselHint">Fais glisser pour découvrir les 4 étapes</p>
          </div>
          <div className="journey-light-line" data-gsap-line aria-hidden="true" />

          <div className={styles.carouselViewport} data-gym-ui="carouselViewport" aria-live="polite" ref={journeyViewportRef}>
          <div className={styles.carouselControls} data-gym-ui="carouselControls" aria-label="Navigation du parcours">
            <button className={styles.carouselButton} data-gym-ui="carouselButton" type="button" aria-label="Étape précédente" disabled={journeyIndex === 0} onClick={() => goToJourney(journeyIndex - 1)}>‹</button>
            <span className={styles.carouselCounter} data-gym-ui="carouselCounter">{String(journeyIndex + 1).padStart(2, "0")} / 04</span>
            <button className={styles.carouselButton} data-gym-ui="carouselButton" type="button" aria-label="Étape suivante" disabled={journeyIndex === 3} onClick={() => goToJourney(journeyIndex + 1)}>›</button>
          </div>
          <p className="discovery-note">Illustration du parcours : les profils, créneaux et montants des exemples ci-dessous sont fictifs. Consulte le catalogue pour les informations disponibles.</p>
          <div className={styles.howGrid} data-gym-ui="howGrid" ref={journeyTrackRef}>
            <article className={styles.stepCard} data-gym-ui="stepCard" data-journey-slide data-gsap-card  data-active={journeyIndex === 0}>
              <div className={styles.procedureVisual} data-gym-ui="procedureVisual"><div className={styles.procedureIcon} data-gym-ui="procedureIcon"><JourneyIcon type="users" /></div><div className={styles.procedureNumber} data-gym-ui="procedureNumber">01</div><h3>Choisis ton coach</h3><p>Parcours les profils vérifiés, compare tarifs et disponibilités.</p></div>
              <div className={styles.stepHead} data-gym-ui="stepHead">
                <span className={styles.stepNumber} data-gym-ui="stepNumber">1</span>
                <h3>Choisis ton coach</h3>
              </div>
              <div className={styles.miniScreen} data-gym-ui="miniScreen">
                <div className={styles.slideMedia} data-gym-ui="slideMedia">
                  <Image src={displayedProfile.image} alt={displayedProfile.name} fill sizes="(max-width: 900px) 100vw, 33vw" className={styles.cardImage} data-gym-ui="cardImage" />
                </div>
                <div className={styles.slideContent} data-gym-ui="slideContent">
                  <h4>{displayedProfile.name}</h4>
                  <p className={styles.slideMeta} data-gym-ui="slideMeta">{displayedProfile.meta}</p>
                  <p className={styles.slideDetail} data-gym-ui="slideDetail">{displayedProfile.detail}</p>
                  <span className={styles.pill} data-gym-ui="pill">{displayedProfile.price}</span>
                  <button
                    className={styles.darkButton} data-gym-ui="darkButton"
                    type="button"
                    onClick={() => router.push(searchTarget)}
                  >
                    {displayedProfile.cta}
                  </button>
                </div>
                <div className={styles.stepActions} data-gym-ui="stepActions">
                  <button
                    className={styles.arrowButton} data-gym-ui="arrowButton"
                    type="button"
                    onClick={() => setProfileIndex((current) => (current + profileSlides.length - 1) % profileSlides.length)}
                  >
                    ‹
                  </button>
                  <StepDots count={profileSlides.length} activeIndex={profileIndex} />
                  <button
                    className={styles.arrowButton} data-gym-ui="arrowButton"
                    type="button"
                    onClick={() => setProfileIndex((current) => (current + 1) % profileSlides.length)}
                  >
                    ›
                  </button>
                </div>
              </div>
            </article>

            <article className={styles.stepCard} data-gym-ui="stepCard" data-journey-slide data-gsap-card  data-active={journeyIndex === 1}>
              <div className={styles.procedureVisual} data-gym-ui="procedureVisual"><div className={styles.procedureIcon} data-gym-ui="procedureIcon"><JourneyIcon type="calendar" /></div><div className={styles.procedureNumber} data-gym-ui="procedureNumber">02</div><h3>Bloque tes créneaux</h3><p>Réserve en 2 clics selon ton emploi du temps.</p></div>
              <div className={styles.stepHead} data-gym-ui="stepHead">
                <span className={styles.stepNumber} data-gym-ui="stepNumber">2</span>
                <h3>Bloque tes créneaux</h3>
              </div>
              <div className={styles.miniScreen} data-gym-ui="miniScreen">
                <p className={styles.slideCaption} data-gym-ui="slideCaption">{activeSlot.title}</p>
                <div className={styles.slotVisual} data-gym-ui="slotVisual">
                  <Image src={activeSlot.visual} alt={activeSlot.title} fill sizes="(max-width: 900px) 100vw, 33vw" className={styles.cardImage} data-gym-ui="cardImage" />
                </div>
                <div className={styles.slotRow} data-gym-ui="slotRow">
                  {activeSlot.slots.map((slot, index) => (
                    <button key={slot} className={index === 0 ? styles.slotSelected : styles.slotButton} type="button">
                      {slot}
                    </button>
                  ))}
                </div>
                <p className={styles.slotSelection} data-gym-ui="slotSelection">{activeSlot.selection}</p>
                <button
                  className={styles.softButton} data-gym-ui="softButton"
                  type="button"
                    onClick={() => router.push(searchTarget)}
                >
                  {activeSlot.cta}
                </button>
                <div className={styles.stepActions} data-gym-ui="stepActions">
                  <button
                    className={styles.arrowButton} data-gym-ui="arrowButton"
                    type="button"
                    onClick={() => setSlotIndex((current) => (current + slotSlides.length - 1) % slotSlides.length)}
                  >
                    ‹
                  </button>
                  <StepDots count={slotSlides.length} activeIndex={slotIndex} />
                  <button
                    className={styles.arrowButton} data-gym-ui="arrowButton"
                    type="button"
                    onClick={() => setSlotIndex((current) => (current + 1) % slotSlides.length)}
                  >
                    ›
                  </button>
                </div>
              </div>
            </article>

            <article className={styles.stepCard} data-gym-ui="stepCard" data-journey-slide data-gsap-card  data-active={journeyIndex === 2}>
              <div className={styles.procedureVisual} data-gym-ui="procedureVisual"><div className={styles.procedureIcon} data-gym-ui="procedureIcon"><JourneyIcon type="check" /></div><div className={styles.procedureNumber} data-gym-ui="procedureNumber">03</div><h3>Valide ta session</h3><p>Paiement simulé sécurisé, confirmation instantanée.</p></div>
              <div className={styles.stepHead} data-gym-ui="stepHead">
                <span className={styles.stepNumber} data-gym-ui="stepNumber">3</span>
                <h3>Valide ta session</h3>
              </div>
              <div className={styles.miniScreen} data-gym-ui="miniScreen">
                <div className={styles.paymentVisual} data-gym-ui="paymentVisual">
                  <Image src="/images/demo-sport.svg" alt="Coach et sportif pendant une séance" fill sizes="(max-width: 900px) 88vw, 22vw" className={styles.cardImage} data-gym-ui="cardImage" />
                </div>
                <span className={styles.paymentStrong} data-gym-ui="paymentStrong">{displayedPayment.title}</span>
                <span className={styles.paymentRow} data-gym-ui="paymentRow">{displayedPayment.date}</span>
                <span className={styles.paymentRow} data-gym-ui="paymentRow">{displayedPayment.detail}</span>
                <div className={styles.paymentTotal} data-gym-ui="paymentTotal">
                  <span>Total</span>
                  <strong>{displayedPayment.total}</strong>
                </div>
                <button className={styles.darkButton} data-gym-ui="darkButton" type="button" onClick={() => router.push("/paiement")}>
                  Payer maintenant
                </button>
                <div className={styles.stepActions} data-gym-ui="stepActions">
                  <button
                    className={styles.arrowButton} data-gym-ui="arrowButton"
                    type="button"
                    onClick={() => setPaymentIndex((current) => (current + paymentSlides.length - 1) % paymentSlides.length)}
                  >
                    ‹
                  </button>
                  <StepDots count={paymentSlides.length} activeIndex={paymentIndex} />
                  <button
                    className={styles.arrowButton} data-gym-ui="arrowButton"
                    type="button"
                    onClick={() => setPaymentIndex((current) => (current + 1) % paymentSlides.length)}
                  >
                    ›
                  </button>
                </div>
              </div>
            </article>
            <article className={styles.stepCard} data-gym-ui="stepCard" data-journey-slide data-gsap-card  data-active={journeyIndex === 3}>
              <div className={styles.procedureVisual} data-gym-ui="procedureVisual"><div className={styles.procedureIcon} data-gym-ui="procedureIcon"><JourneyIcon type="trend" /></div><div className={styles.procedureNumber} data-gym-ui="procedureNumber">04</div><h3>Progresse avec ton coach</h3><p>Suivi personnalisé, objectifs atteints, résultats réels.</p></div>
              <div className={styles.stepHead} data-gym-ui="stepHead">
                <span className={styles.stepNumber} data-gym-ui="stepNumber">4</span>
                <h3>Progresse avec ton coach</h3>
              </div>
              <div className={styles.miniScreen} data-gym-ui="miniScreen">
                <div className={styles.progressVisual} data-gym-ui="progressVisual">
                  <Image src="/images/demo-sport.svg" alt="Coach accompagnant un sportif sur le terrain" fill sizes="(max-width: 900px) 88vw, 22vw" className={styles.cardImage} data-gym-ui="cardImage" />
                  <div className={styles.progressOverlay} data-gym-ui="progressOverlay" aria-hidden="true">
                  <span>OBJECTIF</span><strong>+ 18%</strong><small>de régularité ce mois-ci</small>
                  </div>
                </div>
                <div className={styles.slideContent} data-gym-ui="slideContent">
                  <h4>Un rythme qui tient</h4>
                  <p className={styles.slideDetail} data-gym-ui="slideDetail">Suivi personnalisé, objectifs atteints, résultats réels.</p>
                  <Link className={styles.darkButtonLink} data-gym-ui="darkButtonLink" href="/compte">Voir mon espace</Link>
                </div>
              </div>
            </article>
          </div>
          </div>
        </section>

        <HomeBelowFoldSections />

        <HomeFaqSection />
      </main>

      <SiteFooter />

      <nav className={styles.mobileNav} data-gym-ui="mobileNav" aria-label="Navigation principale">
        <Link href="/" className={styles.mobileNavItemActive} data-gym-ui="mobileNavItemActive"><span aria-hidden="true">⌂</span><span>Accueil</span></Link>
        <Link href="/recherche?sport=football" className={styles.mobileNavItem} data-gym-ui="mobileNavItem"><span aria-hidden="true">⌕</span><span>Explorer</span></Link>
        <Link href="/creneau" className={styles.mobileNavItem} data-gym-ui="mobileNavItem"><span aria-hidden="true">◷</span><span>Sessions</span></Link>
        <Link href="/compte" className={styles.mobileNavItem} data-gym-ui="mobileNavItem"><span aria-hidden="true">◯</span><span>Profil</span></Link>
      </nav>
    </div>
  );
}
