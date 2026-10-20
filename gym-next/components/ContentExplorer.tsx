"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatOfferPrice } from "@/lib/offers-catalog";
import styles from "./content-explorer.module.css";
type Card={id:string;author:string;title:string;summary:string;priceCents:number;version:number;published:boolean;downloads?:number;sales?:number;revenueCents?:number};
type Receipt={id:string;contentId:string;title:string;priceCents:number;commissionCents:number;sellerCents:number;purchasedAt:string};
type Data={role:string;catalogue:Card[];owned:Card[];library:Receipt[]};
export function ContentExplorer({connected}:{connected:boolean}) {
 const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[resource,setResource]=useState<{title:string;body:string}|null>(null);
 const lock=useRef(false),pending=useRef<{signature:string;id:string}|null>(null);
 async function run(input?:Record<string,unknown>,readId?:string){
  if(lock.current)return false;lock.current=true;setBusy(true);setError("");setMessage("");
  try{const response=await fetch(readId?`/api/contents/${encodeURIComponent(readId)}`:"/api/contents",input?{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)}:{cache:"no-store"});
   const payload=await response.json();if(!response.ok)throw new Error(payload.error || "Demande indisponible");
   if(readId)setResource(payload.data);else setData(payload.data);
   if(input)setMessage(input.action==="purchase"?"Achat simulé enregistré. Aucun paiement effectué.":"Modification enregistrée dans la démonstration.");
   return true;
  }catch(e){setError(e instanceof Error?e.message:"Connexion interrompue. Réessayez.");return false;}
  finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{if(connected)void run();},[connected]); // one initial read; actions explicitly refresh
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,values=new FormData(form);const price=String(values.get("price") || "");
  if(!/^\d{1,5}([.,]\d{1,2})?$/.test(price)){setError("Indique un prix fictif en euros, avec deux décimales au maximum.");return;}
  const input={action:"create",title:values.get("title"),summary:values.get("summary"),body:values.get("body"),priceCents:Math.round(Number(price.replace(",","."))*100),demoAcknowledged:values.get("demo")==="on"};
  const signature=JSON.stringify(input);if(pending.current?.signature!==signature)pending.current={signature,id:crypto.randomUUID()};
  if(await run({...input,requestId:pending.current!.id})){pending.current=null;form.reset();}
 }
 if(!connected)return <p><a href="/compte">Connecte-toi pour explorer les contenus de démonstration.</a></p>;
 return <div className={styles.root} data-content-explorer aria-busy={busy}>
  <div className={styles.notice}><strong>Démonstration uniquement.</strong> Prix fictifs choisis par les auteurs. Les achats simulés ouvrent un accès de test, sans prélèvement ni activation Premium. Ressources textuelles uniquement ; aucun conseil personnalisé certifié.</div>
  <div className={styles.actions}><button type="button" disabled={busy} onClick={()=>void run()}>Actualiser les contenus</button><a href="/offres">Consulter les offres prévues</a></div>
  {error?<p role="alert">{error}</p>:null}<p role="status">{busy?"Chargement…":message}</p>
  {data?<>
   <section aria-labelledby="catalog-title"><h2 id="catalog-title">Catalogue de démonstration</h2>{data.catalogue.length?<div className={styles.grid}>{data.catalogue.map(row=>{
    const purchased=data.library.some(p=>p.contentId===row.id),owned=data.owned.some(p=>p.id===row.id);
    return <article className={styles.card} key={row.id}><span className={styles.tag}>RESSOURCE FICTIVE · TEXTE</span><h3>{row.title}</h3><p>Par {row.author}</p><p>{row.summary}</p><p className={styles.price}>{formatOfferPrice(row.priceCents)} € <small>fictifs</small></p>
     {owned||purchased?<button type="button" disabled={busy} onClick={()=>void run(undefined,row.id)}>Lire la ressource</button>:data.role==="sportif"?<form onSubmit={event=>{event.preventDefault();void run({action:"purchase",id:row.id,expectedVersion:row.version,expectedPriceCents:row.priceCents,demoAcknowledged:true});}}><label className={styles.check}><input type="checkbox" required disabled={busy}/>Je confirme un achat fictif, sans paiement.</label><button disabled={busy}>Simuler l’achat</button></form>:<p>L’achat simulé est réservé au profil sportif.</p>}
    </article>;
   })}</div>:<p>Aucune ressource publiée pour le moment.</p>}</section>
   <section aria-labelledby="library-title"><h2 id="library-title">Ma bibliothèque</h2>{data.library.length?<div className={styles.grid}>{data.library.map(row=><article className={styles.card} key={row.id}><h3>{row.title}</h3><p>Achat simulé du {new Date(row.purchasedAt).toLocaleDateString("fr-FR")} · {formatOfferPrice(row.priceCents)} € fictifs</p><div className={styles.actions}><button disabled={busy} onClick={()=>void run(undefined,row.contentId)}>Lire la ressource</button><a href={`/api/contents/${encodeURIComponent(row.contentId)}?download=1`}>Télécharger le texte</a></div></article>)}</div>:<p>Aucun achat simulé enregistré sur ce compte.</p>}</section>
   {resource?<section className={styles.reader} aria-labelledby="resource-title" data-content-reader><h2 id="resource-title">{resource.title}</h2><p>Ressource de démonstration</p><div className={styles.body}>{resource.body}</div><button onClick={()=>setResource(null)}>Fermer la lecture</button></section>:null}
   {data.role==="coach"?<>
    <section aria-labelledby="create-title" className={styles.card}><h2 id="create-title">Préparer une ressource fictive</h2><p>Un brouillon est privé. La publication dans le catalogue nécessite un profil coach validé. Cette démonstration n’accorde aucun droit commercial Premium.</p>
    <form onSubmit={create} className={styles.form}><label>Titre<input name="title" required minLength={3} maxLength={120} disabled={busy}/></label><label>Présentation publique<textarea name="summary" required minLength={3} maxLength={600} disabled={busy}/></label><label>Texte réservé aux accès autorisés<textarea name="body" required minLength={3} maxLength={12000} rows={6} disabled={busy}/></label><label>Prix fictif en euros<input name="price" inputMode="decimal" required disabled={busy}/></label><label className={styles.check}><input name="demo" type="checkbox" required disabled={busy}/>Je confirme une ressource fictive, sans donnée personnelle ni contenu tiers sans autorisation.</label><button disabled={busy}>Enregistrer le brouillon</button></form></section>
    <section aria-labelledby="owned-title"><h2 id="owned-title">Mes ressources</h2>{data.owned.length?<div className={styles.grid}>{data.owned.map(row=><article className={styles.card} key={row.id}><h3>{row.title}</h3><p>{row.published?"Publiée dans la démo":"Brouillon ou retirée du catalogue"}</p><p>{row.sales} achat(s) simulé(s) · {row.downloads} téléchargement(s) demandé(s)</p><p>Revenu fictif net : {formatOfferPrice(row.revenueCents ?? 0)} € ; commission contenus simulée : 20 %.</p><div className={styles.actions}><button disabled={busy} onClick={()=>void run({action:row.published?"withdraw":"publish",id:row.id,expectedVersion:row.version})}>{row.published?"Retirer du catalogue":"Publier dans la démo"}</button><button disabled={busy} onClick={()=>void run(undefined,row.id)}>Lire mon texte</button>{!row.published && row.sales===0?<button disabled={busy} onClick={()=>{if(window.confirm("Supprimer définitivement ce brouillon de démonstration ?"))void run({action:"delete",id:row.id,expectedVersion:row.version});}}>Supprimer le brouillon</button>:null}</div><p>Un retrait conserve les accès déjà acquis. Seuls les brouillons sans achat peuvent être supprimés.</p></article>)}</div>:<p>Aucun brouillon sur ce compte.</p>}</section>
   </>:null}
  </>:!busy&&!error?<p>Catalogue en cours de chargement.</p>:null}
 </div>;
}
