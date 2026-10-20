import type { Reservation } from "@/lib/domain";
import { canReviewReservation } from "./review-rules";
import { durationMinutes, slotInstant } from "./booking-time";
export function personalSessionSummary(reservations:Reservation[],now=Date.now()) {
 const counts={elapsedPaid:0,upcomingOrOngoingPaid:0,paidUnknownSchedule:0,acceptedUnpaid:0,requested:0,cancelled:0};
 const seen=new Set<string>();
 for(const row of reservations){
  if(seen.has(row.id))continue;seen.add(row.id);
  if(row.status==="paid"){
   if(canReviewReservation(row,now))counts.elapsedPaid++;
   else if(slotInstant(row.appointmentAt ?? (row.slots.length===1?row.slots[0]:""))!==null && durationMinutes(row.duration)!==null)counts.upcomingOrOngoingPaid++;
   else counts.paidUnknownSchedule++;
  }else if(row.status==="accepted")counts.acceptedUnpaid++;
  else if(row.status==="requested")counts.requested++;
  else if(row.status==="cancelled")counts.cancelled++;
 }
 return counts;
}
