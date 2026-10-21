"use client";
import {useDemoPayment} from "./useDemoPayment";
import recoveryStyles from "./payment-recovery.module.css";
import { formatBookingSlot, reservationStart } from "@/lib/domain/booking-time";

import { useEffect, useState, type RefObject } from "react";
import { nextRoutes } from "@/lib/next-routes";
import { DiscoveryFrame } from "@/components/discovery/DiscoveryFrame";

type PaiementLegacyPageProps = {
  params: Record<string, string | undefined>;
  provider?: "local" | "stripe";
  athleteEmail?:string;
};

function PaymentMain({
  selectedMethod,
  onSelectMethod,
  provider,
}: {
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  provider: "local" | "stripe";
}) {
  return (
    <section className="payment-main">
      <div className="payment-intro">
        <p className="payment-kicker">{provider==="local"?"Paiement simulé":"Paiement securise"}</p>
        <h1>Finaliser votre reservation</h1>
        <p className="payment-subcopy">Choisissez votre mode de paiement pour confirmer votre seance GetYourMentor.</p>
        <div className="payment-intro-visual" aria-hidden="true">
          <div className="payment-intro-shot payment-intro-shot-main"></div>
          <div className="payment-intro-shot payment-intro-shot-secondary"></div>
          <div className="payment-intro-badge">{provider==="local"?"Démonstration":"Coach confirme"}</div>
        </div>
      </div>

      <section className="payment-card">
        <header className="payment-card-head">
          <h2>{provider==="local"?"Simulation du paiement":"Moyen de paiement"}</h2>
          <p>{provider === "stripe" ? "Les coordonnées bancaires sont saisies uniquement sur la page sécurisée Stripe." : "Paiement de démonstration : aucun débit réel. Ne saisissez aucune donnée bancaire."}</p>
        </header>

        {provider === "local" ? <div className="payment-methods" aria-label="Modes illustratifs, tous utilisent la même simulation">
          <button aria-pressed={selectedMethod === "card"} className={`payment-method${selectedMethod === "card" ? " is-active" : ""}`} type="button" data-method="card" onClick={() => onSelectMethod("card")}>
            <strong>Carte fictive</strong>
            <span>Visa, Mastercard, CB</span>
          </button>
          <button aria-pressed={selectedMethod === "apple-pay"} className={`payment-method${selectedMethod === "apple-pay" ? " is-active" : ""}`} type="button" data-method="apple-pay" onClick={() => onSelectMethod("apple-pay")}>
            <strong>Apple Pay</strong>
            <span>Illustration sans service externe</span>
          </button>
          <button aria-pressed={selectedMethod === "google-pay"} className={`payment-method${selectedMethod === "google-pay" ? " is-active" : ""}`} type="button" data-method="google-pay" onClick={() => onSelectMethod("google-pay")}>
            <strong>Google Pay</strong>
            <span>Illustration sans service externe</span>
          </button>
          <button aria-pressed={selectedMethod === "onsite"} className={`payment-method${selectedMethod === "onsite" ? " is-active" : ""}`} type="button" data-method="onsite" onClick={() => onSelectMethod("onsite")}>
            <strong>Sur place</strong>
            <span>Illustration de démonstration</span>
          </button>
        </div> : null}

        {provider === "local" ? <div className="payment-form">
          <label className="payment-field">
            <span>Nom sur la carte</span>
            <input type="text" defaultValue="Client fictif GetYourMentor" readOnly />
          </label>
          <label className="payment-field">
            <span>Numero de carte</span>
            <input type="text" defaultValue="4242 4242 4242 4242" readOnly />
          </label>
          <div className="payment-field-row">
            <label className="payment-field">
              <span>Expiration</span>
              <input type="text" defaultValue="12 / 28" readOnly />
            </label>
            <label className="payment-field">
              <span>CVC</span>
              <input type="text" defaultValue="123" readOnly />
            </label>
          </div>
          <label className="payment-checkbox">
            <input type="checkbox" defaultChecked />
            <span>J&apos;accepte les conditions de reservation du coach.</span>
          </label>
        </div> : null}
      </section>
    </section>
  );
}

function PaymentSide({
  coach,
  city,
  service,
  duration,
  format,
  objective,
  packageLabel,
  slot,
  price,
  mentor,
  selectedMethod,
  success,
  onSubmit,
  paymentReady,
  paymentError,
  reservationStatus,
  reservationCode,
  reservationId,
  processing,
  awaitingConfirmation,
  appointmentLabel,
  demo=false,legacy=false,onCheck,checking=false,proofReference,statusRef,statusError=false,
}: {
  coach: string;
  city: string;
  service: string;
  duration: string;
  format: string;
  objective: string;
  packageLabel: string;
  slot: string;
  price: string;
  mentor: string;
  selectedMethod: string;
  success: boolean;
  onSubmit: () => void;
  paymentReady: boolean;
  paymentError: string;
  reservationStatus: string;
  reservationCode: string;
  reservationId: string;
  processing: boolean;
  awaitingConfirmation: boolean;
  appointmentLabel: string;
  demo?:boolean;legacy?:boolean;onCheck?:()=>void;checking?:boolean;proofReference?:string;statusRef?:RefObject<HTMLParagraphElement|null>;statusError?:boolean;
}) {
  const summaryDuration = [duration, format, objective, packageLabel].filter(Boolean).join(" • ");

  return (
    <aside className={`payment-side ${demo ? recoveryStyles.side : ""}`}>
      <section className="payment-summary-card">
        <div className="payment-summary-visual" aria-hidden="true"></div>
        <h2>Recapitulatif</h2>
        <div className="payment-summary-line">
          <span>Lieu / coach</span>
          <strong>{`${coach} - ${city}`}</strong>
        </div>
        <div className="payment-summary-line">
          <span>Seance</span>
          <strong>{service}</strong>
        </div>
        <div className="payment-summary-line">
          <span>Duree</span>
          <strong>{summaryDuration}</strong>
        </div>
        <div className="payment-summary-line">
          <span>Date</span>
          <strong>{appointmentLabel || slot}</strong>
        </div>
        <div className="payment-summary-line">
          <span>Coach retenu</span>
          <strong>{mentor}</strong>
        </div>
        <div className="payment-summary-total">
          <span>Total</span>
          <strong>{price}</strong>
        </div>
        <button
          className="payment-submit"
          type="button"
          disabled={!paymentReady || success || processing}
          aria-label={demo ? (success?"Paiement simulé confirmé":legacy?"Statut payé enregistré":undefined) : success ? (selectedMethod === "onsite" ? "Reservation enregistree" : "Paiement confirme") : undefined}
          onClick={onSubmit}
        >
          {demo ? (processing?"Simulation en cours…":success?"Paiement simulé confirmé":legacy?"Statut payé enregistré":paymentReady?"Simuler le paiement":"Paiement indisponible") : processing ? "Traitement en cours…" : success ? (selectedMethod === "onsite" ? "Réservation enregistrée" : "Paiement confirmé") : paymentReady ? "Payer et confirmer" : "Paiement indisponible"}
        </button>
        <p className={`payment-note ${recoveryStyles.message}`} data-payment-status ref={statusRef} tabIndex={demo?-1:undefined} role={demo?(statusError?"alert":"status"):undefined}>
          {paymentError || (success ? "Paiement confirmé." : awaitingConfirmation ? "Confirmation en cours. Le retour de Stripe ne confirme pas encore votre réservation." : reservationStatus === "requested" ? "En attente de validation par le coach." : reservationStatus === "accepted" ? "Demande acceptée : vous pouvez payer." : "Réservation introuvable.")}
        </p>
        {demo?<button type="button" className={`payment-secondary-link ${recoveryStyles.check}`} disabled={processing||checking} onClick={onCheck}>{checking?"Vérification…":"Vérifier l’état du paiement"}</button>:null}
        {proofReference?<p className={recoveryStyles.reference} data-demo-payment-reference>Référence de simulation : {proofReference}</p>:null}
        {reservationCode ? <p data-payment-code>Code de réservation : {reservationCode}</p> : null}
      </section>

      <section className="payment-success-card" hidden={!success}>
        <h3>{demo?"Paiement simulé confirmé":"Reservation confirmee"}</h3>
        <p>{demo?"La confirmation est enregistrée en démonstration. Aucun débit ni reversement bancaire réel.":"Votre paiement est valide et votre seance est confirmee."}</p>
        <div className="payment-success-actions">
          <a className="payment-secondary-link" href={nextRoutes.home}>Retour a l&apos;accueil</a>
          <a className="payment-primary-link" href={nextRoutes.account}>Voir mon compte</a>
        </div>
        {reservationId ? <p data-review-after-session>Votre avis sera disponible après la fin prévue de la séance. <a href={nextRoutes.account}>Retrouver la séance dans mon compte</a></p> : null}
      </section>
    </aside>
  );
}


export function PaiementLegacyPage(props:PaiementLegacyPageProps){return <PaymentPage key={`${props.provider}:${props.athleteEmail ?? ""}:${props.params.reservationId ?? ""}`} {...props}/>;}
function PaymentPage({ params, provider = "local",athleteEmail }: PaiementLegacyPageProps) {
  const demo=useDemoPayment(provider==="local",params.reservationId || "",athleteEmail);
  const [stripeReservation, setServerReservation] = useState<{ coachName: string; city: string; service: string; duration: string; price: number; appointmentAt?: string; slots: string[] } | null>(null);
  const serverReservation=provider==="local"?demo.reservation:stripeReservation;
  const coach = provider==="local"?(serverReservation?.coachName || "À vérifier"):serverReservation?.coachName || params.coach || "Studio Démo";
  const city = provider==="local"?(serverReservation?.city || "À vérifier"):serverReservation?.city || params.city || "Marseille";
  const service = provider==="local"?(serverReservation?.service || "À vérifier"):serverReservation?.service || params.service || "Coaching remise en forme";
  const duration = provider==="local"?(serverReservation?.duration || "À vérifier"):serverReservation?.duration || params.duration || "30min";
  const price = serverReservation ? `${serverReservation.price.toFixed(2)} EUR` : provider==="local"?"À vérifier":params.price || "35 ";
  const objective = params.objective || "";
  const format = params.format || "";
  const packageLabel = params.package || "";
  const slot = params.slot || "10:00";
  const mentor = serverReservation?.coachName || (provider==="local"?"À vérifier":params.mentor || "Coach confirme");
  const reservationId = params.reservationId || "";
  const [selectedMethod, setSelectedMethod] = useState("card");
  const [stripeSuccess, setSuccess] = useState(false);
  const [stripeReservationStatus, setReservationStatus] = useState("");
  const [stripeReservationCode, setReservationCode] = useState("");
  const [stripePaymentError, setPaymentError] = useState("");
  const [stripeProcessing, setProcessing] = useState(false);
  const success=provider==="local"?(demo.success):stripeSuccess;
  const reservationStatus=provider==="local"?(demo.reservation?.status ?? ""):stripeReservationStatus;
  const reservationCode=provider==="local"?(demo.reservation?.reservationCode ?? ""):stripeReservationCode;
  const paymentError=provider==="local"?(demo.message):stripePaymentError;
  const processing=provider==="local"?(demo.processing):stripeProcessing;
  const awaitingConfirmation = provider==="stripe" && params.payment === "success" && !success;

  useEffect(() => {
    if(provider!=="stripe")return;
    if (!reservationId) {
      setPaymentError("Cette réservation ne possède pas encore d’identifiant.");
      return;
    }

    fetch(`/api/reservations/${reservationId}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Réservation introuvable."))))
      .then((payload) => {
        setServerReservation(payload.data);
        setReservationStatus(payload.data.status);
        setReservationCode(payload.data.reservationCode ?? "");
        if (payload.data.status === "paid") setSuccess(true);
      })
      .catch((error) => setPaymentError(error instanceof Error ? error.message : "Réservation introuvable."));
  }, [reservationId,provider]);

  useEffect(() => {
    if (provider!=="stripe" || !reservationId || params.payment !== "success") return;
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/reservations/${reservationId}`);
        if (response.ok) {
          const payload = await response.json();
          setServerReservation(payload.data);
          setReservationStatus(payload.data.status);
          setReservationCode(payload.data.reservationCode ?? "");
          if (payload.data.status === "paid") { setSuccess(true); window.clearInterval(interval); }
        }
      } catch { /* Keep pending rather than claiming success on a network failure. */ }
      if (attempts >= 15) window.clearInterval(interval);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [params.payment, reservationId,provider]);

  useEffect(() => {
    if (provider==="stripe" && params.payment === "cancelled") setPaymentError("Le paiement a été annulé. Votre demande reste en attente.");
  }, [params.payment,provider]);

  async function handlePayment() {
    if(provider==="local"){await demo.pay();return;}
    if (!reservationId || processing) return;
    setProcessing(true);
    setPaymentError("");
    try {
      const response = await fetch(`/api/reservations/${reservationId}/payment`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        setPaymentError(payload.error ?? "Paiement impossible.");
        return;
      }
      if (payload.data.checkoutUrl) {
        window.location.assign(payload.data.checkoutUrl);
        return;
      }
      setReservationStatus(payload.data.status);
      setReservationCode(payload.data.reservationCode ?? "");
      setSuccess(true);
    } catch {
      setPaymentError("Le service de paiement est momentanément indisponible.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <>
      <DiscoveryFrame page="payment" demo={provider === "local"}>
      <div className={recoveryStyles.page}>

        <main className="payment-page" data-payment-page>
          <PaymentMain selectedMethod={selectedMethod} onSelectMethod={setSelectedMethod} provider={provider} />
          <PaymentSide
            coach={coach}
            city={city}
            service={service}
            duration={duration}
            format={format}
            objective={objective}
            packageLabel={packageLabel}
            slot={slot}
            price={price}
            mentor={mentor}
            selectedMethod={selectedMethod}
            success={success}
            onSubmit={handlePayment}
            paymentReady={provider==="local"?demo.ready && !demo.loading:reservationStatus === "accepted" && !paymentError && !awaitingConfirmation}
            paymentError={paymentError}
            reservationStatus={reservationStatus}
            reservationCode={reservationCode}
            reservationId={reservationId}
            processing={processing}
            demo={provider==="local"} legacy={demo.legacy} checking={demo.loading} onCheck={demo.check} proofReference={demo.reference} statusRef={provider==="local"?demo.statusRef:undefined} statusError={demo.error}
            awaitingConfirmation={awaitingConfirmation}
            appointmentLabel={provider==="local"?serverReservation && reservationStart(serverReservation)!==null?`${formatBookingSlot(new Date(reservationStart(serverReservation)!).toISOString())} · Europe/Paris`:"Horaire à vérifier":`${formatBookingSlot(serverReservation?.appointmentAt || serverReservation?.slots[0] || slot)} · Europe/Paris`}
          />
        </main>

      </div>
      </DiscoveryFrame>
    </>
  );
}
