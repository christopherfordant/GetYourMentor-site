"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import type {Reservation} from "@/lib/domain";
import {demoPaymentState,readDemoPayment,sameDemoBooking} from "./demo-payment-data";
type State={reservation:Reservation|null;loading:boolean;processing:boolean;ready:boolean;success:boolean;legacy:boolean;error:boolean;message:string};
const initial:State={reservation:null,loading:true,processing:false,ready:false,success:false,legacy:false,error:false,message:"Vérification de la réservation…"};
export function useDemoPayment(enabled:boolean,id:string,email?:string){
 const [state,setState]=useState<State>(initial),[focus,setFocus]=useState(0);const statusRef=useRef<HTMLParagraphElement>(null);
 const life=useRef({alive:false,generation:0,busy:false,controller:null as AbortController|null,row:null as Reservation|null,expected:false});
 const marker=`gym-demo-payment:${email ?? "anonymous"}:${id}`;
 useEffect(()=>{if(focus)statusRef.current?.focus({preventScroll:true});},[focus]);
 const check=useCallback(async(manual=true)=>{
  const current=life.current;if(!current.alive||current.busy||current.controller)return;
  if(!id||!email){setState({...initial,loading:false,error:true,message:!id?"Identifiant de réservation manquant.":"Connecte-toi avec ton compte sportif pour vérifier le paiement."});return;}
  const controller=new AbortController();current.controller=controller;const generation=++current.generation;
  setState(previous=>({...previous,loading:true,ready:false,error:false,message:"Vérification de l’état du paiement…"}));
  try{
   const response=await fetch(`/api/reservations/${encodeURIComponent(id)}`,{signal:controller.signal,cache:"no-store"});if(!response.ok)throw new Error("Lecture refusée");
   const row=readDemoPayment(await response.json(),id,email);if(!current.alive||generation!==current.generation)return;
   if(current.row&&!sameDemoBooking(current.row,row))throw new Error("Données modifiées");
   const result=demoPaymentState(row,current.expected);current.row=row;
   setState({reservation:row,loading:false,processing:false,...result});
  }catch{if(current.alive&&generation===current.generation)setState(previous=>({...previous,loading:false,ready:false,success:false,legacy:false,error:true,message:"Vérification impossible. Le résultat reste non confirmé. Réessaie de vérifier avant tout nouvel envoi."}));}
  finally{if(generation===current.generation){current.controller=null;if(current.alive&&manual)setFocus(value=>value+1);}}
 },[id,email]);
 useEffect(()=>{
  const current=life.current;if(!enabled)return;current.alive=true;current.row=null;current.busy=false;
  try{current.expected=sessionStorage.getItem(marker)==="expected";}catch{current.expected=false;}
  setState(initial);void check(false);
  const changed=(event:StorageEvent)=>{if(event.key!=="gym-session-ended")return;current.alive=false;current.generation++;current.controller?.abort();setState({...initial,loading:false,error:true,message:"La session a changé. Reconnecte-toi pour vérifier le paiement."});window.location.replace("/compte?mode=sportif");};
  const restored=(event:PageTransitionEvent)=>{if(event.persisted)window.location.reload();};
  window.addEventListener("storage",changed);window.addEventListener("pageshow",restored);
  return()=>{current.alive=false;current.generation++;current.controller?.abort();current.controller=null;window.removeEventListener("storage",changed);window.removeEventListener("pageshow",restored);};
 },[enabled,marker,check]);
 const pay=async()=>{
  const current=life.current,original=current.row;if(!enabled||!current.alive||!email||current.busy||current.controller||!state.ready||!original||!demoPaymentState(original,current.expected).ready)return;
  current.busy=true;current.expected=true;try{sessionStorage.setItem(marker,"expected");}catch{/* Not authorization; an absent marker never creates a confirmed success. */}
  const generation=++current.generation,controller=new AbortController();current.controller=controller;
  setState(previous=>({...previous,processing:true,ready:false,error:false,message:"Paiement simulé en cours…"}));let received=false;
  const uncertain=(reason:string)=>setState(previous=>({...previous,processing:false,ready:false,success:false,legacy:false,error:true,message:`${reason} Résultat non confirmé : le paiement simulé a pu être enregistré. Vérifie son état avant de poursuivre.`}));
  try{
   const response=await fetch(`/api/reservations/${encodeURIComponent(id)}/payment`,{method:"POST",signal:controller.signal});received=true;if(!current.alive||generation!==current.generation)return;
   if(!response.ok){if(response.status>=500)uncertain("Erreur technique du serveur.");else setState(previous=>({...previous,processing:false,ready:false,error:true,message:"Paiement simulé refusé. Vérifie l’état de la réservation avant de réessayer."}));return;}
   const row=readDemoPayment(await response.json(),id,email),result=demoPaymentState(row,true);
   if(!current.alive||generation!==current.generation)return;
   if(!sameDemoBooking(original,row)||!result.success){uncertain("Confirmation incohérente.");return;}
   current.row=row;setState({reservation:row,loading:false,processing:false,...result});
  }catch{if(current.alive&&generation===current.generation)uncertain(received?"Réponse inexploitable.":"Erreur réseau.");}
  finally{current.busy=false;if(generation===current.generation){current.controller=null;if(current.alive)setFocus(value=>value+1);}}
 };
 return {...state,check:()=>void check(),pay,statusRef,reference:state.success?state.reservation?.demoPaymentConfirmation?.reference:undefined};
}
