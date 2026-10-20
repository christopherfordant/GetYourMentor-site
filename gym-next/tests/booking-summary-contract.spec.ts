import { test,expect } from "@playwright/test";
import { summaryAccess,summaryProofWindow,summaryFields } from "../lib/booking-summary-server";
import { readBookingSummary } from "../lib/booking-summary";
import type { Reservation } from "../lib/domain";
const r:Reservation={id:"res-synthetic",coachId:"coach-synthetic",coachName:"Coach synthétique",sport:"fitness",city:"Paris",service:"Séance",duration:"30min",slots:["2031-01-01T10:00:00.000Z"],appointmentAt:"2031-01-01T10:00:00.000Z",price:35,status:"requested",createdAt:"2030-01-01T00:00:00.000Z"};
test("projection excludes private fields and preserves actual status and historical price",()=>{
  const dto=summaryFields({...r,status:"cancelled",ownerEmail:"test@example.com",stripePaymentIntentId:"synthetic-private",price:42},true);
  expect(dto.status).toBe("cancelled");expect(dto.price).toBe(42);expect(dto).not.toHaveProperty("ownerEmail");expect(dto).not.toHaveProperty("stripePaymentIntentId");expect(dto).not.toHaveProperty("createdAt");expect(dto).not.toHaveProperty("financials");
});
test("proof window includes start, excludes 24h and invalid/future dates",()=>{
  const now=Date.parse(r.createdAt);expect(summaryProofWindow(r,now)).toBe(true);expect(summaryProofWindow(r,now+86400000-1)).toBe(true);expect(summaryProofWindow(r,now+86400000)).toBe(false);expect(summaryProofWindow(r,now-1)).toBe(false);expect(summaryProofWindow({createdAt:"invalid"},now)).toBe(false);
});
test("owner identity overrides proof; roles and unowned records remain scoped",()=>{
  const owner={email:"test@example.com",role:"sportif" as const};expect(summaryAccess(owner,{...r,ownerEmail:owner.email},false)).toBe(true);
  expect(summaryAccess({...owner,email:"other@example.com"},{...r,ownerEmail:owner.email},true)).toBe(false);expect(summaryAccess(null,{...r,ownerEmail:owner.email},true)).toBe(false);
  expect(summaryAccess(null,r,true)).toBe(true);expect(summaryAccess(null,r,false)).toBe(false);for(const role of ["admin","coach","club"] as const)expect(summaryAccess({...owner,role},r,true)).toBe(false);
});
for(const patch of [{id:"res-other"},{sport:"padel"},{price:-1},{price:NaN},{slots:[]},{slots:["10:00"]},{appointmentAt:"2031-01-01T11:00:00Z"},{duration:"invalid"},{participantCount:0},{participantCount:51},{status:"unknown"},{authenticated:"yes"},{claimToken:"invalid"}])test(`reject malformed summary ${Object.keys(patch)[0]} ${JSON.stringify(patch)}`,()=>{
 expect(()=>readBookingSummary({...summaryFields(r,false),...patch},r.id)).toThrow();
});
