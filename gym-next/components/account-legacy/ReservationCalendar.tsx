"use client";
import { useEffect, useRef, useState } from "react";
import type { Reservation } from "@/lib/domain";
import { durationMinutes, reservationStart } from "@/lib/domain/booking-time";

export function ReservationCalendar({ reservation, disabled = false }: { reservation: Reservation; disabled?: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(false);
  const life = useRef<{ active: boolean; controller: AbortController | null }>({ active: false, controller: null });
  useEffect(() => { const state = life.current; state.active = true; return () => { state.active = false; state.controller?.abort(); }; }, []);
  if (!["accepted", "paid"].includes(reservation.status) || reservationStart(reservation) === null || durationMinutes(reservation.duration) === null) return null;
  async function download() {
    const state = life.current; if (!state.active || state.controller || disabled) return;
    const controller = new AbortController(); state.controller = controller; setBusy(true); setError(false); setMessage("");
    try {
      const response = await fetch(`/api/reservations/${encodeURIComponent(reservation.id)}/calendar`, { cache: "no-store", signal: controller.signal });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("text/calendar")) throw new Error();
      const text = await response.text();
      if (text.length > 8192 || !text.startsWith("BEGIN:VCALENDAR\r\n") || !text.endsWith("END:VCALENDAR\r\n")) throw new Error();
      if (!state.active || controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([text], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = "getyourmentor-seance-demo.ics"; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Fichier calendrier préparé. Importez-le manuellement dans votre agenda ; aucune synchronisation automatique.");
    } catch { if (state.active && !controller.signal.aborted) { setError(true); setMessage("Téléchargement non confirmé. Vérifiez la séance puis réessayez ; aucun événement n’a été ajouté automatiquement."); } }
    finally { state.controller = null; if (state.active) setBusy(false); }
  }
  return <div data-reservation-calendar>
    <button className="auth-secondary" type="button" disabled={disabled || busy} onClick={() => void download()}>{busy ? "Préparation du calendrier…" : "Télécharger pour mon agenda (.ics)"}</button>
    <p>Copie de démonstration à importer manuellement. Après un déplacement ou une annulation, mettez aussi votre agenda à jour. Aucun contact ni code d’accès inclus.</p>
    {message ? <p role={error ? "alert" : "status"}>{message}</p> : null}
  </div>;
}
