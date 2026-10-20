"use client";
import { useEffect, useRef, useState } from "react";
import { offersCatalog, formatOfferPrice } from "@/lib/offers-catalog";
import styles from "./offer-explorer.module.css";
type State = { role:string; eligiblePlanId:string|null; preview:{planId:string|null;version:number;updatedAt:string|null}; effective:{premiumEnabled:boolean;sessionCommissionBps:number;commissionVersion:number;billingEnabled:boolean} };
export function OfferExplorer({connected}:{connected:boolean}) {
  const [state,setState]=useState<State|null>(null),[loading,setLoading]=useState(connected),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[reload,setReload]=useState(0);
  const sending=useRef(false),pending=useRef<{action:string;requestId:string;expectedVersion:number;planId?:string}|null>(null);
  useEffect(()=>{
    if(!connected)return;const controller=new AbortController();setLoading(true);setError("");
    fetch("/api/offers/preview",{cache:"no-store",signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error??"Aperçu indisponible");if(!result.data?.preview||!result.data?.effective)throw new Error("Aperçu indisponible");return result.data;}).then(data=>{if(!controller.signal.aborted){setState(data);pending.current=null;}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
  },[connected,reload]);
  async function select(action:"select"|"clear",planId?:string){
    if(!state||sending.current||loading)return;sending.current=true;setBusy(true);setError("");setMessage("");
    if(!pending.current||pending.current.action!==action||pending.current.planId!==planId)pending.current={action,planId,expectedVersion:state.preview.version,requestId:crypto.randomUUID()};
    try {const response=await fetch("/api/offers/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(pending.current)});const result=await response.json();if(!response.ok)throw new Error(result.error??"Action impossible");setState(result.data);pending.current=null;setMessage(action==="clear"?"Aperçu effacé. Aucun abonnement n’a été résilié.":"Aperçu enregistré. Aucun abonnement ni avantage Premium activé.");}catch(e){setError(e instanceof Error?e.message:"Action impossible");}finally{sending.current=false;setBusy(false);}
  }
  return <div className={styles.root} data-offer-explorer aria-busy={loading}>
    <p>Mode démonstration : le choix d’un aperçu ne change ni tes accès ni la commission appliquée aux séances.</p>
    {connected?<button disabled={loading||busy} onClick={()=>setReload(v=>v+1)}>Actualiser mon aperçu</button>:<p><a href="/compte">Se connecter pour retrouver son aperçu</a></p>}
    {loading?<p role="status">Chargement de ton aperçu…</p>:null}{error?<p role="alert">{error}</p>:null}<p role="status">{message}</p>
    <div className={styles.grid}><article className={styles.card}><h2>Sportif</h2><p className={styles.price}>À la séance</p><p>Tarif fixé par le coach. Aucun surplus plateforme ajouté au sportif.</p><p>Pas d’abonnement requis pour rechercher un coach. Les contenus exclusifs restent à venir.</p><a href="/recherche">Trouver un coach</a></article>
      {(["coach","club"] as const).map(role=>{const offer=offersCatalog[role];const selected=state?.preview.planId===offer.id;return <article className={styles.card} key={role} data-offer={offer.id}><h2>{offer.name}</h2><p className={styles.price}>{formatOfferPrice(offer.priceCents)} € <small>/ mois</small></p><p className={styles.tag}>Offre prévue · achat indisponible</p><ul>{offer.benefits.map(text=><li key={text}>{text}</li>)}</ul>{role==="club"?<p>+ {formatOfferPrice(offersCatalog.club.extraCoachCents)} € par coach supplémentaire. Périodicité à confirmer : aucun total récurrent calculé.</p>:null}
        {state?.eligiblePlanId===offer.id?<button disabled={loading||busy||selected} onClick={()=>select("select",offer.id)}>{selected?"Aperçu sélectionné":"Choisir cet aperçu uniquement"}</button>:null}
      </article>;})}</div>
    <section className={styles.preview} aria-label="État de mon aperçu"><h2>Ce qui est réellement actif</h2>
      <p>Aucun achat, prélèvement, renouvellement, expiration ou avantage Premium n’est déclenché par cette page.</p>
      {state?<><p data-selected-offer>{state.preview.planId?`Aperçu choisi : ${state.preview.planId==="coach-premium"?"Coach Premium":"Structure"}.`:"Aucun aperçu sélectionné."}</p><p data-effective-commission>Commission actuelle sur les séances : {state.effective.sessionCommissionBps/100} %. Les montants historiques restent conservés.</p><p>Premium inactif. Les accès aux comptes, réservations et affiliations existants sont préservés.</p>{state.preview.planId?<button disabled={loading||busy} onClick={()=>select("clear")}>Effacer mon aperçu</button>:null}</>:<p>{connected?"Actualise pour consulter ton état.":"Connecte-toi pour consulter ton état personnel."}</p>}
    </section>
  </div>;
}
