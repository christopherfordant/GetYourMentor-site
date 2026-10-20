import type {Reservation} from "@/lib/domain";
import {sameDemoBooking} from "@/components/payment-legacy/demo-payment-data";
import {BOOKING_TIME_ZONE,slotInstant,normalizeSlots} from "@/lib/domain/booking-time";
const formatter=new Intl.DateTimeFormat("en-CA",{timeZone:BOOKING_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
function parts(time:number){return Object.fromEntries(formatter.formatToParts(time).map(p=>[p.type,p.value]));}
function wall(time:number){const p=parts(time);return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;}
export function parisInputSlot(value:string,now=Date.now()):string|null {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))return null;
 const anchor=slotInstant(`${value}:00Z`);if(anchor===null)return null;
 const candidates=new Set<number>();
 for(const shift of [-36,0,36]){const sample=anchor+shift*3600000,p=parts(sample),local=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));const candidate=anchor-(local-sample);if(wall(candidate)===value)candidates.add(candidate);}
 if(candidates.size!==1)return null;const time=[...candidates][0];return normalizeSlots([new Date(time).toISOString()],now)?.[0]??null;
}
export function sameRescheduleBooking(a:Reservation,b:Reservation){return sameDemoBooking(a,{...b,slots:a.slots,appointmentAt:a.appointmentAt}) && a.structureOfferId===b.structureOfferId;}
export function validReadSlots(row:Reservation){return row.slots.length>0 && row.slots.every(s=>slotInstant(s)!==null) && (!row.appointmentAt || row.slots.some(s=>slotInstant(s)===slotInstant(row.appointmentAt??"")));}
export function confirmedReschedule(original:Reservation,row:Reservation,target:string){
 if(!sameRescheduleBooking(original,row)||!validReadSlots(row)||row.slots.length!==1||slotInstant(row.slots[0])!==slotInstant(target)||slotInstant(row.appointmentAt??"")!==slotInstant(target))return false;
 return (["status","acceptedAt","reservationCode","cancelledAt","refundPercent","refundAmount","refundStatus","refundedPlatformFeeCents"] as const).every(k=>(original[k]??null)===(row[k]??null));
}
