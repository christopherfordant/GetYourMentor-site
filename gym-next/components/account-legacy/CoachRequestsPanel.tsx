"use client";
import {formatBookingSlot} from "@/lib/domain/booking-time";
import {useCallback,useEffect,useRef,useState} from "react";
import type {Reservation} from "@/lib/domain";
import {confirmedCoachTransition,readCoachReservations} from "./coach-request-data";
type Props={coachId?:string;onReservationsChanged?:(rows:Reservation[])=>void};
type Message={text:string;error:boolean;blocked?:boolean};
export function CoachRequestsPanel(props:Props){return <Requests key={props.coachId ?? "unknown"} {...props}/>;}
function Requests({coachId,onReservationsChanged}:Props){
 const [reservations,setReservations]=useState<Reservation[]>([]),[selectedSlots,setSelectedSlots]=useState<Record<string,string>>({});
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [pending,setPending]=useState<string|null>(null),[messages,setMessages]=useState<Record<string,Message>>({});
 const life=useRef({alive:false,read:0,reading:null as AbortController|null,writing:null as AbortController|null,busy:false,loaded:false,rows:[] as Reservation[],blocked:new Set<string>()});
 const callback=useRef(onReservationsChanged);callback.current=onReservationsChanged;
 const refreshButton=useRef<HTMLButtonElement>(null),messageNodes=useRef<Record<string,HTMLParagraphElement|null>>({}),focusId=useRef("");
 useEffect(()=>{if(focusId.current)messageNodes.current[focusId.current]?.focus({preventScroll:true});},[messages]);
 const commit=useCallback((rows:Reservation[])=>{life.current.rows=rows;life.current.loaded=true;setReservations(rows);callback.current?.(rows);},[]);
 const refresh=useCallback(async(initial=false)=>{
  const current=life.current;if(!current.alive||current.busy||current.reading)return;
  if(!coachId){setLoading(false);setError("Profil coach non identifié. Demandes indisponibles.");return;}
  const controller=new AbortController();current.reading=controller;const read=++current.read;setLoading(true);setError("");
  try{
   const response=await fetch("/api/reservations",{signal:controller.signal,cache:"no-store"});if(!response.ok)throw new Error("Lecture impossible");
   const rows=readCoachReservations(await response.json(),coachId);
   if(!current.alive||read!==current.read)return;
   commit(rows);current.blocked.clear();setMessages({});focusId.current="";
   setSelectedSlots(previous=>Object.fromEntries(rows.filter(row=>previous[row.id]&&row.slots.includes(previous[row.id])).map(row=>[row.id,previous[row.id]])));
  }catch{if(current.alive&&read===current.read)setError(current.loaded?"Actualisation impossible. Les données affichées n’ont pas pu être actualisées. Réessaie avant d’agir.":"Demandes indisponibles. Réessaie pour vérifier leur état.");}
  finally{if(read===current.read){current.reading=null;if(current.alive){setLoading(false);if(!initial)refreshButton.current?.focus({preventScroll:true});}}}
 },[coachId,commit]);
 useEffect(()=>{const current=life.current;current.alive=true;void refresh(true);return()=>{current.alive=false;current.read++;current.reading?.abort();current.reading=null;current.writing?.abort();};},[refresh]);
 async function transition(id:string,status:"accepted"|"rejected"){
  const current=life.current;if(!current.alive||current.busy||current.reading||error||current.blocked.has(id))return;
  const original=current.rows.find(row=>row.id===id);if(!original||original.status!=="requested"||original.coachId!==coachId)return;
  const chosen=selectedSlots[id]??original.slots[0];
  focusId.current="";current.busy=true;current.read++;const controller=new AbortController();current.writing=controller;setPending(id);setMessages(previous=>{const next={...previous};delete next[id];return next;});
  const notify=(text:string,isError:boolean,blocked=false)=>{if(!current.alive)return;if(blocked)current.blocked.add(id);focusId.current=id;setMessages(previous=>({...previous,[id]:{text,error:isError,blocked}}));};
  const uncertain=(reason:string)=>notify(`${reason} Résultat non confirmé. Actualise les demandes avant toute nouvelle action. L’envoi a pu être enregistré.`,true,true);
  let received=false;
  try{
   const response=await fetch(`/api/reservations/${encodeURIComponent(id)}`,{method:"PATCH",signal:controller.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({status,...(status==="accepted"?{appointmentAt:chosen}:{})})});
   received=true;if(!current.alive)return;
   if(!response.ok){
    if(response.status>=500){uncertain("Erreur technique du serveur.");return;}
    const payload:unknown=await response.json().catch(()=>null);if(!current.alive)return;
    const detail=payload&&typeof payload==="object"&&"error" in payload&&typeof payload.error==="string"?payload.error.slice(0,300):"La demande n’a pas pu être traitée.";
    if(response.status===409)notify(`Conflit : ${detail} Actualise pour vérifier l’état réel.`,true,true);
    else notify(`Refus du serveur : ${detail}`,true,[401,404].includes(response.status));
    return;
   }
   const row=confirmedCoachTransition(await response.json(),original,status,chosen);if(!current.alive)return;if(!row){uncertain("Réponse incohérente.");return;}
   commit(current.rows.map(previous=>previous.id===id?row:previous));notify(status==="accepted"?"Demande acceptée. Le créneau retenu est enregistré ; le paiement reste à effectuer par l’élève.":"Demande refusée.",false);
  }catch{if(current.alive)uncertain(received?"Réponse inexploitable.":"Erreur réseau.");}
  finally{current.busy=false;current.writing=null;if(current.alive)setPending(null);}
 }
  return (
    <section className="account-dashboard-card coach-home-requests" id="coach-requests" data-coach-requests aria-busy={loading||pending!==null}>
      <div className="coach-home-card-head">
        <h3>Demandes de réservation</h3>
        <span>{loading ? "Chargement..." : (error||Object.values(messages).some(message=>message.blocked))?"État à vérifier":`${reservations.filter((item) => item.status === "requested").length} à traiter`}</span>
      </div>
      {loading?<p role="status">{life.current.loaded?"Actualisation des demandes…":"Chargement des demandes…"}</p>:null}
      {error ? <p role="alert">{error}</p> : null}
      <p>Acceptez une demande pour permettre à l’élève de payer, puis actualisez pour suivre sa confirmation. Aucun encaissement n’est demandé au coach.</p>
      <button ref={refreshButton} type="button" disabled={loading||pending!==null} onClick={()=>void refresh()}>Actualiser les demandes et paiements</button>
      {!loading && !error && reservations.length === 0 ? <p data-coach-empty>Aucune demande en attente.</p> : null}
      <div className="coach-home-request-list">
        {reservations.map((reservation) => (
          <article key={reservation.id} data-coach-request={reservation.id}>
            <strong>{reservation.service}</strong>
            <span>{reservation.slots.map(formatBookingSlot).join(" · ")} — {reservation.price} EUR</span>
            {(reservation.participantCount ?? 1) > 1 ? <details><summary>Groupe de {reservation.participantCount} participants · montant total</summary><ul>{reservation.additionalParticipants?.map((person, i) => <li key={i}>{person.firstName} {person.lastName} · {person.age} ans</li>)}</ul></details> : null}
            <span data-request-status>Statut : {reservation.status}</span>
            {reservation.status === "accepted" ? <span>En attente du paiement de l’élève</span> : null}
            {reservation.status === "paid" ? <span>Paiement élève confirmé. {reservation.financials ? `Part coach : ${(reservation.financials.coachAmountCents / 100).toFixed(2)} EUR ; commission historique : ${reservation.financials.commissionBps / 100} %.` : ""} Aucun reversement bancaire n’est effectué en démo.</span> : null}
            {reservation.reservationCode ? <span>Code : {reservation.reservationCode}</span> : null}
            {pending===reservation.id?<p role="status">Envoi en cours…</p>:null}
            {messages[reservation.id]?<p tabIndex={-1} ref={node=>{messageNodes.current[reservation.id]=node;}} role={messages[reservation.id].error?"alert":"status"} data-coach-action-message>{messages[reservation.id].text}</p>:null}
            {reservation.status === "requested" ? (
              <div>
                {reservation.slots.length > 1 ? <label className="auth-field">Créneau à confirmer<select aria-label={`Créneau à confirmer ${reservation.id}`} disabled={loading||!!error||pending!==null||!!messages[reservation.id]?.blocked} value={selectedSlots[reservation.id] ?? reservation.slots[0]} onChange={event => setSelectedSlots(current => ({ ...current, [reservation.id]: event.target.value }))}>{reservation.slots.map(slot => <option key={slot} value={slot}>{formatBookingSlot(slot)}</option>)}</select></label> : null}
                <div className="account-inline-actions"><button className="auth-primary" type="button" disabled={loading||!!error||pending!==null||!!messages[reservation.id]?.blocked} onClick={() => transition(reservation.id, "accepted")}>Accepter</button>
                <button className="auth-secondary" type="button" disabled={loading||!!error||pending!==null||!!messages[reservation.id]?.blocked} onClick={() => transition(reservation.id, "rejected")}>Refuser</button></div>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
