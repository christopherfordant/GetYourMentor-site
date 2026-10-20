import { durationMinutes, slotInstant } from "./domain/booking-time";
const statuses=new Set(["requested","accepted","paid","cancelled","rejected"]);
export function bookingAvailability(payload:unknown):Array<{status:string;slots:string[];duration:string}>{
 if(!payload||typeof payload!=="object"||!("data" in payload)||!Array.isArray(payload.data)||payload.data.length>1000)throw new Error("Invalid availability");
 return payload.data.map((r:unknown)=>{if(!r||typeof r!=="object"||!("status" in r)||typeof r.status!=="string"||!statuses.has(r.status)||!("slots" in r)||!Array.isArray(r.slots)||r.slots.length<1||r.slots.length>3||r.slots.some(s=>typeof s!=="string"||slotInstant(s)===null))throw new Error("Invalid availability");const duration="duration" in r?r.duration:"1 heure";if(typeof duration!=="string"||!durationMinutes(duration))throw new Error("Invalid duration");return {status:r.status,slots:r.slots as string[],duration};});
}
export type BookingExpectation={coachId:string;coachName:string;sport:string;city:string;service:string;duration:string;slot:string};
export function bookingConfirmation(d:Record<string,unknown>,e:BookingExpectation){
 if(typeof d.id!=="string"||!/^res-[a-zA-Z0-9-]{1,128}$/.test(d.id)||d.status!=="requested"||d.coachId!==e.coachId||d.coachName!==e.coachName||d.sport!==e.sport||d.city!==e.city||d.service!==e.service||d.duration!==e.duration||typeof d.price!=="number"||!Number.isFinite(d.price)||d.price<0||!Array.isArray(d.slots)||d.slots.length!==1||typeof d.slots[0]!=="string"||slotInstant(d.slots[0])!==slotInstant(e.slot)||slotInstant(e.slot)===null||("appointmentAt" in d&&slotInstant(d.appointmentAt as string)!==slotInstant(e.slot)))throw new Error("Unconfirmed booking");
 if(d.ownerEmail!==undefined&&(typeof d.ownerEmail!=="string"||!d.ownerEmail.includes("@")))throw new Error("Unconfirmed owner");
 if(d.claimToken!==undefined&&(typeof d.claimToken!=="string"||!d.claimToken||d.claimToken.length>512))throw new Error("Unconfirmed claim");
 if(!d.ownerEmail&&!d.claimToken)throw new Error("Missing private claim");
 return {id:d.id,claimToken:d.claimToken as string|undefined,price:d.price};
}
