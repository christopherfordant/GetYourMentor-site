"use client";
import { FormRejection, readAuthFormData } from "@/lib/access-form-response";
import { readCoachReservations } from "./coach-request-data";
import { CoachPlanningSchedule } from "./CoachPlanningSchedule";
import { coachNextSession } from "@/lib/domain/coach-next-session";
import financeFilterStyles from "./coach-finance-filter.module.css";
import { coachMonthlyFinance,formatFinanceCents,coachMonthKey,isCoachMonth } from "@/lib/domain/coach-finance";
import { CoachFinanceSummary } from "./CoachFinanceSummary";
import { Affiliations } from "@/components/account-legacy/Affiliations";
import { formatBookingSlot } from "@/lib/domain/booking-time";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { EmailIcon, UnavailableGoogleButton } from "./AuthProviderPresentation";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { CoachRequestsPanel } from "@/components/account-legacy/CoachRequestsPanel";
import { CoachProfileEditor } from "@/components/account-legacy/CoachProfileEditor";
import { MessageInbox } from "@/components/account-legacy/MessageInbox";
import { AccountSessionControls } from "@/components/account-legacy/AccountSessionControls";
import { AthleteDashboard } from "@/components/account-legacy/AthleteDashboard";
import { AdminDashboard } from "@/components/account-legacy/AdminDashboard";
import { PhoneVerificationPanel } from "@/components/account-legacy/PhoneVerificationPanel";
import { CoachDocumentsPanel } from "@/components/account-legacy/CoachDocumentsPanel";
import { GroupPrices } from "@/components/account-legacy/GroupPrices";
import { StructureSessions } from "@/components/account-legacy/StructureSessions";
import { findCoach, type CoachProfile, type Reservation } from "@/lib/domain";

type AccountLegacyPageProps = {
  legacyStyles: string;
  params: Record<string, string | undefined>;
  allowDemoFallback?: boolean;
  athleteEmail?: string;
};

type StepName = "signin" | "role" | "create";
type DashboardMode = "sportif" | "coach" | "club" | "admin" | null;

const coachSessions = [
  {
    name: "Élève test",
    age: "Profil de démonstration",
    club: "Compte sportif de test",
    objective: "Objectif : perfectionnement basketball",
    location: "Lieu : Gymnase de la Paix",
    slot: "18h - 19h",
    date: "05/04",
    href: buildNextPath(nextRoutes.coach, { sport: "basketball", city: "Lyon", coach: "Coach Démo 01" }),
  },
];

function AccountHeader() {
  return (
    <header className="topbar topbar-light">
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
        <div className="account-topbar-menu">
          <a className="account-button" href={nextRoutes.account} aria-current="page">
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
          <button
            className="account-display-toggle"
            type="button"
            data-coach-display-toggle
            hidden
            aria-expanded="false"
            aria-controls="coach-display-menu"
          >
            <span>Choisir l'accueil</span>
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path
                d="M7 10l5 5 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className="account-display-menu" id="coach-display-menu" data-coach-display-menu hidden>
            <label>
              <input type="checkbox" data-coach-display-target="next-session" defaultChecked /> Prochaines séances
            </label>
            <label>
              <input type="checkbox" data-coach-display-target="rating" defaultChecked /> Ma note / Mes avis
            </label>
            <label>
              <input type="checkbox" data-coach-display-target="revenue" defaultChecked /> Revenus ce mois-ci
            </label>
          </div>
        </div>
      </div>
    </header>
  );
}

function AccountAuthShell({
  step,
  isCoachMode,
  status,
  busy,
  passwordVisible,
  onTogglePassword,
  onSubmitSignIn,
  onOpenSignup,
  onBack,
  onChooseRole,
  onSubmitCreate,
}: {
  step: StepName;
  isCoachMode: boolean;
  status: string;
  busy: boolean;
  passwordVisible: boolean;
  onTogglePassword: () => void;
  onSubmitSignIn: (credentials: { email: string; password: string }) => void | Promise<void>;
  onOpenSignup: () => void;
  onBack: (step: StepName) => void;
  onChooseRole: (role: "sportif" | "coach" | "club") => void | Promise<void>;
  onSubmitCreate: (credentials: {
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    email: string;
    emailConfirmation: string;
    password: string;
    passwordConfirmation: string;
    termsAccepted: boolean;
  }) => void | Promise<void>;
}) {
  return (
    <div className="account-auth-stage" data-account-auth-shell aria-busy={busy}>
      <div className={`auth-modal-step${step === "signin" ? " is-active" : ""}`} data-account-step="signin" hidden={step !== "signin"}>
        <div className="auth-card auth-card-compact">
          <h1 data-account-title>{isCoachMode ? "Connexion coach" : "S'identifier"}</h1>
          <p className="auth-subtitle" data-account-subtitle>
            {isCoachMode
              ? "Connectez-vous pour accéder à votre espace coach et gérer vos créneaux."
              : "Connectez-vous pour retrouver votre espace ou poursuivre votre inscription."}
          </p>
          <p className="auth-status-message" data-account-status hidden={!status} role="alert" id="signin-feedback">
            {status}
          </p>
          <p id="signin-required" className="auth-helper">Tous les champs sont obligatoires.</p>
          <form
            className="auth-form gym-access-form"
            aria-describedby={status ? "signin-feedback signin-required" : "signin-required"}
            data-account-form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSubmitSignIn({
                email: String(form.get("email") ?? ""),
                password: String(form.get("password") ?? ""),
              });
            }}
          >
            <label className="auth-field">
              <span>Adresse mail</span>
              <input disabled={busy} id="account-email" name="email" type="email" autoComplete="username" required placeholder="Adresse mail" />
            </label>
            <label className="auth-field">
              <span>Mot de passe</span>
              <div className="password-field">
                <input disabled={busy} id="account-password" name="password" autoComplete="current-password" required type={passwordVisible ? "text" : "password"} placeholder="Mot de passe" />
                <button disabled={busy}
                  className={`password-toggle${passwordVisible ? " is-visible" : ""}`}
                  type="button"
                  aria-controls="account-password"
                  aria-label={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={passwordVisible ? "true" : "false"}
                  onClick={onTogglePassword}
                >
                  <span className="eye-open" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </svg>
                  </span>
                  <span className="eye-closed" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path
                        d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M4 4 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                </button>
              </div>
            </label>
            <a className="auth-link" href={nextRoutes.account} data-account-forgot>
              Mot de passe oublié ?
            </a>
            <button disabled={busy} className="auth-primary" type="submit" data-account-login>
              <EmailIcon /> {busy ? "Connexion…" : "Se connecter"}
            </button>
          </form>
          <UnavailableGoogleButton />
          <button disabled={busy} className="auth-pill-button auth-pill-button-light" type="button" data-account-signup onClick={onOpenSignup}>
            Nouveau ? Inscription
          </button>
        </div>
      </div>
      <div className={`auth-modal-step${step === "role" ? " is-active" : ""}`} data-account-step="role" hidden={step !== "role"}>
        <div className="auth-card auth-card-wide">
          <h1>Vous êtes :</h1>
          <p className="auth-status-message" data-account-status hidden={!status} role="alert">
            {status}
          </p>
          <div className="auth-role-grid">
            <button disabled={busy} className="auth-role-card" type="button" data-account-role="sportif" onClick={() => onChooseRole("sportif")}>
              <strong>Un(e) sportif(ve)</strong>
            </button>
            <div className="auth-role-separator">ou</div>
            <button disabled={busy} className="auth-role-card" type="button" data-account-role="coach" onClick={() => onChooseRole("coach")}>
              <strong>Un(e) coach</strong>
            </button>
            <div className="auth-role-separator">ou</div>
            <button disabled={busy} className="auth-role-card auth-role-card-detail" type="button" data-account-role="club" onClick={() => onChooseRole("club")}>
              <strong>
                Association sportive
                <br />
                Club
                <br />
                Structure
              </strong>
            </button>
          </div>
          <div className="auth-step-actions">
            <button disabled={busy} className="auth-inline-button" type="button" data-account-back="signin" onClick={() => onBack("signin")}>
              Retour
            </button>
          </div>
        </div>
      </div>
      <div className={`auth-modal-step${step === "create" ? " is-active" : ""}`} data-account-step="create" hidden={step !== "create"}>
        <div className="auth-card auth-card-compact">
          <h1>Créez votre compte</h1>
          <p className="auth-helper" id="create-required">Les champs sont obligatoires, sauf la ville. Le mot de passe doit contenir au moins 8 caractères.</p>
          <p className="auth-status-message" data-account-status hidden={!status} role="alert" id="create-feedback">
            {status}
          </p>
          <form
            className="auth-form gym-access-form"
            aria-describedby={status ? "create-required create-feedback" : "create-required"}
            data-account-create-form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSubmitCreate({
                firstName: String(form.get("firstName") ?? ""),
                lastName: String(form.get("lastName") ?? ""),
                phone: String(form.get("phone") ?? ""),
                city: String(form.get("city") ?? ""),
                email: String(form.get("email") ?? ""),
                emailConfirmation: String(form.get("emailConfirmation") ?? ""),
                password: String(form.get("password") ?? ""),
                passwordConfirmation: String(form.get("passwordConfirmation") ?? ""),
                termsAccepted: form.get("termsAccepted") === "on",
              });
            }}
          >
            <label className="auth-field">
              <span>Adresse mail</span>
              <input disabled={busy} name="email" type="email" autoComplete="email" required placeholder="Adresse mail" />
            </label>
            <label className="auth-field">
              <span>Confirmation de l'adresse mail</span>
              <input disabled={busy} aria-invalid={status.includes("adresses email")} aria-describedby={status.includes("adresses email") ? "create-feedback" : undefined} name="emailConfirmation" type="email" autoComplete="email" required placeholder="Confirmez l'adresse mail" />
            </label>
            <label className="auth-field">
              <span>Créez votre mot de passe</span>
              <input disabled={busy} name="password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" minLength={8} required placeholder="Mot de passe" />
            </label>
            <label className="auth-field">
              <span>Confirmez votre mot de passe</span>
              <input disabled={busy} aria-invalid={status.includes("mots de passe")} aria-describedby={status.includes("mots de passe") ? "create-feedback" : undefined} name="passwordConfirmation" type={passwordVisible ? "text" : "password"} autoComplete="new-password" minLength={8} required placeholder="Confirmation du mot de passe" />
            </label>
            <button disabled={busy} className="auth-secondary" type="button" aria-pressed={passwordVisible} onClick={onTogglePassword}>{passwordVisible ? "Masquer les mots de passe" : "Afficher les mots de passe"}</button>
            <label className="auth-field">
              <span>Prénom</span>
              <input disabled={busy} name="firstName" required type="text" placeholder="Prénom" autoComplete="given-name" />
            </label>
            <label className="auth-field">
              <span>Nom</span>
              <input disabled={busy} name="lastName" required type="text" placeholder="Nom" autoComplete="family-name" />
            </label>
            <label className="auth-field">
              <span>Téléphone</span>
              <input disabled={busy} name="phone" required type="tel" placeholder="Téléphone" autoComplete="tel" />
            </label>
            <label className="auth-field">
              <span>Ville / zone (facultatif)</span>
              <input disabled={busy} name="city" type="text" placeholder="Ville ou zone de pratique" autoComplete="address-level2" />
            </label>
            <label className="auth-checkbox">
              <input disabled={busy} name="termsAccepted" type="checkbox" required />
              <span>J’accepte les <a href="/legal/cgu">CGU</a> et j’ai pris connaissance de la <a href="/legal/confidentialite">politique de confidentialité</a>.</span>
            </label>
            <button disabled={busy} className="auth-primary" type="submit">
              Continuer
            </button>
          </form>
          <UnavailableGoogleButton />
          <div className="auth-step-actions">
            <button disabled={busy} className="auth-inline-button" type="button" data-account-back="signin" onClick={() => onBack("signin")}>
              Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachDashboard({
  coachName,
  coachId,
  allowDemoFallback,
}: {
  coachName: string;
  coachId?: string;
  allowDemoFallback: boolean;
}) {
  const [messageContacts, setMessageContacts] = useState<Array<{ value: string; label: string }>>([]);
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(() => allowDemoFallback ? findCoach(coachName) : null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [financeLoading,setFinanceLoading]=useState(true);
  const [financeError,setFinanceError]=useState(false);
  const [financePeriod,setFinancePeriod]=useState(()=>coachMonthKey());
  const [financeMonthDraft,setFinanceMonthDraft]=useState(()=>coachMonthKey());
  const [financeMonthError,setFinanceMonthError]=useState("");
  useEffect(()=>{const month=coachMonthKey();setFinancePeriod(month);setFinanceMonthDraft(month);setFinanceMonthError("");},[coachId]);

  useEffect(() => {
    fetch(`/api/coaches/${encodeURIComponent(coachId ?? coachName)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Profil indisponible"))))
      .then((payload) => setCoachProfile(payload.data as CoachProfile))
      .catch(() => {
        if (!allowDemoFallback) setCoachProfile(null);
      });
  }, [allowDemoFallback, coachId, coachName]);

  const initialCoachRead=useRef<AbortController|null>(null);
  const updateCoachReservations=useCallback((rows:Reservation[])=>{
    initialCoachRead.current?.abort();
    setReservations(rows.filter(row=>row.coachId===coachId));setFinanceLoading(false);setFinanceError(false);
  },[coachId]);
  useEffect(() => {
    const controller=new AbortController();initialCoachRead.current=controller;
    setFinanceLoading(true);setFinanceError(false);
    fetch("/api/reservations",{signal:controller.signal})
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Chargement impossible"))))
      .then((payload) => {if(controller.signal.aborted)return;setReservations(readCoachReservations(payload,coachId ?? ""));})
      .catch(() => {if(!controller.signal.aborted){setFinanceError(true);setReservations([]);}})
      .finally(()=>{if(!controller.signal.aborted)setFinanceLoading(false);});
    return()=>controller.abort();
  }, [coachId]);

  const monthlyFinance=coachId?coachMonthlyFinance(reservations,coachId,Date.now(),financePeriod):null;
  const [scheduleNow,setScheduleNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setScheduleNow(Date.now()),30_000);return()=>window.clearInterval(timer);},[]);
  const nextSession=coachNextSession(reservations,coachId ?? "",scheduleNow);
  const nextReservation=nextSession.next?.reservation;

  const requestedCount = reservations.filter((reservation) => reservation.status === "requested").length;
  const acceptedCount = reservations.filter((reservation) => ["accepted", "paid"].includes(reservation.status)).length;


  return (
    <section className="account-dashboard coach-home" data-account-dashboard="coach">
      {!coachId ? <section className="account-dashboard-card" id="coach-documents"><h3>Vérification du profil</h3><p>Connectez-vous avec votre compte coach pour retrouver vos justificatifs.</p></section> : null}
      <PhoneVerificationPanel />
      {coachId ? <CoachDocumentsPanel coachId={coachId} /> : null}
      <aside className="coach-home-sidebar">
        <a className="coach-home-nav-main is-active" href="#account-content">Accueil</a>
        <div className="coach-home-nav-group">
          <div className="coach-home-nav-heading">Organisation</div>
          <a href="#coach-planning">Planning</a>
          <a href="#coach-requests">Demandes</a>
          <a href="#coach-messages-live">Messagerie</a>
        </div>
        <div className="coach-home-nav-group">
          <div className="coach-home-nav-heading">Mes données</div>
          <a href="#coach-dashboard">Tableau de bord</a>
          <a href="#coach-payments">Mes paiements</a>
          <a href="#coach-profile-editor">Mon profil</a>
          <a href="#coach-documents">Vérification</a>
        </div>
        <div className="coach-home-nav-footer">
          <a href="#coach-help">Conseils et aides</a>
        </div>
      </aside>
      <section className="coach-home-planning account-dashboard-card" id="coach-planning">
        <div className="coach-home-card-head">
          <h3>Mon planning</h3>
          <span>Vos réservations</span>
        </div>
        <p>Horaires Europe/Paris. Les demandes, confirmations et annulations sont actualisées avec le suivi des réservations.</p>
        <div className="coach-home-schedule">
          <CoachPlanningSchedule reservations={reservations} coachId={coachId} loading={financeLoading} error={financeError} />
        </div>
      </section>
      <CoachRequestsPanel coachId={coachId} onReservationsChanged={updateCoachReservations} />
      {allowDemoFallback ? <><Affiliations role="coach" onActiveChange={setMessageContacts} /><GroupPrices coachId={coachId} /><StructureSessions coach /></> : null}
      {coachProfile ? (
        <CoachProfileEditor
          coachId={coachProfile.id}
          specialty={coachProfile.specialty}
          city={coachProfile.city}
          priceFrom={coachProfile.priceFrom}
          description={coachProfile.description}
          disciplines={coachProfile.disciplines}
          diplomas={coachProfile.diplomas}
          sessionTypes={coachProfile.sessionTypes}
          availability={coachProfile.availability}
          photoUrl={coachProfile.photoUrl}
          bankAccountLast4={coachProfile.bankAccountLast4}
          latitude={coachProfile.latitude}
          longitude={coachProfile.longitude}
          serviceRadiusKm={coachProfile.serviceRadiusKm}
          gender={coachProfile.gender}
          practice={coachProfile.practice}
          level={coachProfile.level}
          format={coachProfile.format}
          availabilityTags={coachProfile.availabilityTags}
        />
      ) : (
        <section className="account-dashboard-card" id="coach-profile-editor" data-coach-profile-unavailable>
          <h3>Profil coach indisponible</h3>
          <p>Votre profil sera affiché dès qu’il aura été créé et vérifié par l’administrateur.</p>
        </section>
      )}
      <MessageInbox recipientName={coachName} contacts={allowDemoFallback ? messageContacts : undefined} contactKind="structure" />
      <section className="account-dashboard-card" id="coach-help">
        <h3>Conseils et aides</h3>
        <p>Complétez votre profil, consultez les demandes puis acceptez uniquement les séances que vous pouvez assurer. Retrouvez vos échanges dans la messagerie.</p>
        <a href="#coach-requests">Consulter mes demandes</a>
      </section>
      <section className="account-dashboard-card coach-home-summary" data-coach-summary>
        <div className="coach-home-card-head">
          <h3>Mon activité</h3>
          <span>Données actualisées</span>
        </div>
        <div className="coach-home-profile-preview-grid">
          <div><span>Demandes à traiter</span><strong data-coach-request-count>{requestedCount}</strong></div>
          <div><span>Réservations confirmées</span><strong data-coach-accepted-count>{acceptedCount}</strong></div>
          <div><span>Part coach documentée · créations en {monthlyFinance?.label} (Paris)</span><strong data-coach-finance-overview>{financeLoading?"Chargement…":financeError||!monthlyFinance?.totals?"Indisponible":formatFinanceCents(monthlyFinance.totals.coachCents)}</strong></div>
        </div>
      </section>
      <div className="coach-home-focus">
        <article className="account-dashboard-card coach-home-next-session" id="coach-dashboard" data-coach-display-block="next-session">
          <div className="coach-home-editorial-image coach-home-editorial-image--session" aria-hidden="true">
            <Image src="/images/demo-sport.svg" alt="" fill sizes="(max-width: 900px) 100vw, 42vw" />
          </div>
          <div className="coach-home-card-head">
            <h3>Prochaines séances</h3>
            <div className="coach-home-next-head-actions">
              {!financeLoading && !financeError && nextSession.next ? <time dateTime={new Date(nextSession.next.start).toISOString()}>{formatBookingSlot(new Date(nextSession.next.start).toISOString())}</time> : <span>{financeLoading ? "Chargement…" : financeError ? "Planning indisponible" : "Aucune séance datée"}</span>}
            </div>
          </div>
          <div className="coach-home-next-copy coach-home-next-copy--plain">
            {financeLoading ? <p role="status">Chargement des prochaines séances…</p> : financeError ? <p role="alert">Planning indisponible. Recharge la page pour réessayer.</p> : <>
              {nextReservation ? <><strong>{nextReservation.service}</strong><span>{nextSession.ongoing ? "Séance en cours" : "Séance à venir"} · Europe/Paris</span><span>{nextReservation.duration}</span><span>{nextReservation.city}</span><span>{nextReservation.status === "paid" ? "Payée" : "Acceptée · paiement en attente"}</span><span>{nextReservation.price} EUR</span></> : <p data-coach-next-empty>Aucune séance datée à venir ou en cours.</p>}
              {nextSession.unknownSchedule > 0 ? <p>{nextSession.unknownSchedule} réservation(s) acceptée(s) ou payée(s) avec un horaire non déterminé. Consulte le planning pour vérifier les créneaux.</p> : null}
            </>}
          </div>
          <a className="coach-home-inline-link" href="#coach-requests">Suivre les demandes et paiements</a>
        </article>
        <article className="account-dashboard-card coach-home-rating" data-coach-display-block="rating">
          <div className="coach-home-mini-tabs">
            <span className="is-active">Ma note</span>
            <span>Mes avis</span>
          </div>
          <div className="coach-home-rating-score">{coachProfile ? `${coachProfile.rating.toFixed(1)} / 5` : "Non renseignée"}</div>
          <p>{coachProfile ? `${coachProfile.reviewCount} avis vérifiés.` : "La note sera affichée après les premiers avis vérifiés."}</p>
        </article>
        <article className="account-dashboard-card coach-home-revenue" id="coach-payments" data-coach-display-block="revenue">
          <div className="coach-home-card-head">
            <h3>Montants des réservations</h3>
          </div>
          <form className={financeFilterStyles.filter} aria-label="Période des montants coach" onSubmit={event=>{event.preventDefault();if(!isCoachMonth(financeMonthDraft)){setFinanceMonthError("Choisis un mois valide entre 2000 et 9999.");return;}setFinancePeriod(financeMonthDraft);setFinanceMonthError("");}}>
            <label className={financeFilterStyles.month}>Mois de création
              <input type="month" min="2000-01" max="9999-12" required value={financeMonthDraft} aria-describedby="coach-finance-period-hint" onInvalid={()=>setFinanceMonthError("Choisis un mois valide entre 2000 et 9999.")} onChange={event=>{setFinanceMonthDraft(event.target.value);setFinanceMonthError("");}} />
            </label>
            <button className="auth-secondary" type="submit">Appliquer le mois</button>
            <button className="auth-secondary" type="button" onClick={()=>{const month=coachMonthKey();setFinancePeriod(month);setFinanceMonthDraft(month);setFinanceMonthError("");}}>Mois courant</button>
          </form>
          <p id="coach-finance-period-hint">Le mois et l’année sont appliqués après validation. Filtre de création en Europe/Paris, sans changement des données.</p>
          {financeMonthError?<p role="alert">{financeMonthError}</p>:null}
          <CoachFinanceSummary summary={monthlyFinance} loading={financeLoading} error={financeError} demo={allowDemoFallback} />
        </article>
        <article className="account-dashboard-card coach-home-profile-preview" data-coach-display-block="profile-preview">
          <div className="coach-home-editorial-image coach-home-editorial-image--profile" aria-hidden="true">
            <Image src={coachProfile?.photoUrl || "/images/demo-sport.svg"} alt="" fill sizes="(max-width: 900px) 100vw, 100vw" />
          </div>
          <div className="coach-home-card-head">
            <h3>Aperçu de mon profil</h3>
            <span>Vue élève</span>
          </div>
          <div className="coach-home-profile-preview-head">
            <strong>{coachProfile?.name ?? coachName}</strong>
            <span>{coachProfile?.verified ? "Coach vérifié" : "Profil en attente de vérification"}</span>
          </div>
          <div className="coach-home-profile-preview-grid">
            <div>
              <span>Zone</span>
              <strong>{coachProfile?.city ?? "À renseigner"}</strong>
            </div>
            <div>
              <span>Formats</span>
              <strong>{coachProfile?.sessionTypes ?? "À renseigner"}</strong>
            </div>
            <div>
              <span>Tarif d'appel</span>
              <strong>{coachProfile ? `${coachProfile.priceFrom} EUR / séance` : "À renseigner"}</strong>
            </div>
            <div>
              <span>Disponibilité</span>
              <strong>{coachProfile?.availability ?? "À renseigner"}</strong>
            </div>
          </div>
          <p className="coach-home-profile-preview-copy">
            L'élève voit ici les informations essentielles avant de cliquer : zone, formats de séance, premier prix, disponibilité et niveau de confiance.
          </p>
        </article>
        <div className="coach-home-standalone-cta">
          <a
            className="coach-home-inline-link coach-home-inline-link--ghost coach-home-inline-link-prominent"
            href={buildNextPath(nextRoutes.coach, { sport: coachProfile?.sport, city: coachProfile?.city, coach: coachName })}
          >
            Voir mon profil en ligne
          </a>
        </div>
      </div>
      {false ? <section className="account-dashboard-card coach-home-messages" id="coach-messages">
        <div className="coach-home-card-head">
          <h3>Messagerie</h3>
          <span>4 conversations</span>
        </div>
        <div className="coach-home-message-list">
          <article>
            <strong>Fordant Steven</strong>
            <span>Question sur la prochaine séance et la disponibilité du terrain.</span>
          </article>
          <article>
            <strong>Fordant Christopher</strong>
            <span>Demande d'ajustement d'horaire pour la session de demain.</span>
          </article>
          <article>
            <strong>Vazquez Eliott</strong>
            <span>Confirmation de présence et besoin de conseils avant la séance.</span>
          </article>
          <article>
            <strong>Seck Madison</strong>
            <span>Retour sur les contenus premium et demande d'accès au planning.</span>
          </article>
        </div>
      </section> : null}
    </section>
  );
}

function ClubLeadPanel() {
  const [lead, setLead] = useState<{
    clubName: string;
    managerName: string;
    email: string;
    phone?: string;
    addressLabel?: string;
    latitude?: number;
    longitude?: number;
    logoFileName?: string;
    identityFileName?: string;
    createdAt: string;
    status: "pending" | "contacted" | "closed";
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/clubs/me", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "Demande club indisponible");
        if (active) setLead(payload.data ?? null);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "Demande club indisponible");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="account-dashboard club-home" data-club-affiliation>
      <section className="account-dashboard-card" data-club-production-state>
        <h1>Espace club</h1>
        {loading ? <p data-club-lead-loading>Verification de votre demande d'affiliation...</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {!loading && !error && lead ? (
          <div data-club-lead-status>
            <p><strong>{lead.clubName}</strong> - demande envoyee le {new Date(lead.createdAt).toLocaleDateString("fr-FR")}</p>
            <p>Statut : <strong>{lead.status === "pending" ? "Demande recue" : lead.status === "contacted" ? "Prise de contact en cours" : "Dossier cloture"}</strong></p>
            <p>Prochaine etape avec {lead.managerName} : nous vous recontacterons a {lead.email}.</p>
            {lead.addressLabel ? <p data-club-location-status>Localisation enregistrée pour la recherche de proximité : <strong>{lead.addressLabel}</strong>{lead.latitude != null && lead.longitude != null ? " · position GPS confirmée" : ""}.</p> : null}
            {lead.logoFileName || lead.identityFileName ? <p>Pieces transmises : {[lead.logoFileName, lead.identityFileName].filter(Boolean).join(" - ")}</p> : null}
          </div>
        ) : null}
        {!loading && !error && !lead ? <p>Aucune demande d'affiliation n'est rattachee a ce compte.</p> : null}
      </section>
    </section>
  );
}

function ClubDashboard({ allowDemoFallback }: { allowDemoFallback: boolean }) {
  const [messageContacts, setMessageContacts] = useState<Array<{ value: string; label: string }>>([]);
  return <section className="account-dashboard" data-account-dashboard="club"><ClubLeadPanel />{allowDemoFallback ? <><Affiliations role="club" onActiveChange={setMessageContacts} /><StructureSessions /><MessageInbox contacts={messageContacts} /></> : null}</section>;
}

import { SiteFooter } from "@/components/SiteFooter";
function AccountFooter() {
  return <SiteFooter />;
  /*
  return (
    <footer className="account-footer">
      <div className="account-footer-grid">
        <div className="account-footer-brand">
          <div className="footer-brand">GETYOURMENTOR</div>
          <div className="account-socials" aria-label="Réseaux sociaux">
            <a href="#instagram" aria-label="Instagram">
              IG
            </a>
            <a href="#facebook" aria-label="Facebook">
              FB
            </a>
          </div>
        </div>
        <div className="account-footer-column">
          <h3>A propos de GetYourMentor</h3>
          <a href={`${nextRoutes.account}?mode=coach`}>Je suis coach</a>
          <a href={`${nextRoutes.account}?mode=coach`}>Rejoignez-nous</a>
          <a href="/legal/cgu">CGU</a>
          <a href="/legal/confidentialite">Politique de confidentialité</a>
          <a href="/legal/cookies">Gestion des cookies</a>
          <a href="/legal/accessibilite">Accessibilité</a>
        </div>
        <div className="account-footer-column">
          <h3>Trouvez votre coach</h3>
          <a href={`${nextRoutes.search}?sport=football`}>Football</a>
          <a href={`${nextRoutes.search}?sport=basketball`}>Basketball</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Fitness</a>
          <a href={`${nextRoutes.search}?sport=sports-de-combat`}>Sports de combat</a>
          <a href={`${nextRoutes.search}?sport=metiers-de-la-forme`}>Coaching en visio</a>
          <a href={`${nextRoutes.search}?sport=football`}>Coaching en présentiel</a>
        </div>
        <div className="account-footer-column">
          <h3>Recherches fréquentes</h3>
          <a href={`${nextRoutes.directory}?sport=football&city=Paris`}>Coach sportif Paris</a>
          <a href={`${nextRoutes.directory}?sport=metiers-de-la-forme&city=Marseille`}>Coach sportif Marseille</a>
          <a href={`${nextRoutes.directory}?sport=basketball&city=Lyon`}>Coach sportif Lyon</a>
          <a href={`${nextRoutes.directory}?sport=metiers-de-la-forme&city=Lille`}>Coach fitness Lille</a>
        </div>
      </div>
      <div className="account-footer-bottom">Copyright &copy; 2026 GetYourMentor</div>
    </footer>
  );
  */
}

export function AccountLegacyPage({ legacyStyles, params, allowDemoFallback = false, athleteEmail }: AccountLegacyPageProps) {
  const [authenticatedAthleteEmail,setAuthenticatedAthleteEmail]=useState(athleteEmail);
  const mode = params.mode;
  const redirect = params.redirect;
  const isCoachMode = mode === "coach";
  const isClubMode = mode === "club";
  const isAdminMode = mode === "admin";
  const [step, setStep] = useState<StepName>("signin");
  const [status, setStatus] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [authBusy,setAuthBusy] = useState(false);
  const authLock = useRef(false);
  const [authenticatedCoachName, setAuthenticatedCoachName] = useState("");
  const [authenticatedCoachId, setAuthenticatedCoachId] = useState(params.coachId);
  const [dashboardMode, setDashboardMode] = useState<DashboardMode>(
    params.connected === "1" && redirect !== "paiement" ? (isClubMode ? "club" : isCoachMode ? "coach" : isAdminMode ? "admin" : "sportif") : null,
  );
  const [sessionIndex, setSessionIndex] = useState(0);
  const [pendingSignup, setPendingSignup] = useState<{
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    email: string;
    password: string;
    termsAccepted: boolean;
  } | null>(null);

  const paymentTarget = useMemo(
    () =>
      buildNextPath(nextRoutes.payment, {
        sport: params.sport,
        city: params.city,
        coach: params.coach,
        service: params.service,
        duration: params.duration,
        price: params.price,
        objective: params.objective,
        format: params.format,
        package: params.package,
        slot: params.slot,
        mentor: params.mentor,
        reservationId: params.reservationId,
        connected: "1",
      }),
    [params],
  );

  const coachName = authenticatedCoachName || params.coach || "Coach Démo 01";

  const revealDashboard = (modeToShow: DashboardMode) => {
    if (!modeToShow) return;
    setStatus("");
    setStep("signin");
    setDashboardMode(modeToShow);
  };

  return (
    <>
      <style jsx global>{legacyStyles}</style>
      <div className="site-shell account-shell" id="gym-account" data-gym-design="pitch-v1">
        <AccountHeader />
        <main className={`account-page${dashboardMode ? " is-coach-mode" : ""}`} data-account-page>
          <section className="account-panel">
            {dashboardMode ? <AccountSessionControls role={dashboardMode} onSignedOut={() => { setDashboardMode(null); setAuthenticatedCoachName(""); setAuthenticatedCoachId(undefined); setPendingSignup(null); }} /> : null}
            <div id="account-content" />
            {!dashboardMode ? (
              <AccountAuthShell
                step={step}
                isCoachMode={isCoachMode}
                status={status}
                busy={authBusy}
                passwordVisible={passwordVisible}
                onTogglePassword={() => setPasswordVisible((current) => !current)}
                onSubmitSignIn={async ({ email, password }) => {
                  if(authLock.current)return;authLock.current=true;setAuthBusy(true);setStatus("");
                  try {
                  const response = await fetch("/api/auth/sign-in", {
                    method: "POST",
                    signal: AbortSignal.timeout(15000),
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password, role: isCoachMode ? "coach" : isClubMode ? "club" : isAdminMode ? "admin" : "sportif" }),
                  });
                  const payload = {data: await readAuthFormData(response,email)};
                  if (payload.data?.coachName) setAuthenticatedCoachName(payload.data.coachName);
                  if (payload.data?.coachId) setAuthenticatedCoachId(payload.data.coachId);
                  const resolvedRole = payload.data?.role as DashboardMode;
                  if (redirect === "paiement" && resolvedRole === "sportif") {
                    window.location.href = paymentTarget;
                    return;
                  }
                  if (resolvedRole === "coach") {
                    revealDashboard("coach");
                    return;
                  }
                  if (resolvedRole === "club") {
                    revealDashboard("club");
                    return;
                  }
                  if (resolvedRole === "admin") {
                    revealDashboard("admin");
                    return;
                  }
                  setAuthenticatedAthleteEmail(typeof payload.data?.email === "string" ? payload.data.email : undefined);
                  revealDashboard("sportif");
                  } catch(error) {setStatus(error instanceof FormRejection ? error.message : "Connexion non confirmée. Vérifiez votre connexion avant de réessayer.");}
                  finally {authLock.current=false;setAuthBusy(false);}
                }}
                onOpenSignup={() => { setStep("create"); }}
                onBack={setStep}
                onChooseRole={async (role) => {
                  if(authLock.current)return;authLock.current=true;setAuthBusy(true);setStatus("");
                  try {
                  if (role === "club") {
                    window.location.href = buildNextPath(nextRoutes.clubSignup, { source: "compte" });
                    return;
                  }
                  if (!pendingSignup) {
                    setStatus("Commencez par renseigner vos informations.");
                    setStep("create");
                    return;
                  }
                  const response = await fetch("/api/auth/sign-up", {
                    method: "POST",
                    signal: AbortSignal.timeout(15000),
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...pendingSignup, role }),
                  });
                  const payload = {data: await readAuthFormData(response,pendingSignup.email,role)};
                  if (role === "coach" && payload.data?.coachName) setAuthenticatedCoachName(payload.data.coachName);
                  if (role === "coach" && payload.data?.coachId) setAuthenticatedCoachId(payload.data.coachId);
                  if (role === "sportif") setAuthenticatedAthleteEmail(typeof payload.data?.email === "string" ? payload.data.email : undefined);
                  if(role === "sportif" && redirect === "paiement") {window.location.href=paymentTarget;return;}
                  revealDashboard(role);
                  } catch(error) {setStatus(error instanceof FormRejection ? error.message : "Inscription non confirmée. Essayez de vous connecter avant de renouveler la demande.");setStep("create");}
                  finally {authLock.current=false;setAuthBusy(false);}
                }}
                onSubmitCreate={({ firstName, lastName, phone, city, email, emailConfirmation, password, passwordConfirmation, termsAccepted }) => {
                  if (!firstName || !lastName || !phone) {
                    setStatus("Prénom, nom et téléphone sont requis.");
                    return;
                  }
                  if (!email || email !== emailConfirmation) {
                    setStatus("Les adresses email doivent correspondre.");
                    return;
                  }
                  if (!password || password !== passwordConfirmation) {
                    setStatus("Les mots de passe doivent correspondre.");
                    return;
                  }
                  if (!termsAccepted) {
                    setStatus("Vous devez accepter les CGU pour continuer.");
                    return;
                  }
                  setPendingSignup({ firstName, lastName, phone, city, email, password, termsAccepted });
                  setStatus("");
                  setStep("role");
                }}
              />
            ) : null}
            {allowDemoFallback && dashboardMode ? <p><a href="/beta">Retours bêta et suggestions</a></p> : null}
            {allowDemoFallback && dashboardMode ? <p><a href="/offres">Offres et aperçu de démonstration</a></p> : null}
            {allowDemoFallback && dashboardMode ? <p><a href="/contenus">Contenus et bibliothèque de démonstration</a></p> : null}
            {allowDemoFallback && dashboardMode === "sportif" ? <p><a href="/suivi">Mon suivi personnel de démonstration</a></p> : null}
            {dashboardMode === "sportif" ? <AthleteDashboard key={authenticatedAthleteEmail} demo={allowDemoFallback} email={authenticatedAthleteEmail} /> : null}
            {dashboardMode === "admin" ? <AdminDashboard /> : null}
            {dashboardMode === "coach" ? (
              <CoachDashboard
                coachName={coachName}
                coachId={authenticatedCoachId}
                allowDemoFallback={allowDemoFallback}
              />
            ) : null}
            {dashboardMode === "club" ? <ClubDashboard allowDemoFallback={allowDemoFallback} /> : null}
          </section>
        </main>
        <AccountFooter />
      </div>
    </>
  );
}
