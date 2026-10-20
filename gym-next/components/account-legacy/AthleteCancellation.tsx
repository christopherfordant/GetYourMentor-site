"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Reservation } from "@/lib/domain";
import { readDemoPayment, sameDemoBooking } from "@/components/payment-legacy/demo-payment-data";
import { coherentCancellation, cancellationRefundLabel } from "./athlete-cancellation-data";
import styles from "./athlete-cancellation.module.css";

export function AthleteCancellation({reservation,email,demo,onChanged,children,externalBusy,acquire,release}:{reservation:Reservation;email:string;demo:boolean;onChanged:(row:Reservation)=>void;children:(blocked:boolean,ownBlocked:boolean)=>ReactNode;externalBusy:boolean;acquire:()=>boolean;release:()=>void}) {
  const [state,setState]=useState({busy:false,uncertain:false,error:false,message:""});
  const life=useRef({alive:false,generation:0,busy:false,controller:null as AbortController|null});const message=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{const c=life.current;c.alive=true;const logout=(e:StorageEvent)=>{if(e.key!=="gym-session-ended")return;c.alive=false;c.generation++;c.controller?.abort();setState({busy:false,uncertain:true,error:true,message:"La session a changé. Reconnecte-toi pour vérifier l’annulation."});};const restored=(e:PageTransitionEvent)=>{if(e.persisted)window.location.reload();};window.addEventListener("storage",logout);window.addEventListener("pageshow",restored);return()=>{c.alive=false;c.generation++;c.controller?.abort();window.removeEventListener("storage",logout);window.removeEventListener("pageshow",restored);};},[email,reservation.id]);
  async function run(check:boolean) {
    const c=life.current;if(!c.alive||c.busy||!email||(!check&&(state.uncertain||!["requested","accepted","paid"].includes(reservation.status))))return;
    if(!acquire())return;
    c.busy=true;const generation=++c.generation,controller=new AbortController();c.controller=controller;const original=reservation;
    setState(s=>({...s,busy:true,error:false,message:check?"Vérification de l’annulation…":"Annulation en cours…"}));let received=false;
    try {
      const response=await fetch(`/api/reservations/${encodeURIComponent(original.id)}${check?"":"/cancel"}`,{method:check?"GET":"POST",cache:"no-store",signal:controller.signal});received=true;
      if(!c.alive||generation!==c.generation)return;
      if(!response.ok)throw new Error(check?"Vérification impossible.":response.status===409?"Conflit : réservation modifiée.":response.status<500?"Annulation refusée.":"Erreur technique du serveur.");
      const row=readDemoPayment(await response.json(),original.id,email);
      if(!c.alive||generation!==c.generation)return;
      if(!sameDemoBooking(original,row) || (row.status === "cancelled" && !coherentCancellation(row,original)) || (!check && row.status !== "cancelled"))throw new Error("Réponse incohérente.");
      onChanged(row);
      setState({busy:false,uncertain:false,error:false,message:row.status === "cancelled" ? (demo?"Annulation simulée confirmée. Aucun transfert bancaire réel.":"Annulation confirmée.") : ["requested","accepted","paid"].includes(row.status)?"État vérifié : réservation encore annulable. Aucune nouvelle demande envoyée.":"État vérifié : réservation non annulable."});
    } catch(error) {
      if(c.alive&&generation===c.generation)setState({busy:false,uncertain:true,error:true,message:`${error instanceof Error && !["AbortError","SyntaxError","TypeError"].includes(error.name)?error.message:received?"Réponse inexploitable.":"Erreur réseau."} Résultat non confirmé. Vérifie l’état avant toute nouvelle action.`});
    } finally {if(generation===c.generation){c.busy=false;c.controller=null;release();if(c.alive)requestAnimationFrame(()=>{if(c.alive)message.current?.focus({preventScroll:true});});}}
  }
  const blocked=state.busy||state.uncertain||externalBusy;
  return <div className={styles.panel} data-cancellation-panel>
    {["paid","accepted","requested"].includes(reservation.status)?<button className="auth-secondary" type="button" disabled={blocked} onClick={()=>void run(false)}>Annuler la réservation</button>:null}
    {state.message?<p className={styles.message} ref={message} tabIndex={-1} role={state.error?"alert":"status"} data-cancellation-status>{state.message}</p>:null}
    {state.message||reservation.status==="cancelled"?<button className="auth-secondary" type="button" disabled={state.busy||externalBusy} onClick={()=>void run(true)}>Vérifier l’état de l’annulation</button>:null}
    {children(blocked,state.busy||state.uncertain)}
    {reservation.status==="cancelled"?<p className={styles.message} data-cancellation-refund>{cancellationRefundLabel(reservation,demo)}</p>:null}
  </div>;
}
