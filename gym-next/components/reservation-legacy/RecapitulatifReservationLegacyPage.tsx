"use client";
import { useEffect, useRef, useState } from "react";
import { formatBookingSlot } from "@/lib/domain/booking-time";
import { readBookingSummary, type BookingSummary } from "@/lib/booking-summary";
import { buildNextPath, nextRoutes } from "@/lib/next-routes";
import { DiscoveryFrame } from "@/components/discovery/DiscoveryFrame";
type Props={demo:boolean;params:Record<string,string|undefined>};
const states={requested:"Demande en attente de l’accord du coach",accepted:"Demande acceptée par le coach",paid:"Paiement enregistré",cancelled:"Réservation annulée",rejected:"Demande refusée par le coach"};
export function RecapitulatifReservationLegacyPage({demo,params}:Props) {
  const id=params.reservationId ?? "";
  const [data,setData]=useState<BookingSummary|null>(null);
  const [error,setError]=useState("");const [loading,setLoading]=useState(true);const [attempt,setAttempt]=useState(0);
  const proof=useRef<string|undefined>(undefined);
  const proofReservation=useRef(id);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setData(null);setError("");setLoading(true);
    if(proofReservation.current!==id){proof.current=undefined;proofReservation.current=id;}
    const url=new URL(window.location.href);proof.current=url.searchParams.get("claimToken") ?? proof.current;
    // Remove commercial hints and the historical proof from subsequent history/referrers.
    const clean=new URLSearchParams();if(id)clean.set("reservationId",id);
    window.history.replaceState(window.history.state,"",`${url.pathname}${clean.size?`?${clean}`:""}`);
    if(!/^res-[a-zA-Z0-9-]{1,128}$/.test(id)) {setError("Référence de réservation manquante ou invalide. Retrouvez votre demande dans votre compte.");setLoading(false);return ()=>{active=false;controller.abort();};}
    fetch("/api/reservations/summary",{method:"POST",cache:"no-store",referrerPolicy:"no-referrer",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)]),headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId:id,...(proof.current?{claimToken:proof.current}:{})})})
      .then(async response=>{
        if(!response.ok)throw new Error(response.status===404?"Réservation introuvable.":response.status===403||response.status===401?"Accès refusé. Connectez-vous au compte propriétaire ou utilisez une preuve valide.":"Le récapitulatif n’a pas pu être chargé. Réessayez sans créer une nouvelle demande.");
        const payload=await response.json();const saved=readBookingSummary(payload?.data,id);if(active)setData(saved);
      }).catch(cause=>{if(active)setError(cause instanceof Error&&cause.message.startsWith("Réservation introuvable")?cause.message:cause instanceof Error&&cause.message.startsWith("Accès refusé")?cause.message:"Le récapitulatif n’a pas pu être chargé. Réessayez sans créer une nouvelle demande.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;controller.abort();};
  },[id,attempt]);
  const account=data?buildNextPath(nextRoutes.account,{redirect:"paiement",reservationId:data.id}):nextRoutes.account;
  const slots=data?(data.appointmentAt&&["accepted","paid"].includes(data.status)?[data.appointmentAt]:data.slots):[];
  return <DiscoveryFrame page="recap" demo={demo}><div id="gym-booking" className="bk-recap-shell"><main className="bk-recap-page" data-recap-page>
    <p className="booking-eyebrow">02 / LE RÉCAPITULATIF</p>
    <ol className="bk-journey-progress" aria-label="Parcours de réservation"><li>Demande envoyée</li><li aria-current="step">Récapitulatif</li><li>Identification et suivi</li></ol>
    <section className="bk-recap-header"><h1 data-recap-name>{data?.coachName ?? "Votre réservation"}</h1>{data?<div className="bk-recap-address">{data.city}</div>:null}</section>
    {loading?<p role="status" className="booking-note">Chargement des informations enregistrées…</p>:null}
    {error?<section className="bk-reservation-inline-error"><p role="alert">{error}</p><button type="button" onClick={()=>setAttempt(x=>x+1)}>Réessayer le chargement</button><p><a className="bk-recap-link" href="/compte">Mon compte</a></p></section>:null}
    {data?<>
      <p role="status" className="booking-note">{data.status==="paid"&&demo?"Paiement simulé enregistré":states[data.status]}. Informations actuelles enregistrées ; ce récapitulatif ne constitue pas un justificatif bancaire.</p>
      <section className="bk-recap-step"><h2><span>1.</span> Séance enregistrée</h2><article className="bk-recap-service-card"><div className="bk-recap-service-copy"><strong>{data.service}</strong><div>{data.duration} · {new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(data.price)} · avec {data.coachName}</div><p>{data.participantCount} participant{data.participantCount>1?"s":""}</p></div></article></section>
      <section className="bk-recap-step"><h2><span>2.</span> {data.appointmentAt&&["accepted","paid"].includes(data.status)?"Horaire convenu":"Créneaux demandés"}</h2><div className="bk-recap-date-card"><div data-recap-datetime>{slots.map(slot=><p key={slot}>{formatBookingSlot(slot)} · Europe/Paris</p>)}</div><a data-recap-edit className="bk-recap-link" href={buildNextPath(nextRoutes.slot,{sport:data.sport,city:data.city,coach:data.coachName,service:data.service,duration:data.duration})}>Consulter les créneaux</a></div></section>
      <section className="bk-recap-step"><h2><span>3.</span> Suivre ma demande</h2>{data.authenticated?<p><a className="bk-recap-dark-button" href={account}>Retrouver ma demande dans mon compte</a></p>:<div className="bk-recap-auth-card"><div className="bk-recap-auth-block"><h3>Nouveau sur GetYourMentor ?</h3><a className="bk-recap-outline-button" href={account} data-recap-create>Créer mon compte</a></div><div className="bk-recap-divider">ou</div><div className="bk-recap-auth-block"><h3>Déjà inscrit ?</h3><a className="bk-recap-dark-button" href={account} data-recap-login>Se connecter pour suivre ma demande</a></div></div>}<p>Le paiement est accessible après l’acceptation du coach. Aucun paiement n’est déclenché ici.</p></section>
    </>:null}
  </main></div></DiscoveryFrame>;
}
