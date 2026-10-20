// Local private diagnostic seam: never instantiates a provider or exposes an HTTP entry point.
import { observationResult, prepareObservationExpectation, type MessageObservation } from "./message-observer.server";
import { observeSelectedMessage } from "./message-observer-reader.server";

export const OBSERVER_STORAGE_LIMITS = Object.freeze({ bytes: 1024 * 1024, messages: 1000, chunks: 1024, timeoutMs: 5000 });
// Structurally compatible with Blobs get("state", {type:"stream"}); not readDemoState(type:json).
export type PrivateStateStreamSource = { get(key: "state", options: {type:"stream"}): Promise<ReadableStream<Uint8Array> | null> };

export async function observeStoredSyntheticMessage(authorization: unknown, expected: unknown, source: PrivateStateStreamSource): Promise<MessageObservation> {
 const e = prepareObservationExpectation(expected);
 try { if (authorization !== true || !e || !source || typeof source.get !== "function") return observationResult("REFUSED"); }
 catch { return observationResult("REFUSED"); }
 let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
 let timedOut = false;
 let timer: ReturnType<typeof setTimeout> | undefined;
 const cancel = () => { if (reader) void reader.cancel().catch(() => {}); };
 const read = async (): Promise<MessageObservation> => {
  try {
   const stream = await source.get("state", {type:"stream"});
   if (timedOut) { if (stream) void stream.cancel().catch(() => {}); return observationResult("READ_FAILED"); }
   if (stream === null) return observationResult("NOT_FOUND", {inspectionComplete:true});
   reader = stream.getReader();
   let size = 0, chunks = 0;
   const parts: Uint8Array[] = [];
   while (true) {
    const item = await reader.read();
    if (timedOut) return observationResult("READ_FAILED");
    if (item.done) break;
    if (!(item.value instanceof Uint8Array) || ++chunks > OBSERVER_STORAGE_LIMITS.chunks) { cancel(); return observationResult("INDETERMINATE"); }
    size += item.value.byteLength;
    if (size > OBSERVER_STORAGE_LIMITS.bytes) { cancel(); return observationResult("INDETERMINATE"); }
    // Copy before the producer can mutate/reuse the chunk.
    parts.push(item.value.slice());
   }
   const bytes = new Uint8Array(size);let offset = 0;
   for (const p of parts) { bytes.set(p,offset);offset += p.byteLength; }
   let document: unknown;
   try { document = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)); }
   catch { return observationResult("INDETERMINATE"); }
   if (!document || typeof document !== "object" || Array.isArray(document)) return observationResult("INDETERMINATE");
   // Only JSON.parse-produced data; never inspect unrelated account properties.
   const messages: unknown = Object.hasOwn(document,"messages") ? (document as {messages:unknown}).messages : undefined;
   if (!Array.isArray(messages) || messages.length > OBSERVER_STORAGE_LIMITS.messages) return observationResult("INDETERMINATE");
   let selected: unknown;let matches = 0;
   for (const m of messages) {
    if (!m || typeof m !== "object" || Array.isArray(m) || !Object.hasOwn(m,"id") || typeof m.id !== "string") return observationResult("INDETERMINATE");
    if (m.id === e.messageId) { selected = m;matches++; }
   }
   // Duplicate ID is ambiguous even if only one entry has the expected owner.
   if (matches > 1) return observationResult("INDETERMINATE",{targetFound:true});
   return await observeSelectedMessage(true,e,async () => selected);
  } catch { return observationResult("READ_FAILED"); }
  finally { if (reader) { try { reader.releaseLock(); } catch { /* pending read after timeout */ } } }
 };
 try {
  return await Promise.race([read(),new Promise<MessageObservation>(resolve => {timer=setTimeout(()=>{timedOut=true;cancel();resolve(observationResult("READ_FAILED"));},OBSERVER_STORAGE_LIMITS.timeoutMs);})]);
 } finally { if (timer) clearTimeout(timer); }
}
