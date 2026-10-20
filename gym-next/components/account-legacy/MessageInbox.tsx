"use client";
import { MAX_MESSAGE_FILE_BYTES, type AttachmentInput } from "@/lib/message-attachment-contract";
import { MessageFileDownload } from "./MessageFileDownload";

import { useEffect, useRef, useState } from "react";
import {isDisplayMessage,messageContacts,selectMessages,type MessageOrder} from "./message-view";
import styles from "./message-filters.module.css";
import {MessageTemplates} from "./MessageTemplates";
import type { Message } from "@/lib/messages";

export function MessageInbox({ recipientName, contacts, contactKind = "coach" }: { recipientName?: string; contacts?: Array<{ value: string; label: string }>; contactKind?: "coach" | "structure" }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [canReply, setCanReply] = useState(false);
  const [selected, setSelected] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [query, setQuery] = useState("");
  const [correspondent,setCorrespondent]=useState("");
  const [order,setOrder]=useState<MessageOrder>("newest");
  const sending = useRef(false);
  const requestId = useRef("");
  const bodyRef=useRef<HTMLTextAreaElement>(null);
  const [file, setFile] = useState<AttachmentInput>();
  const [fileHash, setFileHash] = useState("");
  const [filePreparing, setFilePreparing] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [retryAllowed, setRetryAllowed] = useState(false);
  const fileSelection = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const locked = busy || uncertain || filePreparing;
  const pendingCheck = useRef<((message: Message) => boolean) | null>(null);
  const operationEpoch = useRef(0);
  useEffect(() => {
    operationEpoch.current++; sending.current = false; setBusy(false); setUncertain(false); setRetryAllowed(false); pendingCheck.current = null; setSelected(""); setBody(""); clearFile(); setFilePreparing(false);
    return () => { operationEpoch.current++; fileSelection.current++; pendingCheck.current = null; };
  }, [recipientName]);
  function clearFile() { fileSelection.current++; setFile(undefined); setFileHash(""); if (fileInput.current) fileInput.current.value = ""; }
  function finishMessage(message: Message) {
    setMessages(previous => previous.some(m => m.id === message.id) ? previous : [...previous, message]);
    setBody(""); setSelected(""); clearFile(); setUncertain(false); setRetryAllowed(false); pendingCheck.current = null;
    setFeedback("Votre réponse a bien été envoyée.");
  }
  async function chooseFile(selectedFile?: File) {
    const version = ++fileSelection.current;
    setFile(undefined); setFileHash(""); setFeedback("");
    requestId.current = crypto.randomUUID();
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith(".txt") || !selectedFile.size || selectedFile.size > MAX_MESSAGE_FILE_BYTES) { setFeedback("Choisissez un fichier .txt non vide de 64 Kio maximum."); if (fileInput.current) fileInput.current.value = ""; return; }
    setFilePreparing(true);
    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const base64 = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(""));
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(n => n.toString(16).padStart(2, "0")).join("");
      if (version !== fileSelection.current) return;
      setFile({ name: selectedFile.name, type: "text/plain", base64 }); setFileHash(hash);
    } catch { if (version === fileSelection.current) setFeedback("Impossible de lire ce fichier. Sélectionnez-le à nouveau."); }
    finally { if (version === fileSelection.current) setFilePreparing(false); }
  }

  function insertTemplate(text:string){
    if(sending.current||locked)return;
    if(body.trim()&&body!==text&&!window.confirm("Remplacer le brouillon actuel par ce modèle ? Votre texte sera remplacé."))return;
    if(body!==text){setBody(text);requestId.current=crypto.randomUUID();}
    setFeedback("");requestAnimationFrame(()=>bodyRef.current?.focus());
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const query = recipientName ? `?recipientName=${encodeURIComponent(recipientName)}` : "";
    fetch(`/api/messages${query}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Messages indisponibles"))))
      .then(payload => { if (!Array.isArray(payload.data)||!payload.data.every(isDisplayMessage)||new Set(payload.data.map((m:Message)=>m.id)).size!==payload.data.length) throw new Error("Messages indisponibles"); if(controller.signal.aborted)return; setMessages(payload.data); setCanReply(payload.canReply === true);
        if (pendingCheck.current) {
          const found = payload.data.find(pendingCheck.current);
          if (found) finishMessage(found);
          else { setRetryAllowed(true); setFeedback("Envoi non retrouvé. Vous pouvez réessayer le même envoi, sans modifier le brouillon."); }
        } })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [recipientName, attempt]);

  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !selected || !body.trim() || filePreparing || (uncertain && !retryAllowed)) return;
    const epoch = operationEpoch.current;
    sending.current = true; setBusy(true); setRetryAllowed(false); setFeedback("");
    try {
      const target = selected.startsWith("contact:") ? contactKind === "structure" ? { structureEmail: selected.slice(8) } : { recipientName: selected.slice(8) } : { replyToId: selected };
      const expected = (m: Message) => m.requestId === requestId.current && m.body === body.trim()
        && m.authorRole === (recipientName ? "coach" : contacts ? "club" : "sportif")
        && (target.replyToId === undefined || m.replyToId === target.replyToId)
        && (!file ? !m.attachment : m.attachment?.sha256 === fileHash && m.attachment.name === file.name);
      if (file) pendingCheck.current = expected;
      const response = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...target, requestId: requestId.current, body, ...(file ? { attachment: file } : {}) }) });
      const payload = await response.json();
      if (epoch !== operationEpoch.current) return;
      if (!response.ok) { if (response.status < 500) pendingCheck.current = null; throw new Error(payload.error ?? "Réponse impossible."); }
      if(!isDisplayMessage(payload.data)||(file&&!expected(payload.data)))throw new Error("Réponse du serveur inexploitable. Actualisez les messages pour vérifier l’envoi.");
      setMessages(previous => previous.some(message => message.id === payload.data.id) ? previous : [...previous, payload.data]);
      clearFile(); pendingCheck.current = null; setUncertain(false);
      setBody(""); setSelected(""); setFeedback(selected.startsWith("contact:") ? "Votre message a bien été envoyé." : "Votre réponse a bien été envoyée.");
    } catch (error) {
      if (epoch !== operationEpoch.current) return;
      if (file && pendingCheck.current) { setUncertain(true); setFeedback("Résultat de l’envoi non confirmé. Actualisez les messages avant toute nouvelle tentative."); }
      else setFeedback(error instanceof Error ? error.message : "Réponse impossible.");
    }
    finally { if (epoch === operationEpoch.current) { sending.current = false; setBusy(false); } }
  }
  const coachView=!!recipientName;
  const correspondents=messageContacts(messages,coachView);
  const visible=selectMessages(messages,coachView,correspondent,query,order);
  const absent=!!correspondent&&!correspondents.some(c=>c.value===correspondent);

  return (
    <section className="account-dashboard-card" id="coach-messages-live" data-message-inbox aria-busy={loading}>
      <div className="coach-home-card-head">
        <h3>Messagerie</h3>
        <span>{messages.length} message{messages.length > 1 ? "s" : ""}</span>
      </div>
      <button className="auth-secondary" type="button" disabled={loading || busy} onClick={() => setAttempt(value => value + 1)}>Actualiser les messages</button>
      {canReply && contacts ? contacts.length ? <label className="auth-field">{contactKind === "structure" ? "Contacter une structure affiliée" : "Contacter un coach affilié"}<select disabled={locked} value={selected.startsWith("contact:") ? selected.slice(8) : ""} onChange={event => { clearFile(); setSelected(event.target.value ? `contact:${event.target.value}` : ""); setBody(""); setFeedback(""); requestId.current = crypto.randomUUID(); }}><option value="">Choisir un contact</option>{contacts.map(contact => <option key={contact.value} value={contact.value}>{contact.label}</option>)}</select></label> : <p>Aucun contact affilié actif pour le moment. Les deux parties doivent accepter l’affiliation avant de démarrer cet échange.</p> : null}
      {loading ? <p role="status">Chargement des messages…</p> : error ? <p role="alert">{error} Utilisez « Actualiser les messages » pour réessayer.</p> : <>
      {messages.length||correspondent?<>
      <div className={styles.filters} data-message-filters>
        <label className="auth-field">Filtrer par correspondant<select aria-label="Filtrer par correspondant" value={correspondent} disabled={locked||!!selected} onChange={e=>setCorrespondent(e.target.value)}><option value="">Tous les correspondants</option>{absent?<option value={correspondent} disabled>Correspondant absent des messages chargés</option>:null}{correspondents.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
        <label className="auth-field">Trier par date<select aria-label="Trier par date" value={order} disabled={locked} onChange={e=>setOrder(e.target.value as MessageOrder)}><option value="newest">Plus récents d’abord</option><option value="oldest">Plus anciens d’abord</option></select></label>
      </div>
      {selected?<p>Fermez la réponse en cours pour changer de correspondant.</p>:null}
      </>:null}
      {messages.length ? <label className="auth-field">Rechercher dans mes échanges<input type="search" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} /></label> : null}
      <p className={styles.summary} aria-live="polite" aria-atomic="true" data-message-result-count>{visible.length} message{visible.length>1?"s":""} affiché{visible.length>1?"s":""} sur {messages.length}. Tri : {order==="newest"?"plus récents d’abord":"plus anciens d’abord"}.</p>
      {messages.length === 0 && !correspondent ? <p data-message-empty>Aucun message pour le moment.</p> : !visible.length ? <p>Aucun échange ne correspond aux filtres sélectionnés.</p> : visible.map((message) => (
        <article key={message.id} data-message={message.id}>
          <strong>{recipientName ? message.authorRole === "coach" ? "Votre réponse" : message.senderEmail : message.authorRole === "coach" ? `Réponse de ${message.recipientName}` : `À ${message.recipientName}`}</strong>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.body}</p>
          {message.attachment ? <MessageFileDownload messageId={message.id} file={message.attachment}/> : null}
          <p><time dateTime={message.createdAt}>{Number.isFinite(Date.parse(message.createdAt))?new Date(message.createdAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }):"Date indisponible"}</time></p>
          {canReply ? <button className="auth-secondary" type="button" disabled={locked} onClick={() => { clearFile(); setSelected(message.id); setBody(""); setFeedback(""); requestId.current = crypto.randomUUID(); }}>Répondre à ce message</button> : null}
        </article>
      ))}</>}
      {selected && canReply ? <form onSubmit={reply} aria-label={selected.startsWith("contact:") ? "Démarrer un échange" : "Répondre au message"}>
        <p>{selected.startsWith("contact:") ? "Message au contact affilié sélectionné." : "Réponse dans la conversation sélectionnée."} Aucun email ou SMS externe n’est envoyé.</p>
        {recipientName ? <MessageTemplates key={selected} disabled={locked} onInsert={insertTemplate}/> : null}
        <label className="auth-field">Votre réponse<textarea ref={bodyRef} required maxLength={4000} rows={4} value={body} onChange={event => { setBody(event.target.value); requestId.current = crypto.randomUUID(); }} disabled={locked} /></label>
        <fieldset disabled={locked} data-message-file-picker style={{ minWidth: 0, border: "1px solid #d8cae8", borderRadius: 12, padding: 12 }}>
          <legend>Pièce jointe facultative</legend>
          <label className="auth-field">Fichier texte (.txt)<input ref={fileInput} type="file" accept=".txt,text/plain" style={{ maxWidth: "100%", minHeight: 44 }} onChange={event => chooseFile(event.target.files?.[0])}/></label>
          <p>Un fichier .txt UTF-8 de 64 Kio maximum. Téléchargement privé, sans analyse antivirus.</p>
          {filePreparing ? <p>Lecture du fichier…</p> : file ? <><p style={{ overflowWrap: "anywhere" }}>{file.name} · sélectionné, pas encore envoyé</p><button className="auth-secondary" type="button" onClick={() => { clearFile(); requestId.current = crypto.randomUUID(); }}>Retirer le fichier</button></> : null}
        </fieldset>
        <button type="submit" className="auth-primary" disabled={busy || filePreparing || (uncertain && !retryAllowed) || !body.trim()}>{busy ? "Envoi…" : selected.startsWith("contact:") ? "Envoyer le message" : "Envoyer la réponse"}</button>
        <button type="button" className="auth-secondary" disabled={locked} onClick={() => { clearFile(); setSelected(""); setBody(""); }}>Fermer la réponse</button>
      </form> : null}
      {feedback ? <p role="status">{feedback}</p> : null}
    </section>
  );
}
