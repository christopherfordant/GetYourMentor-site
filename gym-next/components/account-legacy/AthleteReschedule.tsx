"use client";
import {useEffect,useRef,useState} from "react";
import type {Reservation} from "@/lib/domain";
import {formatBookingSlot,slotInstant} from "@/lib/domain/booking-time";
import {readDemoPayment} from "@/components/payment-legacy/demo-payment-data";
import {parisInputSlot,sameRescheduleBooking,validReadSlots,confirmedReschedule} from "./athlete-reschedule-data";
import styles from "./athlete-cancellation.module.css";
type Props={reservation:Reservation;email:string;disabled:boolean;acquire:()=>boolean;release:()=>void;onBlocked:(value:boolean)=>void;onChanged:(row:Reservation)=>void};
export function AthleteReschedule({reservation,email,disabled,acquire,release,onBlocked,onChanged}:Props){
 const [input,setInput]=useState("");const [state,setState]=useState({busy:false,uncertain:false,error:false,message:""});
 const life=useRef({alive:false,generation:0,busy:false,controller:null as AbortController|null,target:""});const status=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{const c=life.current;c.alive=true;const logout=(e:StorageEvent)=>{if(e.key!=="gym-session-ended")return;c.alive=false;c.generation++;c.controller?.abort();setState({busy:false,uncertain:true,error:true,message:"La session a changé. Reconnecte-toi pour vérifier le déplacement."});};window.addEventListener("storage",logout);return()=>{c.alive=false;c.generation++;c.controller?.abort();window.removeEventListener("storage",logout);onBlocked(false);};},[email,reservation.id]);
 const canMove=!reservation.structureOfferId&&["accepted","paid"].includes(reservation.status);
 async function run(check:boolean){
  const c=life.current;if(!c.alive||c.busy||disabled||!email||(!check&&(!canMove||state.uncertain)))return;
  const target=check?c.target:parisInputSlot(input);
  if(!check&&!target){setState({busy:false,uncertain:false,error:true,message:"Indique un créneau futur valide en heure de Paris. Une heure inexistante ou ambiguë au changement d’heure doit être remplacée."});requestAnimationFrame(()=>status.current?.focus());return;}
  if(!check&&reservation.slots.length===1&&slotInstant(reservation.appointmentAt??"")===slotInstant(target!)){setState({busy:false,uncertain:false,error:false,message:"Ce créneau est déjà enregistré. Aucun nouvel envoi."});return;}
  if(!acquire())return;const original=reservation,controller=new AbortController(),generation=++c.generation;c.busy=true;c.controller=controller;if(!check)c.target=target!;onBlocked(true);
  setState(s=>({...s,busy:true,error:false,message:check?"Vérification du déplacement…":"Déplacement en cours…"}));let received=false;
  try{
   const response=await fetch(`/api/reservations/${encodeURIComponent(original.id)}${check?"":"/reschedule"}`,{method:check?"GET":"POST",signal:controller.signal,cache:"no-store",...(!check?{headers:{"Content-Type":"application/json"},body:JSON.stringify({slots:[target],expected:{slots:original.slots,appointmentAt:original.appointmentAt??null}})}:{})});received=true;
   if(!c.alive||generation!==c.generation)return;
   if(!response.ok)throw new Error(check?"Vérification impossible.":response.status===409?"Conflit ou refus métier du déplacement.":response.status<500?"Déplacement refusé.":"Erreur technique du serveur.");
   const row=readDemoPayment(await response.json(),original.id,email);
   if(!c.alive||generation!==c.generation)return;
   if(!sameRescheduleBooking(original,row)||!validReadSlots(row)||(!check&&!confirmedReschedule(original,row,target!)))throw new Error("Réponse incohérente.");
   onChanged(row);onBlocked(false);
   const found=!row.structureOfferId&&["accepted","paid"].includes(row.status)&&!!target&&row.slots.length===1&&slotInstant(row.appointmentAt??"")===slotInstant(target);
   setState({busy:false,uncertain:false,error:false,message:!check||found?"Déplacement confirmé : créneau enregistré. Aucun nouveau paiement ni remboursement.":!row.structureOfferId&&["accepted","paid"].includes(row.status)?"État relu : un autre créneau est enregistré. Vérifie les horaires affichés avant une nouvelle action explicite.":"État relu : réservation non déplaçable."});
  }catch(error){if(c.alive&&generation===c.generation)setState({busy:false,uncertain:true,error:true,message:`${error instanceof Error&&!["TypeError","SyntaxError","AbortError"].includes(error.name)?error.message:received?"Réponse inexploitable.":"Erreur réseau."} Résultat non confirmé. Vérifie l’état avant toute nouvelle action.`});}
  finally{if(generation===c.generation){c.busy=false;c.controller=null;release();if(c.alive)requestAnimationFrame(()=>{if(c.alive)status.current?.focus({preventScroll:true});});}}
 }
 const preview=parisInputSlot(input);
 return <div className={styles.panel} data-athlete-reschedule={reservation.id}>
  {canMove?<><label>Nouveau créneau · Europe/Paris<input type="datetime-local" data-reschedule-slot aria-label="Nouveau créneau" value={input} disabled={disabled||state.busy||state.uncertain} onChange={e=>setInput(e.target.value)}/></label>{preview?<p>Créneau demandé : {formatBookingSlot(preview)} · Europe/Paris</p>:null}<button className="auth-secondary" type="button" disabled={disabled||state.busy||state.uncertain} onClick={()=>void run(false)}>Déplacer</button></>:null}
  {state.message?<p className={styles.message} tabIndex={-1} ref={status} role={state.error?"alert":"status"} data-reschedule-status>{state.message}</p>:null}
  {state.message?<button className="auth-secondary" type="button" disabled={disabled||state.busy} onClick={()=>void run(true)}>Vérifier l’état du déplacement</button>:null}
 </div>;
}
