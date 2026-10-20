import {randomBytes} from "node:crypto";
import {privateReservationTokenValid} from "../lib/private-reservation-proof";
import {reservationClaimToken} from "../lib/reservation-claims";
import type {Reservation} from "../lib/domain";
import {test,expect,type APIRequestContext} from "@playwright/test";import {randomUUID} from "node:crypto";
const credentials=()=>({email:`claim-${randomUUID()}@example.com`,password:`Synthetic-${randomUUID()}`});
async function signup(request:APIRequestContext,c=credentials()){expect((await request.post("/api/auth/sign-up",{data:{...c,role:"sportif",firstName:"Test",lastName:"Synthétique",phone:"0600000000",termsAccepted:true}})).status()).toBe(201);return c;}
async function create(request:APIRequestContext){const rows=(await(await request.get("/api/reservations?coachId=coach-demo-01")).json()).data as Array<{slots:string[]}>;const slot=new Date(Math.max(Date.now()+40*86400000,...rows.flatMap(r=>r.slots.map(Date.parse)))+86400000).toISOString();const response=await request.post("/api/reservations",{data:{coachId:"coach-demo-01",service:"Suivi synthétique",duration:"30min",slots:[slot]}});expect(response.status()).toBe(201);return (await response.json()).data;}
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem("gym-cookie-consent-v1","refused"));});
for(const mode of ["login","signup"])test(`legacy proof -> ${mode} -> private cookie follow-up without payment`,async({page},info)=>{
 const c=credentials();if(mode==="login"){await signup(page.request,c);await page.request.post("/api/auth/sign-out");}const r=await create(page.request);let payments=0;const leaks:string[]=[];
 page.on("request",request=>{if(request.method()==="POST"&&/\/payment$/.test(new URL(request.url()).pathname))payments++;if(new URL(request.url()).searchParams.has("claimToken")&&!request.isNavigationRequest())leaks.push("query");});
 await page.goto(`/compte?redirect=paiement&reservationId=${r.id}&claimToken=${encodeURIComponent(r.claimToken)}`);
 await expect(page.locator("#account-email")).toBeVisible();expect(new URL(page.url()).searchParams.has("claimToken")).toBe(false);
 if(mode==="login"){await page.locator("#account-email").fill(c.email);await page.locator("#account-password").fill(c.password);await page.locator("[data-account-form] button[type=submit]").click();}
 else {await page.locator("[data-account-signup]").click();const f=page.locator("[data-account-create-form]");for(const [name,value] of Object.entries({...c,emailConfirmation:c.email,passwordConfirmation:c.password,firstName:"Test",lastName:"Synthétique",phone:"0600000000"}))await f.locator(`[name="${name}"]`).fill(value);await f.locator('[name="termsAccepted"]').check();await f.locator('button[type=submit]').click();await page.locator('[data-account-role="sportif"]').click();}
 await page.waitForURL(/\/paiement\?/);expect(new URL(page.url()).searchParams.has("claimToken")).toBe(false);
 await expect.poll(async()=> (await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(200);
 await page.reload();expect((await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(200);expect(payments).toBe(0);expect(leaks).toHaveLength(0);
 const response=await page.request.post("/api/reservations/summary",{data:{reservationId:r.id}});expect((await response.json()).data).not.toHaveProperty("claimToken");
 const stored=await page.context().cookies();expect(stored.find(c=>c.name===`gym-claim-${r.id}`)?.httpOnly).toBe(true);
 // Existing explicit cancellation binds an unpaid request, no payment/refund operation.
 expect((await page.request.post(`/api/reservations/${r.id}/cancel`)).status()).toBe(200);
 expect((await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(200);
 await page.request.post("/api/auth/sign-out");expect((await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(401);await signup(page.request);expect((await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(403);
});
test("legacy summary refresh and outgoing links contain no token",async({page})=>{
 const r=await create(page.request);await page.goto(`/recapitulatif?reservationId=${r.id}&claimToken=${encodeURIComponent(r.claimToken)}`);await expect(page.locator("[data-recap-login]")).toBeVisible();
 for(const element of await page.locator("#gym-booking a[href]").all())expect((await element.getAttribute("href"))!).not.toContain("claimToken");await page.reload();await expect(page.locator("[data-recap-login]")).toBeVisible();
});
test("missing browser cookie, wrong old proof and expired cookie refuse access",async({page})=>{
 const r=await create(page.request);await signup(page.request);expect((await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(403);
 await page.goto(`/compte?reservationId=${r.id}&claimToken=invalid`);await expect(page.locator("section > p[role=alert]").filter({hasText:"preuve"})).toContainText("preuve");expect(new URL(page.url()).searchParams.has("claimToken")).toBe(false);
 await page.context().addCookies([{name:`gym-claim-${r.id}`,value:r.claimToken,domain:"127.0.0.1",path:"/api/reservations",expires:Math.floor(Date.now()/1000)-1}]);expect((await page.request.get(`/api/reservations/${r.id}`)).status()).toBe(403);
});

test("cookie authorizes the existing endpoint but cannot pay before acceptance",async({request})=>{
 const r=await create(request);expect((await request.post("/api/reservations/summary",{data:{reservationId:r.id,claimToken:r.claimToken}})).ok()).toBe(true);await signup(request);
 expect((await request.post(`/api/reservations/${r.id}/payment`)).status()).toBe(409);
 const current=(await(await request.get(`/api/reservations/${r.id}`)).json()).data;expect(current.status).toBe("requested");expect(current.ownerEmail).toBeUndefined();expect(current.demoPaymentConfirmation).toBeUndefined();
});

test("private cookie validity bounds lifetime and rejects secret rotation and attached owner",()=>{
 const previous=process.env.SESSION_SECRET;
 try {
  process.env.SESSION_SECRET=randomBytes(32).toString("hex");
  const r={id:"res-synthetic",createdAt:new Date().toISOString()} as Reservation;const token=reservationClaimToken(r.id)!;
  expect(privateReservationTokenValid(r,token)).toBe(true);expect(privateReservationTokenValid(r,"invalid")).toBe(false);
  expect(privateReservationTokenValid({...r,createdAt:new Date(Date.now()-86400000).toISOString()},token)).toBe(false);
  expect(privateReservationTokenValid({...r,ownerEmail:"owner@example.com"},token)).toBe(false);
  process.env.SESSION_SECRET=randomBytes(32).toString("hex");expect(privateReservationTokenValid(r,token)).toBe(false);
  delete process.env.SESSION_SECRET;expect(privateReservationTokenValid(r,token)).toBe(false);
 }finally{if(previous===undefined)delete process.env.SESSION_SECRET;else process.env.SESSION_SECRET=previous;}
});
