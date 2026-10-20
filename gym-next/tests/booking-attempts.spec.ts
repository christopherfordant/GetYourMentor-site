import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { previousAttempt, attemptFingerprint, type AttemptInput } from "../lib/booking-attempt-server";
import { createPersistedReservation, memoryReservations, readBookingAttempt } from "../lib/repositories/reservation-repository";
import { mutateDemoState, type DemoState } from "../lib/repositories/demo-state";
import type { Reservation } from "../lib/domain";
const reservation = (): Reservation => ({ id: `res-${randomUUID()}`, coachId: `coach-${randomUUID()}`, coachName: "Coach synthétique", sport: "football", city: "Paris", service: "Test", duration: "30min", slots: [new Date(Date.now() + 86400000).toISOString()], appointmentAt: new Date(Date.now() + 86400000).toISOString(), price: 35, status: "requested", createdAt: new Date().toISOString() });
const attempt = (): AttemptInput => ({ id: randomUUID(), scope: "synthetic-scope", fingerprint: "synthetic-fingerprint" });
test.beforeEach(() => { process.env.GETYOURMENTOR_ALLOW_DEMO = "true"; process.env.DEPLOY_ENV = "local"; delete process.env.SUPABASE_URL; delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY; });
test("same attempt is atomic locally and keeps original receipt after lifecycle changes", async () => {
  const r = reservation(), a = attempt(); const before = memoryReservations.length;
  const saved = await Promise.all([createPersistedReservation(r,a),createPersistedReservation({...r,id:`res-${randomUUID()}`},a)]);
  expect(saved[0].id).toBe(saved[1].id); expect(memoryReservations.length).toBe(before+1);
  memoryReservations.find(row=>row.id===r.id)!.status="cancelled";
  expect((await readBookingAttempt(a.id,a.scope))?.status).toBe("requested");
  await expect(createPersistedReservation(r,{...a,fingerprint:"changed"})).rejects.toMatchObject({status:409});
  await expect(readBookingAttempt(a.id,"other-account")).rejects.toMatchObject({status:403});
});
test("expiry is a tombstone, scope checked before expiry; no record means no receipt", () => {
  const a=attempt(),r=reservation();const rows=[{...a,expiresAt:100,receipt:r}];
  expect(()=>previousAttempt(rows,a.id,a.scope,undefined,100)).toThrow("expiré");
  expect(()=>previousAttempt(rows,a.id,"wrong",undefined,100)).toThrow("indisponible");
  expect(previousAttempt(rows,randomUUID(),a.scope)).toBeNull();
});
test("fingerprint binds choices but ignores browser price and object property order",()=>{
  const a={coachId:"c",service:"s",duration:"30min",slots:["2031-01-01T10:00:00Z"]};
  expect(attemptFingerprint({...a,price:35})).toBe(attemptFingerprint({price:999,...a}));
  expect(attemptFingerprint({...a,service:"different"})).not.toBe(attemptFingerprint(a));
});
test("existing capacity check stays authoritative for distinct attempts",async()=>{
  const r=reservation();await createPersistedReservation(r,attempt());
  await expect(createPersistedReservation({...r,id:`res-${randomUUID()}`},attempt())).rejects.toThrow();
});
test("CAS conflict, lost committed response and pre-write storage failure",async()=>{
  let state:DemoState={reservations:[],coaches:[],users:{},clubs:[],messages:[],reviews:[]};let version=0;let lose=false;let fail=false;
  const store={getWithMetadata:async()=>({data:structuredClone(state),etag:String(version)}),setJSON:async(_key:string,value:DemoState,options?:{onlyIfMatch?:string})=>{
    if(fail)throw new Error("before-write");
    if(options?.onlyIfMatch!==String(version))return {modified:false};state=structuredClone(value);version++;
    if(lose){lose=false;throw new Error("lost-response");}return {modified:true};
  }};
  const mutate=<T>(change:(s:DemoState)=>T)=>mutateDemoState(change,store as never);
  const r=reservation(),a=attempt();
  const results=await Promise.all([createPersistedReservation(r,a,mutate),createPersistedReservation({...r,id:`res-${randomUUID()}`},a,mutate)]);
  expect(results[0].id).toBe(results[1].id);expect(state.reservations).toHaveLength(1);expect(state.bookingAttempts).toHaveLength(1);
  const b=attempt(),other=reservation();lose=true;
  await expect(createPersistedReservation(other,b,mutate)).rejects.toThrow("lost-response");
  expect(previousAttempt(state.bookingAttempts!,b.id,b.scope)?.id).toBe(other.id);
  expect((await createPersistedReservation(other,b,mutate)).id).toBe(other.id);expect(state.reservations).toHaveLength(2);
  fail=true;await expect(createPersistedReservation(reservation(),attempt(),mutate)).rejects.toThrow("before-write");expect(state.reservations).toHaveLength(2);
});
