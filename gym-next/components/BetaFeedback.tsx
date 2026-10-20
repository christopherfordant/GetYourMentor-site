"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./beta-feedback.module.css";

type Row = { id:string; kind?:string; title:string; body:string; status:string; votes:number; voted?:boolean; published?:boolean; publicTitle?:string; publicSummary?:string };
const labels: Record<string,string> = { received:"Reçu", reviewing:"À l’étude", planned:"Planifié", resolved:"Traité", closed:"Clos" };
async function call(method:string, data?:object, view?:string) {
  const response=await fetch(`/api/feedback${view ? `?view=${view}` : ""}`, { method, cache:"no-store", headers:{"Content-Type":"application/json"}, ...(data ? {body:JSON.stringify(data)} : {}) });
  const result=await response.json(); if(!response.ok) throw new Error(result.error ?? "Action impossible"); return result.data;
}
export function BetaFeedback({admin}:{admin:boolean}) {
  const [own,setOwn]=useState<Row[]>([]),[ideas,setIdeas]=useState<Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[feedback,setFeedback]=useState(""),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
  const [kind,setKind]=useState("suggestion"),[title,setTitle]=useState(""),[body,setBody]=useState("");
  const requestId=useRef(""),sending=useRef(false);
  useEffect(()=>{
    let active=true;setLoading(true);setError("");
    Promise.all([call("GET",undefined,admin?"admin":"mine"),call("GET",undefined,"suggestions")]).then(([mine,publicRows])=>{if(active){setOwn(mine);setIdeas(publicRows);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[admin,reload]);
  function edited(){requestId.current="";setFeedback("");}
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(sending.current)return;sending.current=true;setBusy(true);setFeedback("");requestId.current ||= crypto.randomUUID();
    try {await call("POST",{kind,title,body,requestId:requestId.current});setTitle("");setBody("");requestId.current="";setFeedback("Ton retour est enregistré. Il reste privé.");setReload(v=>v+1);}
    catch(e){setFeedback(e instanceof Error?e.message:"Envoi impossible");}finally{setBusy(false);sending.current=false;}
  }
  async function vote(id:string){
    if(sending.current)return;sending.current=true;setBusy(true);setFeedback("");
    try {await call("PATCH",{action:"vote",id});setFeedback("Ton vote est enregistré.");setReload(v=>v+1);}catch(e){setFeedback(e instanceof Error?e.message:"Vote impossible");}finally{setBusy(false);sending.current=false;}
  }
  return <div className={styles.root} data-beta-feedback aria-busy={loading}>
    <p>Mode démonstration. Aucun email n’est envoyé. N’inclus aucune donnée personnelle ou médicale dans ton retour.</p>
    <button className={styles.refresh} disabled={loading||busy} onClick={()=>setReload(v=>v+1)}>Actualiser les retours</button>
    {loading?<p role="status">Chargement des retours…</p>:null}{error?<p role="alert">{error} Tu peux actualiser pour réessayer.</p>:null}
    <p className={styles.status} role="status">{feedback}</p>
    <div className={styles.grid}>
      {!admin?<section className={styles.card}><h2>Partager un retour</h2><p>Le message reste privé. Seul un résumé de suggestion relu par l’équipe peut être publié pour les membres connectés.</p>
        <form onSubmit={submit} aria-label="Partager un retour"><label>Type de retour<select value={kind} disabled={busy} onChange={e=>{setKind(e.target.value);edited();}}><option value="suggestion">Une suggestion</option><option value="bug">Un problème</option><option value="positive">Un point positif</option></select></label>
          <label>Titre<input required maxLength={120} value={title} disabled={busy} onChange={e=>{setTitle(e.target.value);edited();}} /></label>
          <label>Ton message<textarea required maxLength={2000} rows={5} value={body} disabled={busy} onChange={e=>{setBody(e.target.value);edited();}} /></label>
          <button disabled={busy||!title.trim()||!body.trim()}>Envoyer mon retour</button></form></section>:null}
      <section className={styles.card}><h2>Les idées à soutenir</h2><p>Un vote par compte et par suggestion. Un vote ne garantit pas sa réalisation.</p>
        {!loading&&!error&&!ideas.length?<p>Aucune suggestion publiée pour le moment.</p>:null}
        {ideas.map(row=><article className={styles.item} key={row.id} data-suggestion={row.id}><span className={styles.badge}>{labels[row.status]}</span><h3>{row.title}</h3><p>{row.body}</p><p>{row.votes} vote{row.votes>1?"s":""}</p>{!admin?<button disabled={busy||loading||Boolean(row.voted)} onClick={()=>vote(row.id)}>{row.voted?"Vote enregistré":"Soutenir cette idée"}</button>:null}</article>)}
      </section>
    </div>
    <section className={styles.card}><h2>{admin?"Modérer les retours":"Mes retours"}</h2>
      {!loading&&!error&&!own.length?<p>Aucun retour pour le moment.</p>:null}
      {own.map(row=><article className={styles.item} key={row.id} data-feedback={row.id}><span className={styles.badge}>{labels[row.status]} · {row.kind==="bug"?"Problème":row.kind==="positive"?"Point positif":"Suggestion"}</span><h3>{row.title}</h3><p style={{whiteSpace:"pre-wrap"}}>{row.body}</p>
        {admin?<Moderation row={row} onSaved={()=>setReload(v=>v+1)} />:<p>{row.published?"Un résumé de cette suggestion est publié.":"Message privé, accessible à toi et à l’administration."}</p>}
      </article>)}
    </section>
  </div>;
}
function Moderation({row,onSaved}:{row:Row;onSaved:()=>void}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");const sending=useRef(false);
  async function save(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(sending.current)return;const data=new FormData(event.currentTarget);sending.current=true;setBusy(true);setMessage("");
    try {await call("PATCH",{action:"moderate",id:row.id,status:data.get("status"),published:data.get("published")==="on",publicTitle:data.get("publicTitle"),publicSummary:data.get("publicSummary")});setMessage("Modération enregistrée.");onSaved();}catch(e){setMessage(e instanceof Error?e.message:"Mise à jour impossible");}finally{sending.current=false;setBusy(false);}
  }
  return <form onSubmit={save} aria-label={`Modérer ${row.title}`}><label>État<select name="status" defaultValue={row.status} disabled={busy}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    {row.kind==="suggestion"?<><p>Rédige un résumé sans identité ni détail privé avant de publier. Le texte original reste privé.</p><label>Titre partagé<input name="publicTitle" maxLength={120} defaultValue={row.publicTitle??""} disabled={busy} /></label><label>Résumé partagé<textarea name="publicSummary" maxLength={600} defaultValue={row.publicSummary??""} disabled={busy} /></label><label><input type="checkbox" name="published" defaultChecked={row.published} disabled={busy} /> Publier pour les membres connectés</label></>:null}
    <button disabled={busy}>Enregistrer la modération</button><p role="status">{message}</p></form>;
}
