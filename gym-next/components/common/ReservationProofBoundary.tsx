"use client";
import styles from "./ReservationProofBoundary.module.css";
import { useEffect,useRef,useState,type ReactNode } from "react";
export function ReservationProofBoundary({id,children}:{id?:string;children:ReactNode}) {
 const [state,setState]=useState<"loading"|"ready"|"error">("loading");
 const operation=useRef<Promise<boolean>|null>(null);
 useEffect(()=>{
  let active=true;
  if(!operation.current){
   const url=new URL(window.location.href);const token=url.searchParams.get("claimToken");url.searchParams.delete("claimToken");
   window.history.replaceState(window.history.state,"",url.pathname+url.search+url.hash);
   operation.current=token?fetch("/api/reservations/summary",{method:"POST",cache:"no-store",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(10000),headers:{"Content-Type":"application/json"},body:JSON.stringify({reservationId:id,claimToken:token})}).then(async r=>r.ok && Boolean((await r.json())?.data?.id===id)).catch(()=>false):Promise.resolve(true);
  }
  operation.current.then(ok=>{if(active)setState(ok?"ready":"error");});
  return ()=>{active=false;};
 },[id]);
 if(state==="loading")return <section className={styles.card} aria-label="Accès à la réservation"><p role="status">Vérification de l’accès à la réservation…</p></section>;
 if(state==="error")return <section className={styles.card}><h1>Accès à votre demande</h1><p role="alert">La preuve de réservation est absente, invalide ou expirée. Aucun nouvel envoi n’a été effectué.</p><a href="/compte">Accéder à mon compte sans cette demande</a></section>;
 return children;
}
