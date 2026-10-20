import type { Reservation } from "@/lib/domain";
import { formatBookingSlot } from "@/lib/domain/booking-time";
import { reservationPlanning } from "@/lib/domain/reservation-planning";

export function CoachPlanningSchedule({reservations,coachId,loading,error}:{reservations:Reservation[];coachId?:string;loading:boolean;error:boolean}) {
 if(loading)return <p role="status">Chargement du planning…</p>;
 if(error)return <p role="alert">Planning indisponible. Recharge la page pour réessayer.</p>;
 if(!coachId)return <p>Profil coach non identifié : planning indisponible.</p>;
 const own=reservations.filter(row=>row.coachId===coachId);
 if(!own.length)return <p data-coach-schedule-empty>Aucune séance enregistrée.</p>;
 return <>{own.map(row=>{
  const display=reservationPlanning(row);
  return <article key={row.id} data-coach-planning-reservation={row.id}>
   <strong>{row.service}</strong><span>{display.status}</span>
   <span>{display.label} · Europe/Paris</span>
   {display.times.map((instant,index)=><time key={index} dateTime={new Date(instant).toISOString()}>{formatBookingSlot(new Date(instant).toISOString())}</time>)}
   {display.needsCheck?<span>Horaire à vérifier</span>:null}
  </article>;
 })}</>;
}
