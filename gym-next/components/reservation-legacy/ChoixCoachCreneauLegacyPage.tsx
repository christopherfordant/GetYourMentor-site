"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { demoCalendarWeeks, BOOKING_TIME_ZONE, intervalsOverlap, formatBookingSlot } from "@/lib/domain/booking-time";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";
import { bookingAvailability, bookingConfirmation, type BookingExpectation } from "@/lib/booking-form-contract";
import { FormRejection, readFormData } from "@/lib/access-form-response";
import { DiscoveryFrame } from "@/components/discovery/DiscoveryFrame";

type ChoixCoachCreneauLegacyPageProps = {
  demo: boolean;
  calendarNow: number;
  params: Record<string, string | undefined>;
};

type PendingAttempt = { id: string; context: string; body: Record<string, unknown>; expected: BookingExpectation; navigation: Record<string, string>; createdAt: number };
const pendingKey = "gym-booking-pending-v1";

type WeekDay = {
  day: string;
  date: string;
  slots: string[];
};



function ReservationMainHeader({
  coach,
  city,
}: {
  coach: string;
  city: string;
}) {
  return (
    <section className="bk-reservation-header">
      <h1 data-multi-name>{coach}</h1>
      <div className="bk-reservation-address" data-multi-address>{city}</div>
      <p className="bk-reservation-meta" data-multi-meta>Une demande, puis l’accord du coach. Le paiement vient après son acceptation.</p>
    </section>
  );
}

function ReservationSelectedStep({
  service,
  serviceMeta,
  selectedMentor,
  onMentorChange,
  onBackToCoach,
  backToCoachHref,
}: {
  service: string;
  serviceMeta: string;
  selectedMentor: string;
  onMentorChange: (mentor: string) => void;
  onBackToCoach: () => void;
  backToCoachHref: string;
}) {
  return (
    <section className="bk-reservation-step">
      <h2>
        <span>1.</span> Séance sélectionnée
      </h2>
      <div className="bk-reservation-selection-panel">
        <div className="bk-reservation-selection-top">
          <div className="bk-reservation-selection-copy">
            <strong data-multi-service>{service}</strong>
            <div data-multi-service-meta>{serviceMeta}</div>
          </div>
          <a
            className="bk-reservation-remove"
            href={backToCoachHref}
            data-multi-remove
            onClick={(event) => {
              event.preventDefault();
              onBackToCoach();
            }}
          >
            Revoir le coach
          </a>
        </div>

        <div className="bk-reservation-coach-choice">
          <p>Votre coach</p>
          <div className="bk-reservation-coach-grid" data-multi-coaches>
            {[{ id: selectedMentor.charAt(0), name: selectedMentor }].map((item) => (
              <button
                key={item.name}
                className={`bk-reservation-coach-option${item.name === selectedMentor ? " is-active" : ""}`}
                type="button"
                aria-pressed={item.name === selectedMentor}
                data-mentor={item.name}
                onClick={() => onMentorChange(item.name)}
              >
                <span className="bk-reservation-coach-id">{item.id}</span>
                <span className="bk-reservation-coach-name">{item.name}</span>
                <span className="bk-reservation-coach-radio" aria-hidden="true"></span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="bk-reservation-add-button" type="button" data-multi-add onClick={onBackToCoach}>
        Choisir une autre séance
      </button>
    </section>
  );
}

function ReservationCalendarStep({
  weekIndex,
  weeks,
  selectedSlot,
  onPrevWeek,
  onNextWeek,
  onSelectSlot,
  preview,
  uncertain,
  onConfirm,
  submitting,
  error,
  bookedSlots,
  availabilityLoading,
  availabilityError,
  onRetry,
}: {
  weekIndex: number;
  weeks: WeekDay[][];
  selectedSlot: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onSelectSlot: (slot: string) => void;
  preview: string;
  uncertain: boolean;
  onConfirm: (event: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  error: string;
  bookedSlots: string[];
  availabilityLoading: boolean;
  availabilityError: string;
  onRetry: () => void;
}) {
  const currentWeek = weeks[weekIndex];

  return (
    <form className="bk-reservation-step" aria-label="Demande de réservation individuelle" onSubmit={onConfirm} aria-busy={submitting} aria-describedby="booking-help booking-feedback">
      <h2>
        <span>2.</span> Choix de la date &amp; heure
      </h2>
      <p id="booking-help" className="booking-calendar-help">Choix obligatoire, pour une personne. Fuseau Europe/Paris. Choisis un horaire disponible. Sur mobile, fais défiler le calendrier horizontalement pour voir tous les jours.</p>
      <div className="bk-reservation-calendar-card" tabIndex={0} role="region" aria-label="Calendrier des horaires de démonstration" aria-busy={availabilityLoading} aria-describedby="booking-help booking-feedback">
        {availabilityLoading ? <p className="bk-reservation-loading" role="status">Vérification des disponibilités…</p> : null}
        {availabilityError ? <div className="bk-reservation-inline-error"><p role="alert">{availabilityError}</p><button type="button" disabled={submitting||uncertain} onClick={onRetry}>Réessayer les disponibilités</button></div> : null}
        <div className="bk-reservation-calendar-head">
          <button className="calendar-arrow" type="button" disabled={submitting||uncertain} aria-label="Semaine précédente" data-calendar-prev onClick={onPrevWeek}>
            ‹
          </button>
          <div className="bk-reservation-days" data-multi-days>
            {currentWeek.map((item) => (
              <div className="bk-reservation-day" key={`${item.day}-${item.date}`}>
                <strong>{item.day}</strong>
                <span>{item.date}</span>
              </div>
            ))}
          </div>
          <button className="calendar-arrow" type="button" disabled={submitting||uncertain} aria-label="Semaine suivante" data-calendar-next onClick={onNextWeek}>
            ›
          </button>
        </div>
        <div className="bk-reservation-slots-grid" data-multi-slots-grid>
          {currentWeek.map((item) => (
            <div className="bk-reservation-slot-column" key={`${item.day}-${item.date}-slots`}>
              {item.slots.length ? (
                item.slots.map((slot) => (
                  <button
                    key={`${item.day}-${slot}`}
                    className={`bk-reservation-slot${slot === selectedSlot ? " is-selected" : ""}${bookedSlots.includes(slot) ? " is-booked" : ""}`}
                    type="button"
                    aria-label={`${item.day} ${item.date}, ${slot}${bookedSlots.includes(slot) ? ", indisponible" : ""}`}
                    aria-pressed={slot === selectedSlot}
                    data-slot={slot}
                    data-slot-booked={bookedSlots.includes(slot) ? "true" : "false"}
                    disabled={submitting||uncertain||availabilityLoading||!!availabilityError||bookedSlots.includes(slot)||Date.parse(slot)<=Date.now()}
                    onClick={() => onSelectSlot(slot)}
                  >
                    {new Intl.DateTimeFormat("fr-FR", { timeZone: BOOKING_TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(new Date(slot))}{bookedSlots.includes(slot) ? " (pris)" : ""}
                  </button>
                ))
              ) : (
                <button className="bk-reservation-slot" type="button" disabled>
                  -
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <section className="bk-request-preview" aria-label="Récapitulatif avant envoi"><h3>Votre demande</h3><p>{preview}</p><p>{selectedSlot ? formatBookingSlot(selectedSlot) : "Sélectionnez un horaire dans le calendrier."} · Europe/Paris</p><p>1 participant · accord du coach requis avant paiement.</p>{bookedSlots.includes(selectedSlot) ? <p role="alert">Ce créneau sélectionné n’est plus disponible. Choisissez un autre horaire.</p> : null}</section>
      <div className="bk-reservation-cta-row">
        <button type="submit" className="bk-reservation-confirm-button" data-multi-confirm aria-busy={submitting}
          disabled={Boolean(availabilityError)||availabilityLoading||submitting||uncertain||!selectedSlot||bookedSlots.includes(selectedSlot)}
          aria-disabled={Boolean(availabilityError)||availabilityLoading||submitting||uncertain||!selectedSlot||bookedSlots.includes(selectedSlot)}>
          {submitting ? "Envoi de la demande…" : uncertain ? "Envoi à vérifier" : availabilityLoading ? "Vérification…" : "Envoyer ma demande"}
        </button>
      </div>
      <p id="booking-feedback" role={error ? "alert" : "status"} className={error ? "bk-reservation-error" : undefined}>{error}</p>
      {error&&!uncertain ? <button type="button" className="bk-reservation-add-button" disabled={submitting||availabilityLoading} onClick={onRetry}>Actualiser les disponibilités</button> : null}
      {uncertain ? <p className="booking-note">Ne renouvelez pas l’envoi. Si vous étiez connecté, vérifiez votre demande dans <a href="/compte">Mon compte</a>. Vous pouvez vérifier le résultat ci-dessous si une reprise a été préparée.</p> : null}
    </form>
  );
}


export function ChoixCoachCreneauLegacyPage({
  demo,
  calendarNow,
  params,
}: ChoixCoachCreneauLegacyPageProps) {
  const sport = params.sport || "metiers-de-la-forme";
  const city = params.city || "Marseille";
  const coach = params.coach || "Studio Démo";
  const service = params.service || "Coaching remise en forme";
  const duration = params.duration || "30min";
  const price = params.price || "35 ";
  const objective = params.objective || "";
  const format = params.format || "";
  const packageLabel = params.package || "";

  const [weeks] = useState<WeekDay[][]>(() => demoCalendarWeeks(calendarNow));
  const [selectedSlot, setSelectedSlot] = useState(weeks.flatMap(w=>w.flatMap(d=>d.slots)).includes(params.slot||"") ? params.slot! : "");
  const [selectedMentor, setSelectedMentor] = useState(coach);
  const [weekIndex, setWeekIndex] = useState(0);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uncertain,setUncertain] = useState(false);
  const sendLock=useRef(false);
  const generation=useRef(0);

  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryContext, setRecoveryContext] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAttempt | null>(null);
  const [canResume, setCanResume] = useState(false);
  const recoveryBusy = useRef(false);
  useEffect(() => {
    let active = true;
    try {
      const raw = sessionStorage.getItem(pendingKey);
      if (raw) {
        const value = JSON.parse(raw) as PendingAttempt;
        if (!value || typeof value.id !== "string" || !value.expected || !value.body || !value.navigation || typeof value.createdAt !== "number") throw new Error();
        setPending(value); setUncertain(true); sendLock.current = true;
        setError("Un envoi précédent doit être vérifié avant toute nouvelle demande.");
      }
    } catch { setUncertain(true); sendLock.current = true; setError("La reprise locale est illisible. Vérifiez vos réservations avant de poursuivre."); }
    fetch("/api/reservations/recovery", { cache: "no-store", signal: AbortSignal.timeout(10000) })
      .then(async response => { if (!response.ok) throw new Error(); const data = await response.json();
        if (data.supported !== false && (data.supported !== true || typeof data.context !== "string" || !/^[0-9a-f]{64}$/.test(data.context))) throw new Error();
        if (active) { setRecoveryContext(data.supported ? data.context : null); setRecoveryReady(true); }
      }).catch(() => { if (active) setError("La préparation de la réservation est indisponible. Rechargez la page avant tout envoi."); });
    return () => { active = false; };
  }, []);

  function finishAttempt(data: Record<string, unknown>, attempt: PendingAttempt) {
    const saved = bookingConfirmation(data, attempt.expected);
    sessionStorage.removeItem(pendingKey);
    window.location.href = buildNextPath(nextRoutes.recap, { ...attempt.navigation, price: String(saved.price), slot: attempt.expected.slot, reservationId: saved.id, claimToken: attempt.context ? undefined : saved.claimToken });
  }
  async function recoverAttempt(resume = false) {
    if (!pending || recoveryBusy.current || !recoveryReady) return;
    if (pending.context !== recoveryContext || Date.now() - pending.createdAt > 86400000) {
      setError("La session a changé ou la tentative a expiré. Vérifiez vos réservations ; aucun nouvel envoi n’a été effectué."); return;
    }
    recoveryBusy.current = true; setSubmitting(true); const operation = generation.current;
    try {
      const response = await fetch(resume ? "/api/reservations" : "/api/reservations/recovery", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
        body: JSON.stringify(resume ? { ...pending.body, creationAttemptId: pending.id, creationContext: pending.context } : { creationAttemptId: pending.id, creationContext: pending.context }),
      });
      if (operation !== generation.current) return;
      const payload = await response.json();
      if (operation !== generation.current) return;
      if (!response.ok) throw new Error();
      if (!resume && payload.state === "not-recorded") {
        setCanResume(true); setError("Aucun reçu retrouvé pour l’instant. Vous pouvez reprendre exactement le même envoi ; le serveur vérifiera son identifiant.");
      } else {
        finishAttempt(payload.data, pending);
      }
    } catch { if (operation === generation.current) { setCanResume(false); setError("Résultat toujours non confirmé. Vérifiez à nouveau sans créer une nouvelle demande."); } }
    finally { recoveryBusy.current = false; if (operation === generation.current) setSubmitting(false); }
  }

  const displayPrice = price.includes("€") ? price : `${price.trim()} €`;
  const serviceMeta = [duration, displayPrice, format, objective, packageLabel].filter(Boolean).join(" · ");

  useEffect(() => {
    const controller=new AbortController();let active=true;
    setAvailabilityLoading(true);setAvailabilityError("");
    fetch(`/api/reservations?coachId=${encodeURIComponent(coach)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])})
      .then(response=>{if(!response.ok)throw new Error();return response.json();})
      .then(payload=>{const reservations=bookingAvailability(payload).filter(r=>["requested","accepted","paid"].includes(r.status));
        const slots=weeks.flatMap(w=>w.flatMap(d=>d.slots)).filter(slot=>reservations.some(r=>intervalsOverlap([slot],duration,r.slots,r.duration)));
        if(active)setBookedSlots(slots);
      }).catch(()=>{if(active)setAvailabilityError("Les disponibilités n’ont pas pu être vérifiées. Vous pouvez réessayer.");})
      .finally(()=>{if(active)setAvailabilityLoading(false);});
    return ()=>{active=false;controller.abort();};
  },[coach,availabilityAttempt,duration,weeks]);
  useEffect(()=>{generation.current++;return ()=>{generation.current++;};},[coach]);

  const backToCoachHref = useMemo(
    () =>
      buildNextPath(nextRoutes.coach, {
        sport,
        city,
        coach,
      }),
    [coach, city, sport],
  );

  async function handleConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendLock.current||uncertain||!recoveryReady) return;
    if (availabilityError) {
      setError("Réessayez la vérification des disponibilités avant d’envoyer votre demande.");
      return;
    }
    if (availabilityLoading) {
      setError("Patientez pendant la vérification des disponibilités.");
      return;
    }
    if (!selectedSlot || bookedSlots.includes(selectedSlot)||Date.parse(selectedSlot)<=Date.now()||!weeks.some(w=>w.some(d=>d.slots.includes(selectedSlot)))) {
      setError("Sélectionnez un créneau disponible.");
      return;
    }
    sendLock.current=true;const operation=generation.current;
    setSubmitting(true);
    setError("");

    const body = { coachId: coach, service, duration, price: Number(price.replace(/[^0-9.,]/g, "").replace(",", ".")) || undefined, slots: [selectedSlot] };
    const attempt: PendingAttempt = { id: crypto.randomUUID(), context: recoveryContext ?? "", body,
      expected: { coachId: params.coachId || "", coachName: coach, sport, city, service, duration, slot: selectedSlot },
      navigation: { sport, city, coach, service, duration, objective, format, package: packageLabel, mentor: selectedMentor }, createdAt: Date.now() };
    try {
      if (recoveryContext) {
        // Only non-authorizing attempt/context and public booking choices. Never persist claimToken/receipt/email.
        sessionStorage.setItem(pendingKey, JSON.stringify(attempt)); setPending(attempt);
      }
    } catch { sendLock.current = false; setSubmitting(false); setError("La reprise ne peut pas être conservée dans cet onglet. Aucun envoi effectué."); return; }
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...(recoveryContext ? { creationAttemptId: attempt.id, creationContext: recoveryContext } : {}) }),
      });

      if(operation!==generation.current)return;
      if(!response.ok&&![400,401,403,404,409,422,429].includes(response.status))throw new Error();
      const data=await readFormData(response);
      if(operation!==generation.current)return;
      finishAttempt(data, attempt);
    } catch (requestError) {
      if(operation!==generation.current)return;
      if(requestError instanceof FormRejection){sessionStorage.removeItem(pendingKey);setPending(null);setError(requestError.message);sendLock.current=false;setSubmitting(false);}
      else {setUncertain(true);setSubmitting(false);setError("Le résultat de l’envoi n’est pas confirmé. La demande peut avoir été enregistrée.");}
    }
  }

  return (
    <DiscoveryFrame page="slot" demo={demo}>
      <div id="gym-booking" className="bk-reservation-shell">

        <main className="bk-reservation-page bk-reservation-page-wide" data-reservation-multi-page>
          <p className="booking-eyebrow">01 / LA DEMANDE DE SÉANCE</p>
          <ReservationMainHeader coach={coach} city={city} />
          <p className="booking-note">Calendrier de démonstration : horaires affichés dans le fuseau Europe/Paris. Les disponibilités proposées sont simulées ; aucune séance réelle n’est réservée.</p>
          <ReservationSelectedStep
            service={service}
            serviceMeta={serviceMeta}
            selectedMentor={selectedMentor}
            onMentorChange={setSelectedMentor}
            backToCoachHref={backToCoachHref}
            onBackToCoach={() => {
              window.location.href = backToCoachHref;
            }}
          />
          <ReservationCalendarStep
            weekIndex={weekIndex}
            weeks={weeks}
            selectedSlot={selectedSlot}
            onPrevWeek={() => setWeekIndex((current) => (current === 0 ? weeks.length - 1 : current - 1))}
            onNextWeek={() => setWeekIndex((current) => (current + 1) % weeks.length)}
            onSelectSlot={(slot) => {
              setSelectedSlot(slot);
              setError("");
            }}
            preview={`${service} · ${coach} · ${serviceMeta}`}
            uncertain={uncertain}
            onConfirm={handleConfirm}
            submitting={submitting}
            error={error}
            bookedSlots={bookedSlots}
            availabilityLoading={availabilityLoading||!recoveryReady}
            availabilityError={availabilityError}
            onRetry={() => {if(!sendLock.current&&!uncertain)setAvailabilityAttempt(current => current + 1);}}
          />
          {pending && uncertain ? <section className="bk-request-preview" aria-label="Reprise de la demande">
            <h2>Vérifier mon envoi</h2>
            <p>{pending.expected.service} · {pending.expected.coachName} · {formatBookingSlot(pending.expected.slot)}. Reprise du même envoi, sans nouvelle sélection.</p>
            <button type="button" className="bk-recap-outline-button" disabled={submitting||!recoveryReady} onClick={() => void recoverAttempt()}>Vérifier le résultat</button>
            {canResume ? <button type="button" className="bk-recap-dark-button" disabled={submitting} onClick={() => void recoverAttempt(true)}>Reprendre le même envoi</button> : null}
          </section> : null}
        </main>

      </div>
    </DiscoveryFrame>
  );
}
