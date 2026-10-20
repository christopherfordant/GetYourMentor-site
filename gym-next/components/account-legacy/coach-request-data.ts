import type {Reservation} from "@/lib/domain";
import {slotInstant} from "@/lib/domain/booking-time";
const object=(v:unknown):v is Record<string,unknown>=>!!v && typeof v==="object" && !Array.isArray(v);
const financialShape=(value:unknown)=>value==null || (object(value)&&value.currency==="eur"&&[value.grossCents,value.platformFeeCents,value.coachAmountCents,value.commissionBps,value.commissionVersion].every(n=>typeof n==="number"&&Number.isSafeInteger(n)&&n>=0));
export function isCoachReservation(v:unknown):v is Reservation {
 return object(v) && (v.reservationCode==null || typeof v.reservationCode==="string") && (v.ownerEmail==null || typeof v.ownerEmail==="string") && financialShape(v.financials) && [v.id,v.coachId,v.coachName,v.service,v.duration,v.city,v.createdAt].every(x=>typeof x==="string" && x.length>0) && ["football","basketball","fitness","sports-de-combat"].includes(String(v.sport)) && ["requested","accepted","paid","cancelled","rejected"].includes(String(v.status)) && typeof v.price==="number" && Number.isFinite(v.price) && v.price>=0 && Array.isArray(v.slots) && v.slots.every(x=>typeof x==="string") && (v.appointmentAt==null || typeof v.appointmentAt==="string") && (v.participantCount===undefined || (Number.isSafeInteger(v.participantCount)&&Number(v.participantCount)>0)) && (v.additionalParticipants===undefined || (Array.isArray(v.additionalParticipants)&&v.additionalParticipants.every(p=>object(p)&&typeof p.firstName==="string"&&typeof p.lastName==="string"&&typeof p.age==="number")));
}
export function readCoachReservations(payload:unknown,coachId:string):Reservation[] {
 if(!object(payload)||!Array.isArray(payload.data)||!payload.data.every(isCoachReservation))throw new Error("Réponse des demandes invalide");
 const own=payload.data.filter(row=>row.coachId===coachId);if(new Set(own.map(row=>row.id)).size!==own.length)throw new Error("Demandes dupliquées");return own;
}
const canonical=(value:unknown):string=>JSON.stringify(value===undefined?null:value,(_key,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function confirmedCoachTransition(payload:unknown,original:Reservation,status:"accepted"|"rejected",chosen?:string):Reservation|null {
 if(!object(payload)||!isCoachReservation(payload.data))return null;const row=payload.data;
 for(const key of ["id","coachId","coachName","ownerEmail","sport","service","duration","city","price","createdAt","participantCount","additionalParticipants","financials"] as const)if(canonical(row[key])!==canonical(original[key]))return null;
 if(row.status!==status)return null;
 if(status==="accepted"){
  const instant=chosen?slotInstant(chosen):null;
  if(instant===null || !original.slots.includes(chosen!) || typeof row.acceptedAt!=="string" || slotInstant(row.acceptedAt)===null || row.slots.length!==1 || slotInstant(row.slots[0])!==instant || !row.appointmentAt || slotInstant(row.appointmentAt)!==instant)return null;
 }else if(canonical(row.slots)!==canonical(original.slots)||canonical(row.appointmentAt)!==canonical(original.appointmentAt))return null;
 return row;
}
