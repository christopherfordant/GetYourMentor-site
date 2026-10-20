import type {Reservation} from "@/lib/domain";
import {isCoachReservation} from "@/components/account-legacy/coach-request-data";
import {hasCoherentDemoPayment} from "@/lib/domain/coach-finance";
import {validateReservationSlots} from "@/lib/domain/booking-rules";
export function readDemoPayment(payload:unknown,id:string,email:string):Reservation {
 if(!payload||typeof payload!=="object"||!("data" in payload)||!isCoachReservation(payload.data))throw new Error("Réservation inexploitable");
 const row=payload.data;if(row.id!==id || (row.ownerEmail && row.ownerEmail!==email))throw new Error("Identité de réservation incohérente");return row;
}
export function sameDemoBooking(a:Reservation,b:Reservation){
 const keys=["id","coachId","sport","city","service","duration","price","createdAt","participantCount","appointmentAt"] as const;
 if(keys.some(key=>a[key]!==b[key])||JSON.stringify(a.slots)!==JSON.stringify(b.slots)||JSON.stringify(a.additionalParticipants)!==JSON.stringify(b.additionalParticipants))return false;
 for(const key of ["currency","grossCents","platformFeeCents","coachAmountCents","commissionBps","commissionVersion"] as const)if(a.financials?.[key]!==b.financials?.[key])return false;
 if(a.demoPaymentConfirmation && ["mode","confirmedAt","reference"].some(key=>a.demoPaymentConfirmation?.[key as keyof NonNullable<Reservation["demoPaymentConfirmation"]>]!==b.demoPaymentConfirmation?.[key as keyof NonNullable<Reservation["demoPaymentConfirmation"]>]))return false;
 return true;
}
export function demoPaymentState(row:Reservation,expected:boolean){
 if(row.status==="paid"){
  if(hasCoherentDemoPayment(row))return {success:true,ready:false,legacy:false,error:false,message:"Paiement simulé confirmé. Aucun débit réel."};
  if(!row.demoPaymentConfirmation && !expected)return {success:false,ready:false,legacy:true,error:false,message:"Statut payé enregistré, sans confirmation simulée disponible. Aucun nouvel envoi."};
  return {success:false,ready:false,legacy:false,error:true,message:"Confirmation simulée manquante ou incohérente. Le résultat reste non confirmé. Aucun nouvel envoi."};
 }
 if(row.status==="accepted"&&!row.demoPaymentConfirmation&&validateReservationSlots(row.slots).valid)return {success:false,ready:true,legacy:false,error:false,message:"Demande acceptée : paiement simulé disponible. Aucun débit réel."};
 const message=row.status==="requested"?"En attente de validation par le coach.":row.status==="cancelled"?"Réservation annulée : aucun paiement possible.":row.status==="rejected"?"Demande refusée : aucun paiement possible.":"Réservation non payable ou incohérente. Vérifie son état avant de poursuivre.";
 return {success:false,ready:false,legacy:false,error:row.status==="accepted",message};
}
