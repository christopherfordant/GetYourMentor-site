// Server-side diagnostic only. No provider, route, environment, logger or I/O.
import { isMessageAttachment, MAX_MESSAGE_REQUEST_BYTES, type MessageAttachment } from "./message-attachment-contract";
import type { Message } from "./messages";
export type MessageObservation = Readonly<{
 status: "PASS" | "FAIL" | "INDETERMINATE" | "MISMATCH" | "NOT_FOUND" | "REFUSED" | "READ_FAILED";
 targetFound: boolean; scopeMatched: boolean; metadataConformant: boolean;
 unexpectedProperties: boolean; payloadDetected: boolean; inspectionComplete: boolean;
}>;
export type ObservationExpectation = Readonly<{
 synthetic: true; runId: string; messageId: string; requestId: string;
 senderEmail: string; coachId: string; recipientName: string;
 authorRole: NonNullable<Message["authorRole"]>; ownerRole: NonNullable<Message["ownerRole"]>;
 body: string; replyToId?: string; reservationId?: string; attachment: MessageAttachment;
}>;
const messageKeys = new Set(["id","senderEmail","recipientName","body","createdAt","coachId","authorRole","ownerRole","replyToId","requestId","reservationId","attachment"]);
const fileKeyNames = ["id","name","size","type","sha256"] as const;
const fileKeys = new Set<string>(fileKeyNames);
const documentKeys = new Set(["users","messages","reservations","coaches","clubs","pendingMessageFiles"]);
export function observationResult(status: MessageObservation["status"], flags: Partial<Omit<MessageObservation,"status">> = {}): MessageObservation {
 // Never spread caller objects into output; copy the fixed boolean allowlist only.
 return Object.freeze({status, targetFound: flags.targetFound === true, scopeMatched: flags.scopeMatched === true,
  metadataConformant: flags.metadataConformant === true, unexpectedProperties: flags.unexpectedProperties === true,
  payloadDetected: flags.payloadDetected === true, inspectionComplete: flags.inspectionComplete === true});
}
function record(value: unknown): Record<string, unknown> {
 if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
 const proto = Object.getPrototypeOf(value); if (proto !== Object.prototype && proto !== null) throw new Error();
 const keys = Reflect.ownKeys(value); if (keys.length > 32 || keys.some(k => typeof k !== "string")) throw new Error();
 const copy: Record<string, unknown> = Object.create(null);
 for (const key of keys as string[]) {
  const d = Object.getOwnPropertyDescriptor(value,key); if (!d || !("value" in d) || !d.enumerable) throw new Error();
  copy[key] = d.value;
 }
 return copy;
}
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.length > 0 && value.length <= max; }
export function prepareObservationExpectation(value: unknown): ObservationExpectation | undefined {
 try {
  const e = record(value);
  const allowed = new Set(["synthetic","runId","messageId","requestId","senderEmail","coachId","recipientName","authorRole","ownerRole","body","replyToId","reservationId","attachment"]);
  if (Object.keys(e).some(k => !allowed.has(k)) || e.synthetic !== true || !text(e.runId,48) || !/^[a-z0-9-]{8,48}$/.test(e.runId)) return;
  if (!text(e.messageId,128) || !text(e.requestId,80) || e.requestId !== `recipe-${e.runId}-message-1`) return;
  if (!text(e.senderEmail,254) || !/^[^@\s]+@example\.com$/.test(e.senderEmail) || !text(e.coachId,128) || !text(e.recipientName,160)) return;
  if (!["sportif","coach","club"].includes(e.authorRole as string) || !["sportif","club"].includes(e.ownerRole as string)) return;
  if (!text(e.body,4000) || !e.body.includes(e.runId) || (e.replyToId !== undefined && !text(e.replyToId,128)) || (e.reservationId !== undefined && !text(e.reservationId,128))) return;
  const a = record(e.attachment);
  if (Object.keys(a).some(k => !fileKeys.has(k)) || !isMessageAttachment(a)) return;
  return Object.freeze({...e, attachment: Object.freeze({...a})}) as ObservationExpectation;
 } catch { return; }
}
export function observeMessageRecord(input: unknown, expected: unknown): MessageObservation {
 const e = prepareObservationExpectation(expected);
 if (!e) return observationResult("REFUSED");
 if (input === null || input === undefined) return observationResult("NOT_FOUND",{inspectionComplete:true});
 let found = false, matched = false, meta = false, extra = false, payload = false;
 try {
  const m = record(input); found = m.id === e.messageId;
  if (!found) return observationResult("MISMATCH");
  matched = m.requestId === e.requestId && m.senderEmail === e.senderEmail && m.coachId === e.coachId
   && m.recipientName === e.recipientName && m.authorRole === e.authorRole && (m.ownerRole === undefined ? "sportif" : m.ownerRole) === e.ownerRole
   && m.replyToId === e.replyToId && m.reservationId === e.reservationId;
  // Do not traverse a different record, a document wrapper, users or conversations.
  if (!matched) return observationResult("MISMATCH",{targetFound:found});
  const flags = () => ({targetFound:found,scopeMatched:matched,metadataConformant:meta,unexpectedProperties:extra,payloadDetected:payload});
  let nodes = 0, properties = 0, stringBytes = 0;
  const seen = new WeakSet<object>();
  function inspect(value: unknown, depth: number) {
   if (++nodes > 128 || depth > 4) throw new Error();
   if (typeof value === "string") {
    stringBytes += value.length * 3; if (stringBytes > MAX_MESSAGE_REQUEST_BYTES) throw new Error();
    // A base64-shaped unexpected string is suspicious, not proof of its meaning.
    if (value.length >= 4 && value.length % 4 === 0 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) payload = true;
    return;
   }
   if (value === null || value === undefined || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return;
   if (typeof value !== "object") throw new Error();
   if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {payload = true; return;}
   if (seen.has(value)) throw new Error(); seen.add(value);
   const proto = Object.getPrototypeOf(value);
   if (proto !== Object.prototype && proto !== null && !Array.isArray(value)) throw new Error();
   const keys = Reflect.ownKeys(value); if (keys.length > 64 || keys.some(k => typeof k !== "string")) throw new Error();
   for (const k of keys as string[]) {
    if (++properties > 64 || documentKeys.has(k)) throw new Error();
    const d = Object.getOwnPropertyDescriptor(value,k); if (!d || !("value" in d)) throw new Error();
    inspect(d.value,depth+1);
   }
  }
  for (const [k,v] of Object.entries(m)) if (!messageKeys.has(k)) {extra = true; if (documentKeys.has(k)) throw new Error(); inspect(v,0);}
  const fieldsValid = text(m.body,4000) && m.body === e.body && text(m.createdAt,64) && Number.isFinite(Date.parse(m.createdAt));
  if (m.attachment === undefined || m.attachment === null) return observationResult("FAIL",{...flags(),inspectionComplete:true});
  const a = record(m.attachment);
  for (const [k,v] of Object.entries(a)) if (!fileKeys.has(k)) {extra = true; inspect(v,0);}
  meta = isMessageAttachment(a) && fileKeyNames.every(k => a[k] === e.attachment[k]);
  return observationResult(fieldsValid && meta && !extra && !payload ? "PASS" : "FAIL",{...flags(),inspectionComplete:true});
 } catch {
  return observationResult("INDETERMINATE",{targetFound:found,scopeMatched:matched,metadataConformant:meta,unexpectedProperties:extra,payloadDetected:payload});
 }
}
