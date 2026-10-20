export const MAX_MESSAGE_FILE_BYTES = 64 * 1024;
export const MAX_MESSAGE_REQUEST_BYTES = 112 * 1024;
export type MessageAttachment = { id: string; name: string; size: number; type: "text/plain"; sha256: string };
export type AttachmentInput = { name: string; type: "text/plain"; base64: string };
export function isMessageAttachment(value: unknown): value is MessageAttachment {
  if (!value || typeof value !== "object") return false;
  const a = value as MessageAttachment;
  return typeof a.id === "string" && /^attachment-[a-f0-9-]{36}$/.test(a.id)
    && typeof a.name === "string" && a.name.length > 0 && a.name.length <= 120
    && !/[\/\\\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(a.name)
    && a.name.toLowerCase().endsWith(".txt") && a.type === "text/plain"
    && Number.isInteger(a.size) && a.size > 0 && a.size <= MAX_MESSAGE_FILE_BYTES
    && typeof a.sha256 === "string" && /^[a-f0-9]{64}$/.test(a.sha256);
}
