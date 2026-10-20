"use client";
import { useState } from "react";
import type { MessageAttachment } from "@/lib/message-attachment-contract";
export function MessageFileDownload({ messageId, file }: { messageId: string; file: MessageAttachment }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function download() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/attachment`, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("text/plain")) throw new Error();
      const bytes = await response.arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(n => n.toString(16).padStart(2, "0")).join("");
      if (bytes.byteLength !== file.size || digest !== file.sha256) throw new Error();
      const url = URL.createObjectURL(new Blob([bytes], { type: "text/plain;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setError("Fichier indisponible. Réessayez ultérieurement."); }
    finally { setBusy(false); }
  }
  return <div data-message-file style={{ overflowWrap: "anywhere", minWidth: 0 }}>
    <p>{file.name} · {file.size} octets</p>
    <button type="button" className="auth-secondary" disabled={busy} onClick={download}>{busy ? "Chargement du fichier…" : "Télécharger la pièce jointe"}</button>
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}
