import type { Reservation } from "@/lib/domain";
import { reservationStart, slotInstant } from "./booking-time";
const statuses: Record<Reservation["status"],string> = {
 requested:"Demande en attente de réponse", accepted:"Acceptée · paiement en attente", paid:"Payée", cancelled:"Annulée", rejected:"Refusée",
};
// Presentation only: appointmentAt on a request is not proof of acceptance.
export function reservationPlanning(row: Pick<Reservation,"status"|"slots"|"appointmentAt">) {
 const proposed=row.status==="requested";
 const label=proposed?"Créneaux proposés":row.status==="accepted" || row.status==="paid"?"Rendez-vous retenu":"Horaire enregistré dans l’historique";
 if(proposed){
  const instants=row.slots.map(slotInstant);
  const times=instants.filter((instant):instant is number=>instant!==null);
  return {status:statuses[row.status],label,times,needsCheck:times.length===0 || times.length!==instants.length || (row.appointmentAt!=null && slotInstant(row.appointmentAt)===null)};
 }
 const start=reservationStart(row);
 return {status:statuses[row.status],label,times:start===null?[]:[start],needsCheck:start===null};
}
