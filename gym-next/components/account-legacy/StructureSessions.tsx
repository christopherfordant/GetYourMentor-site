"use client";
import { formatBookingSlot } from "@/lib/domain/booking-time";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/components/group-booking.module.css";
import { isPlanningOffer, parsePlanningData, type PlanningData } from "./planning-data";

export function StructureSessions({ coach = false }: { coach?: boolean } = {}) {
  // A role change starts a fresh component and aborts all old work.
  return <SessionsPanel key={coach ? "coach" : "structure"} coach={coach} />;
}
function SessionsPanel({ coach }: { coach: boolean }) {
  const [state,setState]=useState<{data:PlanningData|null;loading:boolean;error:string}>({data:null,loading:true,error:""});
  const [coachId,setCoachId]=useState("");
  const [publication,setPublication]=useState<{kind:"success"|"error";text:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [uncertain,setUncertain]=useState(false);
  const lifecycle=useRef({alive:false,read:0,controller:null as AbortController|null,write:null as AbortController|null,publishing:false,refreshRequested:false});
  const load=useCallback(async (replace=false,afterPublication=false)=>{
    const life=lifecycle.current;
    if(!life.alive || (life.publishing && !afterPublication) || (life.controller && !replace))return;
    life.refreshRequested=false;life.controller?.abort();const controller=new AbortController();life.controller=controller;const read=++life.read;
    setState(previous=>({...previous,loading:true,error:""}));
    try {
      const get=async(path:string)=>{const response=await fetch(path,{signal:controller.signal,cache:"no-store"});if(!response.ok)throw new Error("Chargement du planning impossible");return response.json() as Promise<unknown>;};
      const [offers,reservations,affiliations]=await Promise.all([get(coach?"/api/coaches/sessions?mine=1":"/api/structures/offers?mine=1"),coach?undefined:get("/api/structures/reservations"),coach?undefined:get("/api/affiliations")]);
      const data=parsePlanningData(offers,reservations,affiliations);
      if(!life.alive || read!==life.read)return;
      setState({data,loading:false,error:""});setUncertain(false);
      setCoachId(previous=>data.coaches.some(c=>c.id===previous)?previous:data.coaches[0]?.id ?? "");
    } catch {
      if(!life.alive || read!==life.read)return;
      controller.abort();setState(previous=>({...previous,loading:false,error:"Chargement du planning impossible. Réessaie."}));
    } finally {if(read===life.read)life.controller=null;}
  },[coach]);
  useEffect(()=>{
    const life=lifecycle.current;life.alive=true;void load();
    const reload=()=>{
      if(life.publishing){life.refreshRequested=true;life.read++;life.controller?.abort();life.controller=null;setState(previous=>({...previous,loading:false,error:"Les affiliations ont changé. Une actualisation est nécessaire."}));}
      else void load(true);
    };window.addEventListener("gym-affiliations-updated",reload);
    return()=>{life.alive=false;life.read++;life.controller?.abort();life.controller=null;life.write?.abort();window.removeEventListener("gym-affiliations-updated",reload);};
  },[load]);
  const offers=state.data?.offers ?? [],reservations=state.data?.reservations ?? [],coaches=state.data?.coaches ?? [];
  const verified=!!state.data && !state.loading && !state.error;
  const canPublish=verified && !uncertain && (coach || coaches.some(c=>c.id===coachId));
  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();const life=lifecycle.current;if(life.publishing || !canPublish)return;
    life.publishing=true;setBusy(true);setPublication(null);
    const values=new FormData(event.currentTarget),controller=new AbortController();life.write=controller;
    let sent=false;
    try {
      const slot=String(values.get("slot"));const body={...(coach?{location:values.get("location")}:{coachId}),title:values.get("title"),duration:coach?`${values.get("duration")} minutes`:"1 heure",capacity:Number(values.get("capacity")),slots:[new Date(slot).toISOString()]};
      sent=true;const response=await fetch(coach?"/api/coaches/sessions":"/api/structures/offers",{method:"POST",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!life.alive)return;
      if(!response.ok){const failure:unknown=await response.json().catch(()=>null);if(!life.alive)return;const reason=failure && typeof failure==="object" && "error" in failure && typeof failure.error==="string"?failure.error:"Vérifie les informations et les droits nécessaires.";setPublication({kind:"error",text:`Publication refusée. ${reason}`});return;}
      const payload:unknown=await response.json();
      if(!payload || typeof payload!=="object" || !("data" in payload) || !isPlanningOffer(payload.data))throw new Error("Confirmation invalide");
      if(!life.alive)return;
      setPublication({kind:"success",text:"Séance publiée. Un élève peut maintenant la demander."});
      await load(true,true);
    } catch {
      if(!life.alive)return;
      setUncertain(sent);setPublication({kind:"error",text:sent?"Résultat de la publication non confirmé. Actualise le planning avant de réessayer pour éviter un doublon.":"Publication impossible : vérifie le créneau saisi."});
    } finally {life.publishing=false;life.write=null;if(life.alive){setBusy(false);if(life.refreshRequested)void load(true);}}
  }
  return <section className={`account-dashboard-card ${coach ? styles.card : ""}`} id={coach ? "coach-sessions" : "structure-sessions"} data-structure-sessions={coach ? undefined : true} data-coach-sessions={coach ? true : undefined} aria-busy={state.loading || busy}>
    <h2>{coach ? "Mes séances collectives" : "Séances et planning de ma structure"}</h2>
    <p>{coach ? "Publiez une séance collective avec un lieu, une durée et une capacité. Aucune affiliation à une structure n’est nécessaire." : "Proposez une séance avec votre coach affilié."} L’élève fait sa demande, le coach accepte, puis l’élève paie. Vous suivez la réservation dans ce planning.</p>
    <p>{coach ? "Votre profil doit être validé pour publier une séance." : "Seuls les coachs ayant un accord réciproque peuvent être choisis."} Le tarif du coach sélectionné est appliqué ; aucun reversement réel n’est effectué en démo.</p>
    <form onSubmit={publish} data-structure-publish={!coach ? true : undefined} data-coach-publish={coach ? true : undefined}>
      {!coach ? <><label className="auth-field">Coach responsable<select name="coachId" value={coachId} onChange={e => setCoachId(e.target.value)} required disabled={busy || !verified || !coaches.length}><option value="">Choisir un coach affilié</option>{coaches.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
      {!verified ? <p>Affiliations non vérifiées : publication désactivée.</p> : !coaches.length ? <p>Un accord réciproque avec un coach est nécessaire avant publication.</p> : null}</> : null}
      <label className="auth-field">Nom de la séance<input name="title" required maxLength={120} /></label>
      {coach ? <><label className="auth-field">Lieu de rendez-vous<input name="location" required maxLength={240} /></label><label className="auth-field">Durée en minutes<input name="duration" type="number" min="1" max="480" defaultValue="60" required /></label></> : null}
      <label className="auth-field">Créneau de la séance<input name="slot" type="datetime-local" required /></label>
      <label className="auth-field">Places disponibles<input name="capacity" type="number" min={coach ? 2 : 1} max="50" defaultValue={coach ? 4 : 1} required /></label>
      <p>Chaque participant occupe une place, y compris dans une réservation groupée. Saisie horaire dans le fuseau de votre appareil ; planning affiché en Europe/Paris.</p>
      <p>{coach ? "Sport issu du profil. Prix total selon les tarifs de groupe définis ci-dessus." : "Durée : 1 heure. Tarif du coach appliqué à la demande."}</p>
      <button type="submit" className="auth-primary" disabled={busy || !canPublish}>{busy ? "Publication…" : "Publier la séance"}</button>
    </form>
    {publication ? <p role={publication.kind==="success"?"status":"alert"} data-planning-publication>{publication.text}</p> : null}
    {state.loading ? <p role="status">{state.data ? "Actualisation du planning…" : "Chargement du planning…"}</p> : null}
    {state.error ? <p role="alert" data-planning-error>{state.error}{state.data ? " Les données affichées n’ont pas pu être actualisées." : " Aucune donnée du planning n’a pu être vérifiée."}</p> : null}
    {!coach ? <p><a href="/structures">Voir les séances proposées aux élèves</a></p> : null}
    <button className="auth-secondary" type="button" disabled={state.loading || busy} onClick={()=>void load()}>{state.error?"Réessayer":"Actualiser le planning"}</button>
    <h3>Mes séances proposées</h3>
    {offers.length ? offers.map((offer) => <article key={offer.id}><strong>{offer.title}</strong><p>Capacité : {offer.capacity ?? 1} place(s) · {offer.duration}</p>{offer.location ? <p>{offer.location}</p> : null}{coach ? <a href={`/coach?coach=${encodeURIComponent(offer.coachId)}#collective-sessions`}>Voir la séance sur ma fiche</a> : null}<p>{offer.slots.map((s) => formatBookingSlot(s)).join(" · ")}</p></article>) : verified ? <p>Aucune séance publiée.</p> : null}
    {!coach ? <><h3>Demandes et paiements des élèves</h3>
    {reservations.length ? reservations.map((r) => <article key={r.id} data-structure-reservation={r.id}><strong>{r.service}</strong><p>{r.coachName} · {r.price} EUR</p><p>{r.slots.map((s) => formatBookingSlot(s)).join(" · ")}</p><p>{r.participantCount ?? 1} participant(s)</p><p data-structure-status>Statut : {r.status}</p>{r.reservationCode ? <p>Code : {r.reservationCode}</p> : null}</article>) : verified ? <p>Aucune demande pour vos séances.</p> : null}</> : <p>Retrouvez les demandes, paiements simulés et réservations dans les sections habituelles de votre compte.</p>}
  </section>;
}
