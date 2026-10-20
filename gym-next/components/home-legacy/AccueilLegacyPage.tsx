"use client";

import { useEffect, useState } from "react";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";
import { LanguageSelector } from "@/components/common/LanguageSelector";

type AccueilLegacyPageProps = {
  legacyStyles: string;
};

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

function HomeHeader({ isScrolled }: { isScrolled: boolean }) {
  return (
    <header className={`topbar${isScrolled ? " is-scrolled" : ""}`}>
      <div className="brand-lockup">
        <a className="brand-name brand-link" href={nextRoutes.home}>
          GetYourMentor
        </a>
      </div>

      <nav className="sports-nav" aria-label="Sports">
        <a className="sport-link" href={`${nextRoutes.search}?sport=football`}>
          Football
        </a>
        <a className="sport-link" href={`${nextRoutes.search}?sport=basketball`}>
          Basketball
        </a>
        <a className="sport-link" href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>
          Fitness
        </a>
        <a className="sport-link" href={`${nextRoutes.search}?sport=sports-de-combat`}>
          Sports de combat
        </a>
      </nav>

      <div className="topbar-actions">
        <LanguageSelector />
        <a className="topbar-link" href={`${nextRoutes.account}?mode=coach`}>
          Je suis coach
        </a>
        <a className="account-button" href={nextRoutes.account}>
          <span className="account-button-icon" aria-hidden="true">
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
        </a>
      </div>
    </header>
  );
}

function HomeHero({
  onSubmit,
}: {
  onSubmit: (sportValue: string, cityValue: string) => void;
}) {
  const [sportValue, setSportValue] = useState("");
  const [cityValue, setCityValue] = useState("");

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-backdrop"></div>
      <div className="hero-overlay"></div>

      <div className="hero-content">
        <p className="eyebrow">Coaching sportif premium</p>
        <h1 id="hero-title">Reservez votre coach</h1>
        <p className="hero-copy">Simple - Immediat - 24h/24</p>

        <form
          className="search-card"
          data-home-search-form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(sportValue || "football", cityValue || "");
          }}
        >
          <label className="field">
            <span className="field-label">Quelle discipline ?</span>
            <input
              className="field-input"
              type="text"
              data-home-sport-input
              placeholder="Nom du coach, sport..."
              value={sportValue}
              onChange={(event) => setSportValue(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Ou</span>
            <input
              className="field-input"
              type="text"
              data-home-city-input
              placeholder="Adresse, ville"
              value={cityValue}
              onChange={(event) => setCityValue(event.target.value)}
            />
          </label>

          <button className="search-button" type="submit">
            Explorer les coachs
          </button>
        </form>

        <div className="search-preview-layer" aria-hidden="true" data-home-search-preview>
          <div className="search-preview-shell">
            <span className="search-preview-badge">Apercu de la recherche</span>
            <div className="search-preview-frame">
              <img
                className="search-preview-image"
                src="/images/demo-sport.svg"
                alt="Coach de football en séance"
              />
            </div>
            <p className="search-preview-copy">
              On prepare les coachs disponibles, les filtres et la carte autour de votre recherche.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeHowItWorks() {
  return (
    <section className="how-it-works" aria-labelledby="how-title">
      <div className="section-heading">
        <h2 id="how-title">Comment ca marche ?</h2>
      </div>

      <div className="how-grid">
        <article className="step-card">
          <div className="step-head">
            <span className="step-number">1</span>
            <h3>Trouvez votre coach</h3>
          </div>
          <div className="mini-screen mini-screen-profile">
            <div className="card-carousel-window">
              <div className="card-carousel-track carousel-track-6">
                <div className="card-slide profile-slide">
                  <div className="profile-avatar avatar-face-1"></div>
                  <h4 className="mini-name">Thomas Dubois</h4>
                  <p className="mini-meta">Football - Paris</p>
                  <p className="mini-detail">Specialiste preparation match - 12 ans d'experience</p>
                  <span className="mini-pill">50 EUR / seance</span>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.coach, {
                        sport: "football",
                        city: "Paris",
                        coach: "Thomas Dubois",
                      });
                    }}
                  >
                    Voir le profil
                  </button>
                </div>
                <div className="card-slide profile-slide">
                  <div className="profile-avatar avatar-face-2"></div>
                  <h4 className="mini-name">Sarah Benali</h4>
                  <p className="mini-meta">Basketball - Lyon</p>
                  <p className="mini-detail">Technique individuelle - Seances intensives</p>
                  <span className="mini-pill">65 EUR / seance</span>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.coach, {
                        sport: "basketball",
                        city: "Lyon",
                        coach: "Sarah Benali",
                      });
                    }}
                  >
                    Decouvrir le coach
                  </button>
                </div>
                <div className="card-slide profile-slide">
                  <div className="profile-avatar avatar-face-3"></div>
                  <h4 className="mini-name">Julien Morel</h4>
                  <p className="mini-meta">Fitness - Lille</p>
                  <p className="mini-detail">Remise en forme - Coaching progressif</p>
                  <span className="mini-pill">42 EUR / seance</span>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.coach, {
                        sport: "metiers-de-la-forme",
                        city: "Lille",
                        coach: "Julien Morel",
                      });
                    }}
                  >
                    Voir ses seances
                  </button>
                </div>
                <div className="card-slide profile-slide">
                  <div className="profile-avatar avatar-face-4"></div>
                  <h4 className="mini-name">Ines Caron</h4>
                  <p className="mini-meta">Sports de combat - Marseille</p>
                  <p className="mini-detail">Self-defense - Conditionnement physique</p>
                  <span className="mini-pill">70 EUR / seance</span>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.coach, {
                        sport: "sports-de-combat",
                        city: "Marseille",
                        coach: "Ines Caron",
                      });
                    }}
                  >
                    Reserver ce coach
                  </button>
                </div>
                <div className="card-slide profile-slide">
                  <div className="profile-avatar avatar-face-5"></div>
                  <h4 className="mini-name">Mehdi Rahal</h4>
                  <p className="mini-meta">Football - Bordeaux</p>
                  <p className="mini-detail">Travail d'appuis - Explosivite - Mental</p>
                  <span className="mini-pill">58 EUR / seance</span>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.coach, {
                        sport: "football",
                        city: "Bordeaux",
                        coach: "Mehdi Rahal",
                      });
                    }}
                  >
                    Voir son agenda
                  </button>
                </div>
                <div className="card-slide profile-slide">
                  <div className="profile-avatar avatar-face-6"></div>
                  <h4 className="mini-name">Camille Perrot</h4>
                  <p className="mini-meta">Fitness - Nice</p>
                  <p className="mini-detail">Pilates, mobilite et renforcement doux</p>
                  <span className="mini-pill">54 EUR / seance</span>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.coach, {
                        sport: "metiers-de-la-forme",
                        city: "Nice",
                        coach: "Camille Perrot",
                      });
                    }}
                  >
                    Choisir cette coach
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="step-card">
          <div className="step-head">
            <span className="step-number">2</span>
            <h3>Proposez vos creneaux</h3>
          </div>
          <div className="mini-screen mini-screen-slots">
            <div className="card-carousel-window">
              <div className="card-carousel-track carousel-track-4">
                <div className="card-slide slots-slide">
                  <p className="mini-caption">Choisissez jusqu'a 3 creneaux</p>
                  <div className="slot-visual slot-visual-1"></div>
                  <div className="slots-row">
                    <button className="mini-slot selected" type="button">
                      10:30
                    </button>
                    <button className="mini-slot" type="button">
                      15:00
                    </button>
                  </div>
                  <p className="mini-selection">1 creneau selectionne</p>
                  <button
                    className="mini-cta muted"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.slot, {
                        sport: "football",
                        city: "Paris",
                        coach: "Thomas Dubois",
                        service: "Seance technique individuelle",
                        duration: "30min",
                        price: "35 EUR",
                      });
                    }}
                  >
                    Proposer mes creneaux
                  </button>
                </div>
                <div className="card-slide slots-slide">
                  <p className="mini-caption">Selectionnez un creneau prioritaire</p>
                  <div className="slot-visual slot-visual-2"></div>
                  <div className="slots-row">
                    <button className="mini-slot selected" type="button">
                      08:00
                    </button>
                    <button className="mini-slot" type="button">
                      18:30
                    </button>
                  </div>
                  <p className="mini-selection">2 creneaux selectionnes</p>
                  <button
                    className="mini-cta muted"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.slot, {
                        sport: "basketball",
                        city: "Lyon",
                        coach: "Sarah Benali",
                        service: "Shooting et mecanique",
                        duration: "30min",
                        price: "35 EUR",
                      });
                    }}
                  >
                    Envoyer mes disponibilites
                  </button>
                </div>
                <div className="card-slide slots-slide">
                  <p className="mini-caption">Ajoutez un creneau de secours</p>
                  <div className="slot-visual slot-visual-3"></div>
                  <div className="slots-row">
                    <button className="mini-slot selected" type="button">
                      12:15
                    </button>
                    <button className="mini-slot" type="button">
                      19:00
                    </button>
                  </div>
                  <p className="mini-selection">3 creneaux selectionnes</p>
                  <button
                    className="mini-cta muted"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.slot, {
                        sport: "metiers-de-la-forme",
                        city: "Lille",
                        coach: "Julien Morel",
                        service: "Coaching remise en forme",
                        duration: "30min",
                        price: "35 EUR",
                      });
                    }}
                  >
                    Valider ma selection
                  </button>
                </div>
                <div className="card-slide slots-slide">
                  <p className="mini-caption">Validez vos disponibilites</p>
                  <div className="slot-visual slot-visual-4"></div>
                  <div className="slots-row">
                    <button className="mini-slot selected" type="button">
                      09:45
                    </button>
                    <button className="mini-slot" type="button">
                      17:15
                    </button>
                  </div>
                  <p className="mini-selection">Pret a envoyer</p>
                  <button
                    className="mini-cta muted"
                    type="button"
                    onClick={() => {
                      window.location.href = buildNextPath(nextRoutes.slot, {
                        sport: "sports-de-combat",
                        city: "Marseille",
                        coach: "Ines Caron",
                        service: "Cours prive boxe",
                        duration: "45min",
                        price: "55 EUR",
                      });
                    }}
                  >
                    Continuer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="step-card">
          <div className="step-head">
            <span className="step-number">3</span>
            <h3>Confirmez et payez</h3>
          </div>
          <div className="mini-screen mini-screen-payment">
            <div className="card-carousel-window">
              <div className="card-carousel-track carousel-track-4">
                <div className="card-slide payment-slide">
                  <div className="payment-visual payment-visual-1"></div>
                  <span className="payment-line-strong">Thomas Dubois - Football</span>
                  <span className="payment-row">Mer. 26 mars - 14:00</span>
                  <span className="payment-row">Seance 1h30 - Paris</span>
                  <div className="payment-total">
                    <span>Total</span>
                    <strong>62 EUR</strong>
                  </div>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/paiement?city=Paris&coach=Thomas%20Dubois&service=Seance%20technique%20individuelle&duration=30min&price=62%20EUR&slot=14:00&mentor=Thomas%20Dubois&connected=1";
                    }}
                  >
                    Payer maintenant
                  </button>
                </div>
                <div className="card-slide payment-slide">
                  <div className="payment-visual payment-visual-2"></div>
                  <span className="payment-line-strong">Sarah Benali - Basketball</span>
                  <span className="payment-row">Jeu. 28 mars - 18:30</span>
                  <span className="payment-row">Seance 1h00 - Lyon</span>
                  <div className="payment-total">
                    <span>Total</span>
                    <strong>74 EUR</strong>
                  </div>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/paiement?city=Lyon&coach=Sarah%20Benali&service=Session%20intensite&duration=50min&price=74%20EUR&slot=18:30&mentor=Sarah%20Benali&connected=1";
                    }}
                  >
                    Confirmer et payer
                  </button>
                </div>
                <div className="card-slide payment-slide">
                  <div className="payment-visual payment-visual-3"></div>
                  <span className="payment-line-strong">Julien Morel - Fitness</span>
                  <span className="payment-row">Ven. 29 mars - 08:00</span>
                  <span className="payment-row">Seance 45 min - Lille</span>
                  <div className="payment-total">
                    <span>Total</span>
                    <strong>48 EUR</strong>
                  </div>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/paiement?city=Lille&coach=Julien%20Morel&service=Coaching%20remise%20en%20forme&duration=45min&price=48%20EUR&slot=08:00&mentor=Julien%20Morel&connected=1";
                    }}
                  >
                    Regler la seance
                  </button>
                </div>
                <div className="card-slide payment-slide">
                  <div className="payment-visual payment-visual-4"></div>
                  <span className="payment-line-strong">Ines Caron - Sports de combat</span>
                  <span className="payment-row">Sam. 30 mars - 12:15</span>
                  <span className="payment-row">Seance 1h15 - Marseille</span>
                  <div className="payment-total">
                    <span>Total</span>
                    <strong>79 EUR</strong>
                  </div>
                  <button
                    className="mini-cta dark"
                    type="button"
                    onClick={() => {
                      window.location.href =
                        "/paiement?city=Marseille&coach=Ines%20Caron&service=Self-defense%20premium&duration=50min&price=79%20EUR&slot=12:15&mentor=Ines%20Caron&connected=1";
                    }}
                  >
                    Finaliser la reservation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function HomeMetrics() {
  return (
    <section className="metrics-section">
      <div className="metrics-grid">
        <div className="metric">
          <strong>500+</strong>
          <span>Coachs certifies</span>
        </div>
        <div className="metric">
          <strong>10K+</strong>
          <span>Reservations</span>
        </div>
        <div className="metric">
          <strong>4.9/5</strong>
          <span>Note moyenne</span>
        </div>
      </div>
    </section>
  );
}

function HomeInsights() {
  return (
    <section className="booking-insights" id="coach-space" aria-labelledby="insights-title">
      <h2 id="insights-title">Optimisez la prise de rendez-vous coaching en ligne</h2>

      <div className="insights-grid">
        <article className="insight-card">
          <strong>+ 50%</strong>
          <p>de frequence sur les reservations de seances prises en ligne</p>
        </article>

        <article className="insight-card">
          <strong>4x</strong>
          <p>moins d'oublis avec les rappels automatiques des seances</p>
        </article>

        <article className="insight-card insight-card-feature">
          <strong>50%</strong>
          <p>des reservations prises en dehors des horaires d'ouverture</p>
          <a className="coach-cta-button insight-button" href={`${nextRoutes.account}?mode=coach`}>
            Je suis coach
          </a>
        </article>

        <article className="insight-card">
          <strong>+50 000</strong>
          <p>seances et demandes de coaching gerees sur la plateforme</p>
        </article>

        <article className="insight-card">
          <strong>5 RDV</strong>
          <p>reserves toutes les secondes sur les creneaux les plus demandes</p>
        </article>

        <article className="insight-card">
          <strong>&gt; 5 millions EUR</strong>
          <p>de reservations sportives generees pour les coachs partenaires</p>
        </article>
      </div>
    </section>
  );
}

function HomeRecruit() {
  return (
    <section className="recruit-section" aria-labelledby="recruit-title">
      <div className="recruit-media"></div>
      <div className="recruit-copy">
        <p className="section-kicker">PROFESSIONNEL</p>
        <h2 id="recruit-title">
          GetYourMentor recherche des profils partout en France pour digitaliser le coaching sportif
        </h2>
        <p className="recruit-signature">Equipe GetYourMentor</p>
        <a className="coach-cta-button" href="#coach-space">
          Decouvrir nos offres
        </a>
      </div>
    </section>
  );
}

function HomeLocales() {
  return (
    <section className="locales-section" aria-labelledby="locales-title">
      <h2 id="locales-title">Trouvez votre coach sportif partout en France</h2>

      <div className="locales-grid">
        <article className="locale-column">
          <h3>Football</h3>
          <p>Nos coachs football populaires en France</p>
          <a href={`${nextRoutes.search}?sport=football`}>Bordeaux</a>
          <a href={`${nextRoutes.search}?sport=football`}>Lille</a>
          <a href={`${nextRoutes.search}?sport=football`}>Lyon</a>
          <a href={`${nextRoutes.search}?sport=football`}>Marseille</a>
          <a href={`${nextRoutes.search}?sport=football`}>Montpellier</a>
          <a href={`${nextRoutes.search}?sport=football`}>Nantes</a>
          <a href={`${nextRoutes.search}?sport=football`}>Nice</a>
          <a href={`${nextRoutes.search}?sport=football`}>Paris</a>
          <a href={`${nextRoutes.search}?sport=football`}>Strasbourg</a>
          <a href={`${nextRoutes.search}?sport=football`}>Toulouse</a>
        </article>

        <article className="locale-column">
          <h3>Basketball</h3>
          <p>Nos coachs basketball populaires en France</p>
          <a href={`${nextRoutes.search}?sport=basketball`}>Bordeaux</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Lille</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Lyon</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Marseille</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Montpellier</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Nantes</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Nice</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Paris</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Strasbourg</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Toulouse</a>
        </article>

        <article className="locale-column">
          <h3>Fitness</h3>
          <p>Nos coachs forme populaires en France</p>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Bordeaux</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Lille</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Lyon</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Marseille</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Montpellier</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Nantes</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Nice</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Paris</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Strasbourg</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Toulouse</a>
        </article>

        <article className="locale-column">
          <h3>Sports de combat</h3>
          <p>Nos coachs combat populaires en France</p>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Bordeaux</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Lille</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Lyon</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Marseille</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Montpellier</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Nantes</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Nice</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Paris</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Strasbourg</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Toulouse</a>
        </article>
      </div>
    </section>
  );
}

function HomeFaq() {
  return (
    <section className="faq-section" aria-labelledby="faq-title">
      <p className="section-kicker">FAQ</p>
      <h2 id="faq-title">Les questions frequentes</h2>

      <div className="faq-list">
        <details className="faq-item">
          <summary>Qu'est-ce que GetYourMentor ?</summary>
          <p>
            GetYourMentor est une plateforme qui aide les sportifs a trouver un coach, envoyer une demande de
            reservation et payer seulement apres validation du coach.
          </p>
        </details>

        <details className="faq-item">
          <summary>Comment reserver une seance sur GetYourMentor ?</summary>
          <p>
            Vous choisissez un coach, une seance, puis vous proposez un a trois creneaux. Le coach accepte ou
            refuse avant toute etape de paiement.
          </p>
        </details>

        <details className="faq-item">
          <summary>Est-ce que je dois payer en ligne sur GetYourMentor ?</summary>
          <p>
            Oui, mais uniquement une fois que le coach a valide votre demande. Aucun paiement n'est declenche
            avant acceptation.
          </p>
        </details>

        <details className="faq-item">
          <summary>Comment gerer mes demandes et mes reservations ?</summary>
          <p>
            Depuis votre espace compte, vous pouvez consulter vos demandes envoyees, vos validations, vos
            reservations confirmees et vos informations de paiement.
          </p>
        </details>

        <details className="faq-item">
          <summary>Comment devenir coach partenaire sur GetYourMentor ?</summary>
          <p>
            Vous pouvez rejoindre le reseau en creant votre compte professionnel puis en completant votre profil,
            vos sports, vos disponibilites et vos conditions de seance.
          </p>
        </details>
      </div>
    </section>
  );
}

import { SiteFooter } from "@/components/SiteFooter";
function HomeFooter() { return <SiteFooter />; }

export function AccueilLegacyPage({ legacyStyles }: AccueilLegacyPageProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const syncTopbarState = () => {
      setIsScrolled(window.scrollY >= 24);
    };

    syncTopbarState();
    window.addEventListener("scroll", syncTopbarState, { passive: true });
    window.addEventListener("resize", syncTopbarState);

    return () => {
      window.removeEventListener("scroll", syncTopbarState);
      window.removeEventListener("resize", syncTopbarState);
    };
  }, []);

  const handleSearchSubmit = (sportValue: string, cityValue: string) => {
    const sportSlug = inferSportSlug(sportValue);
    const city = cityValue.trim();
    window.location.href = buildNextPath(nextRoutes.search, { sport: sportSlug, city });
  };

  return (
    <>
      <style jsx global>{legacyStyles}</style>
      <div className="site-shell">
        <HomeHeader isScrolled={isScrolled} />
        <main>
          <HomeHero onSubmit={handleSearchSubmit} />
          <HomeHowItWorks />
          <HomeMetrics />
          <HomeInsights />
          <HomeRecruit />
          <HomeLocales />
          <HomeFaq />
        </main>
        <HomeFooter />
      </div>
    </>
  );
}
