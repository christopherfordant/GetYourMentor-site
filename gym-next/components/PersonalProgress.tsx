"use client";
import { useEffect,useRef,useState,type FormEvent } from "react";
import styles from "./personal-progress.module.css";
type Data={goal:{title:string|null;targetSessions:number|null;version:number;updatedAt:string|null};summary:{elapsedPaid:number;upcomingOrOngoingPaid:number;paidUnknownSchedule:number;acceptedUnpaid:number;requested:number;cancelled:number}};
export function PersonalProgress(){
 const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const lock=useRef(false),pending=useRef<{signature:string;id:string}|null>(null);
 async function run(input?:Record<string,unknown>){if(lock.current)return;lock.current=true;setBusy(true);setError("");setMessage("");
  try{let body:Record<string,unknown>|undefined;
   if(input){const signature=JSON.stringify(input);if(pending.current?.signature!==signature)pending.current={signature,id:crypto.randomUUID()};body={...input,requestId:pending.current!.id};}
   const response=await fetch("/api/progress",body?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}:{cache:"no-store"});
   const payload=await response.json();if(!response.ok)throw new Error(payload.error || "Suivi indisponible");setData(payload.data);
   if(input){pending.current=null;setMessage(input.action==="clear"?"Objectif effacé. Tes réservations sont conservées.":"Objectif fictif enregistré.");}
  }catch(e){setError(e instanceof Error?e.message:"Connexion interrompue. Réessayez.");}finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{void run();},[]);
 function save(event:FormEvent<HTMLFormElement>){event.preventDefault();if(!data)return;const values=new FormData(event.currentTarget);void run({action:"save",title:values.get("title"),targetSessions:Number(values.get("targetSessions")),demoAcknowledged:values.get("demo")==="on",expectedVersion:data.goal.version});}
 return <div className={styles.root} data-personal-progress aria-busy={busy}>
  <p className={styles.notice}>Démonstration : utilise des exemples fictifs, sans information de santé. Ton objectif reste privé ; il n’est pas partagé avec les coachs ou les structures.</p>
  <button disabled={busy} onClick={()=>void run()}>Actualiser mon suivi</button>{error?<p role="alert">{error}</p>:null}<p role="status">{busy?"Chargement…":message}</p>
  {data?<>
   <div className={styles.grid}><section className={styles.card} aria-labelledby="goal-title"><h2 id="goal-title">Mon objectif personnel</h2>
    {data.goal.title&&data.goal.targetSessions?<><h3>{data.goal.title}</h3><progress value={Math.min(data.summary.elapsedPaid,data.goal.targetSessions)} max={data.goal.targetSessions} aria-label="Repère de progression de l’objectif fictif"/><p>{data.summary.elapsedPaid} / {data.goal.targetSessions} séance(s) payée(s) au créneau écoulé.</p><p>{data.summary.elapsedPaid>=data.goal.targetSessions?"Repère numérique atteint ; la présence réelle reste à confirmer.":"Un repère indicatif, sans attestation de présence ni de performance."}</p><button disabled={busy} onClick={()=>void run({action:"clear",expectedVersion:data.goal.version})}>Effacer mon objectif</button></>:<p>Aucun objectif enregistré.</p>}
    <p>Le total porte sur tout l’historique de tes réservations de démonstration. Une réservation de groupe compte pour une séance, pas pour le nombre de participants. Ce suivi n’active aucune récompense.</p>
   </section><section className={styles.card} aria-labelledby="edit-goal-title"><h2 id="edit-goal-title">Définir mon cap</h2><form key={data.goal.version} onSubmit={save} className={styles.form}><label>Intitulé fictif<input name="title" required minLength={3} maxLength={120} defaultValue={data.goal.title ?? ""} disabled={busy}/></label><label>Nombre total de séances visé<input name="targetSessions" type="number" required min={1} max={1000} step={1} defaultValue={data.goal.targetSessions ?? ""} disabled={busy}/></label><label className={styles.check}><input name="demo" type="checkbox" required disabled={busy}/>Je confirme un objectif fictif sans donnée de santé.</label><button disabled={busy}>Enregistrer l’objectif fictif</button></form></section></div>
   <section aria-labelledby="session-summary-title"><h2 id="session-summary-title">Mes repères de réservation</h2><dl className={styles.metrics}><div><dt>Payées, créneau écoulé</dt><dd>{data.summary.elapsedPaid}</dd></div><div><dt>Payées, à venir ou en cours</dt><dd>{data.summary.upcomingOrOngoingPaid}</dd></div><div><dt>Acceptées, non payées</dt><dd>{data.summary.acceptedUnpaid}</dd></div><div><dt>Demandes en attente</dt><dd>{data.summary.requested}</dd></div><div><dt>Annulées</dt><dd>{data.summary.cancelled}</dd></div></dl>{data.summary.paidUnknownSchedule>0?<p role="status">{data.summary.paidUnknownSchedule} réservation(s) payée(s) sans horaire exploitable : exclue(s) du repère écoulé.</p>:null}<p>Ces nombres décrivent les statuts enregistrés, pas un bilan médical ou une mesure sportive.</p><a href="/compte">Consulter mes réservations</a></section>
  </>:!busy&&!error?<p>Chargement du suivi personnel.</p>:null}
 </div>;
}
