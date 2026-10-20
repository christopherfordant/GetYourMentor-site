import type { Reservation } from "@/lib/domain";
import { eurosToCents, refundedCommissionCents } from "./commission";
import { BOOKING_TIME_ZONE, slotInstant } from "./booking-time";
export const coachMonthKey=(instant=Date.now())=>new Intl.DateTimeFormat("en-CA",{timeZone:BOOKING_TIME_ZONE,year:"numeric",month:"2-digit"}).format(new Date(instant));
const cents=(n:unknown):n is number=>typeof n==="number" && Number.isSafeInteger(n) && n>=0;
// Structural/chronological check of trusted server data, not a signature or bank receipt.
export function hasCoherentDemoPayment(row:Reservation,now=Date.now()) {
 const proof:unknown=row.demoPaymentConfirmation;
 if(!proof || typeof proof!=="object" || Array.isArray(proof))return false;
 const value=proof as Record<string,unknown>;
 if(value.mode!=="simulated" || typeof value.reference!=="string" || !/^demo-pay-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.reference) || typeof value.confirmedAt!=="string")return false;
 const confirmed=slotInstant(value.confirmedAt),created=slotInstant(row.createdAt);
 if(confirmed===null || created===null || new Date(confirmed).toISOString()!==value.confirmedAt || confirmed<created || confirmed>now)return false;
 if(row.acceptedAt!=null){const accepted=slotInstant(row.acceptedAt);if(accepted===null || accepted<created || confirmed<accepted)return false;}
 if(row.status==="cancelled") {const cancelled=slotInstant(row.cancelledAt ?? "");if(cancelled===null || cancelled<confirmed || cancelled>now)return false;}
 return true;
}
export function isCoachMonth(value:unknown):value is string {
 return typeof value==="string" && /^[2-9][0-9]{3}-(?:0[1-9]|1[0-2])$/.test(value);
}
export function coachMonthlyFinance(rows:Reservation[],coachId:string,now=Date.now(),selectedPeriod?:unknown) {
 const invalidPeriod=selectedPeriod!==undefined && !isCoachMonth(selectedPeriod);
 const period=isCoachMonth(selectedPeriod)?selectedPeriod:coachMonthKey(now);
 const [year,month]=period.split("-").map(Number);
 const label=new Intl.DateTimeFormat("fr-FR",{timeZone:BOOKING_TIME_ZONE,month:"long",year:"numeric"}).format(new Date(Date.UTC(year,month-1,15,12)));

 let documented=0,missing=0,ambiguousCancelled=0,undated=0,pendingRefunds=0;
 const totals={grossCents:0,refundCents:0,feeCents:0,coachCents:0};const seen=new Set<string>();
 for(const row of rows){
  if(row.coachId!==coachId || seen.has(row.id))continue;seen.add(row.id);
  if(row.status!=="paid" && row.status!=="cancelled")continue;
  const instant=slotInstant(row.createdAt);if(instant===null){undated++;continue;}if(coachMonthKey(instant)!==period)continue;
  if(row.status==="cancelled" && !hasCoherentDemoPayment(row,now) && !row.stripePaymentIntentId && !((row.refundStatus==="succeeded" || row.refundStatus==="pending") && typeof row.refundAmount==="number" && row.refundAmount>0)){ambiguousCancelled++;continue;}
  const s=row.financials;
  if(!s || s.currency!=="eur" || ![s.grossCents,s.platformFeeCents,s.coachAmountCents].every(cents) || !Number.isSafeInteger(s.commissionBps) || s.commissionBps<0 || s.commissionBps>10000 || !Number.isSafeInteger(s.commissionVersion) || s.commissionVersion<1 || s.platformFeeCents+s.coachAmountCents!==s.grossCents){missing++;continue;}
  let refund=0,feeRefund=0;
  if(row.status==="cancelled"){
   if(typeof row.refundAmount!=="number" || !Number.isFinite(row.refundAmount) || row.refundAmount<0 || Math.abs(row.refundAmount*100-Math.round(row.refundAmount*100))>0.00001 || !["succeeded","pending","not_required"].includes(row.refundStatus ?? "")){missing++;continue;}
   let amount:number;try{amount=eurosToCents(row.refundAmount);}catch{missing++;continue;}
   if(amount>s.grossCents || (row.refundStatus==="not_required" && amount!==0)){missing++;continue;}
   if(row.refundStatus==="pending")pendingRefunds++;
   if(row.refundStatus==="succeeded"){
    refund=amount;feeRefund=row.refundedPlatformFeeCents ?? refundedCommissionCents(s,refund);
    if(!cents(feeRefund) || feeRefund>s.platformFeeCents || feeRefund>refund || refund-feeRefund>s.coachAmountCents){missing++;continue;}
   }
  }
  const next={grossCents:s.grossCents,refundCents:refund,feeCents:s.platformFeeCents-feeRefund,coachCents:s.coachAmountCents-(refund-feeRefund)};
  if(Object.keys(totals).some(k=>!Number.isSafeInteger(totals[k as keyof typeof totals]+next[k as keyof typeof next]))){missing++;continue;}
  for(const k of Object.keys(totals) as (keyof typeof totals)[])totals[k]+=next[k];documented++;
 }
 return {period,label,invalidPeriod,timeZone:BOOKING_TIME_ZONE,documented,missing,ambiguousCancelled,undated,pendingRefunds,totals:documented===0 && (missing+ambiguousCancelled+undated)>0?null:totals};
}
export const formatFinanceCents=(value:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(value/100);
