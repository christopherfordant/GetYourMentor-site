import { test,expect,type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
async function signup(request:APIRequestContext){expect((await request.post("/api/auth/sign-up",{data:{email:`summary-${randomUUID()}@example.com`,password:`Synthetic-${randomUUID()}`,role:"sportif",firstName:"Test",lastName:"Synthétique",phone:"0600000000",termsAccepted:true}})).status()).toBe(201);}
async function create(request:APIRequestContext,attempt=true){
 const availability=(await (await request.get("/api/reservations?coachId=coach-demo-01")).json()).data as Array<{slots:string[]}>;
 const slot=new Date(Math.max(Date.now()+40*86400000,...availability.flatMap(r=>r.slots.map(Date.parse)))+86400000).toISOString();
 const context=attempt?(await (await request.get("/api/reservations/recovery")).json()).context:undefined;
 const response=await request.post("/api/reservations",{data:{coachId:"coach-demo-01",service:"Séance synthétique de suivi",duration:"30min",slots:[slot],...(attempt?{creationAttemptId:randomUUID(),creationContext:context}:{})}});expect(response.status()).toBe(201);return (await response.json()).data;
}
const summary=(request:APIRequestContext,id:string,claimToken?:string)=>request.post("/api/reservations/summary",{data:{reservationId:id,...(claimToken?{claimToken}:{})}});
test("anonymous browser proof, legacy token exchange, stranger and owned reservation",async({request,playwright,baseURL})=>{
 const r=await create(request);const first=await summary(request,r.id);expect(first.ok()).toBe(true);const dto=(await first.json()).data;
 expect(dto.service).toBe(r.service);expect(dto.price).toBe(r.price);expect(dto).not.toHaveProperty("ownerEmail");expect(dto).not.toHaveProperty("financials");expect(first.headers()["cache-control"]).toBe("no-store");
 expect((await request.get(`/api/reservations/${r.id}`)).status()).toBe(401);
 const guest=await playwright.request.newContext({baseURL});expect((await summary(guest,r.id)).status()).toBe(403);expect((await summary(guest,r.id,"incorrect-proof")).status()).toBe(403);
 expect((await summary(guest,r.id,r.claimToken)).ok()).toBe(true);expect((await summary(guest,r.id)).ok()).toBe(true);
 await signup(request);expect((await request.get(`/api/reservations/${r.id}?claimToken=${encodeURIComponent(r.claimToken)}`)).status()).toBe(200);
 expect((await request.post(`/api/reservations/${r.id}/cancel`,{headers:{"x-reservation-claim-token":r.claimToken}})).status()).toBe(200);
 expect((await summary(guest,r.id,r.claimToken)).status()).toBe(403);
 const owned=await summary(request,r.id);expect((await owned.json()).data.status).toBe("cancelled");
 const second=await playwright.request.newContext({baseURL});await signup(second);expect((await summary(second,r.id,r.claimToken)).status()).toBe(403);
 await guest.dispose();await second.dispose();
});
test("owner sees current cancellation and commercial URL tampering has no authority",async({page})=>{
 await signup(page.request);const r=await create(page.request);
 await page.goto(`/recapitulatif?reservationId=${r.id}&coach=FauxCoach&city=FausseVille&price=0&service=FausseSéance&status=paid&slot=10:00`);
 await expect(page.locator("[data-recap-name]")).toHaveText(r.coachName);await expect(page.locator("#gym-booking")).toContainText(r.service);await expect(page.locator("#gym-booking")).not.toContainText("FausseSéance");
 expect(new URL(page.url()).searchParams.size).toBe(1);expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");expect(await page.locator('meta[name="referrer"]').getAttribute("content")).toBe("no-referrer");
 expect((await page.request.post(`/api/reservations/${r.id}/cancel`)).status()).toBe(200);await page.reload();await expect(page.locator(".booking-note")).toContainText("Réservation annulée");await expect(page.getByRole("link",{name:"Retrouver ma demande dans mon compte"})).toBeVisible();
});
test("legacy URL proof is scrubbed, refresh works and only necessary account links retain existing capability",async({page})=>{
 const r=await create(page.request,false);await page.goto(`/recapitulatif?reservationId=${r.id}&claimToken=${encodeURIComponent(r.claimToken)}&price=0`);
 await expect(page.locator("[data-recap-login]")).toBeVisible();expect(new URL(page.url()).searchParams.has("claimToken")).toBe(false);
 const auth=new URL((await page.locator("[data-recap-login]").getAttribute("href"))!,"http://localhost");expect(auth.searchParams.get("reservationId")).toBe(r.id);expect(auth.searchParams.has("claimToken")).toBe(false);
 expect((await page.locator("[data-recap-edit]").getAttribute("href"))).not.toContain("claimToken");await page.reload();await expect(page.locator("[data-recap-login]")).toBeVisible();
});
test("no identifier cannot become an invented commercial recap",async({page})=>{
 await page.goto("/recapitulatif?coach=FauxCoach&price=999&slot=10:00");await expect(page.locator("#gym-booking").getByRole("alert")).toContainText("Référence");await expect(page.locator("#gym-booking")).not.toContainText("FauxCoach");await expect(page.locator("[data-recap-login]")).toHaveCount(0);
});
for(const kind of ["missing","forbidden","network","malformed"])test(`summary ${kind} never falls back to URL values`,async({page})=>{
 await page.route("**/api/reservations/summary",route=>kind==="network"?route.abort("failed"):route.fulfill({status:kind==="missing"?404:kind==="forbidden"?403:200,json:kind==="malformed"?{data:{id:"res-synthetic",price:35}}:{error:"synthetic"}}));
 await page.goto("/recapitulatif?reservationId=res-synthetic&coach=FauxCoach&price=999");await expect(page.locator("#gym-booking").getByRole("alert")).toBeVisible();await expect(page.locator("#gym-booking")).not.toContainText("FauxCoach");await expect(page.locator("[data-recap-login]")).toHaveCount(0);
});
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem("gym-cookie-consent-v1","refused"));});
test("anonymous summary keyboard, privacy and layout at all widths",async({page},info)=>{
 const r=await create(page.request);await page.goto(`/recapitulatif?reservationId=${r.id}`);await expect(page.locator("[data-recap-login]")).toBeVisible();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const link=page.locator("[data-recap-login]");await link.focus();expect(await link.evaluate(el=>document.activeElement===el)).toBe(true);expect(await link.evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe("none");if(width===390||width===1440)await page.locator("#gym-booking").screenshot({path:info.outputPath(`summary-${width}.png`)});}
});

test("loading does not reveal query content before server confirmation",async({page})=>{
 let release!:()=>void;const paused=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/api/reservations/summary",async route=>{await paused;await route.fulfill({status:502,json:{error:"synthetic"}});});
 await page.goto("/recapitulatif?reservationId=res-synthetic&coach=FauxCoach&price=999");
 await expect(page.locator("#gym-booking").getByRole("status")).toContainText("Chargement");await expect(page.locator("#gym-booking")).not.toContainText("FauxCoach");
 release();await expect(page.locator("#gym-booking").getByRole("alert")).toBeVisible();
});
