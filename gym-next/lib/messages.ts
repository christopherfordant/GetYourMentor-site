import type { MessageAttachment } from "./message-attachment-contract";
import { getMessageFile, putMessageFile, deleteUnusedMessageFile, type MessageFileStorage } from "./message-attachment-server";
export type Message = {
  id: string;
  senderEmail: string;
  recipientName: string;
  reservationId?: string;
  body: string;
  createdAt: string;
  coachId?: string;
  authorRole?: "sportif" | "coach" | "club";
  ownerRole?: "sportif" | "club";
  replyToId?: string;
  requestId?: string;
  attachment?: MessageAttachment;
};

import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState, type DemoState } from "@/lib/repositories/demo-state";

const processState = globalThis as typeof globalThis & { gymDemoMessages?: Message[] };
const memoryMessages: Message[] = processState.gymDemoMessages ??= [];

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  assertDemoFallbackAllowed("Supabase Messages");
  return null;
}

export class MessageConflictError extends Error {
  constructor() { super("Cette demande a déjà été utilisée pour un autre message"); }
}

export type MessageDemoDependencies = {
  read: () => Promise<DemoState>;
  mutate: <T>(change: (state: DemoState) => T) => Promise<T>;
  files: MessageFileStorage;
};
export async function createMessage(message: Message, file?: { meta: MessageAttachment; bytes: Uint8Array }, dependencies?: MessageDemoDependencies) {
  const config = dependencies ? null : supabaseConfig();
  const hosted = dependencies !== undefined || isHostedDemo();
  const read = dependencies?.read ?? readDemoState;
  const mutate = dependencies?.mutate ?? mutateDemoState;
  if (file && config) throw new Error("Fichier réservé à la démonstration isolée");
  if (!config) {
    if (file) message = { ...message, attachment: file.meta };
    const previousFor = (messages: Message[]) => message.requestId ? messages.find(row => row.requestId === message.requestId && row.senderEmail === message.senderEmail && row.coachId === message.coachId && row.authorRole === message.authorRole && (row.ownerRole ?? "sportif") === (message.ownerRole ?? "sportif")) : undefined;
    const validateRepeat = (previous: Message) => {
      const fingerprint = (a?: MessageAttachment) => a ? JSON.stringify([a.name, a.size, a.type, a.sha256]) : "";
      if (previous.body !== message.body || previous.replyToId !== message.replyToId || previous.reservationId !== message.reservationId || fingerprint(previous.attachment) !== fingerprint(message.attachment)) throw new MessageConflictError();
    };
    const save = (messages: Message[]) => {
      const previous = previousFor(messages);
      if (previous) { validateRepeat(previous); return previous; }
      messages.push(message); return message;
    };
    if (file) {
      const previous = previousFor(hosted ? (await read()).messages : await listMessages());
      if (previous) { validateRepeat(previous); if (previous.attachment) await getMessageFile(previous.attachment, dependencies?.files); return previous; }
      await putMessageFile(file.meta, file.bytes, dependencies?.files);
    }
    try {
      const saved = hosted ? await mutate(state => {
        const saved = save(state.messages);
        if (file && saved.attachment?.id === file.meta.id) state.pendingMessageFiles = state.pendingMessageFiles?.filter(item => item.id !== file.meta.id);
        return saved;
      }) : save(memoryMessages);
      if (file && saved.attachment?.id !== file.meta.id) await deleteUnusedMessageFile(file.meta.id, dependencies?.files);
      if (saved.attachment) await getMessageFile(saved.attachment, dependencies?.files);
      return saved;
    } catch (error) {
      // A CAS/network failure may follow a committed message: never delete its file.
      // Only a known pre-commit conflict permits compensating this unique new object.
      if (file && error instanceof MessageConflictError) await deleteUnusedMessageFile(file.meta.id, dependencies?.files);
      throw error;
    }
  }

  const response = await fetch(`${config.url}/rest/v1/gym_messages`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: message.id,
      sender_email: message.senderEmail,
      recipient_name: message.recipientName,
      reservation_id: message.reservationId ?? null,
      body: message.body,
      created_at: message.createdAt,
    }),
  });
  if (!response.ok) throw new Error(`Supabase message error (${response.status})`);
  const [saved] = await response.json();
  return { ...message, id: saved.id ?? message.id, createdAt: saved.created_at ?? message.createdAt };
}

export async function listMessages(options: { senderEmail?: string; recipientName?: string } = {}) {
  const config = supabaseConfig();
  if (!config) {
    return (isHostedDemo() ? (await readDemoState()).messages : memoryMessages).filter((message) =>
      (!options.senderEmail || message.senderEmail === options.senderEmail) &&
      (!options.recipientName || message.recipientName.toLowerCase() === options.recipientName.toLowerCase()),
    );
  }

  const senderFilter = options.senderEmail ? `&sender_email=eq.${encodeURIComponent(options.senderEmail)}` : "";
  const recipientFilter = options.recipientName ? `&recipient_name=eq.${encodeURIComponent(options.recipientName)}` : "";
  const response = await fetch(`${config.url}/rest/v1/gym_messages?select=*&order=created_at.desc${senderFilter}${recipientFilter}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase message error (${response.status})`);
  return (await response.json()).map((row: Record<string, unknown>) => ({
    id: row.id,
    senderEmail: row.sender_email,
    recipientName: row.recipient_name,
    reservationId: row.reservation_id,
    body: row.body,
    createdAt: row.created_at,
  })) as Message[];
}
