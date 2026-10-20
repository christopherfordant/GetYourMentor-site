"use client";
import {useId,useState} from "react";
import {coachMessageTemplates} from "./message-templates";
import styles from "./message-templates.module.css";
export function MessageTemplates({disabled,onInsert}:{disabled:boolean;onInsert:(text:string)=>void}){
 const [selected,setSelected]=useState<string>("welcome"),id=useId();
 const model=coachMessageTemplates.find(m=>m.id===selected)??coachMessageTemplates[0];
 return <fieldset className={styles.root} disabled={disabled} data-message-templates>
  <legend>Modèles de messages</legend>
  <label className="auth-field" htmlFor={id}>Choisir un modèle<select id={id} value={model.id} onChange={e=>setSelected(e.target.value)}>{coachMessageTemplates.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
  <blockquote className={styles.preview} data-template-preview>{model.body}</blockquote>
  <p>Vérifiez et adaptez le texte avant de l’envoyer. L’insertion seule n’envoie aucun message.</p>
  <button type="button" className="auth-secondary" onClick={()=>onInsert(model.body)}>{model.id==="welcome"?"Utiliser le modèle d’accueil":"Insérer le modèle choisi"}</button>
 </fieldset>;
}
