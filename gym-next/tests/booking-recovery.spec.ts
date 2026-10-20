import { test, expect, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
const selection="coach=coach-demo-01&sport=metiers-de-la-forme&city=Marseille&service=Reprise%20synthétique&duration=30min";
async function prepare(request:APIRequestContext) { const response=await request.get("/api/reservations/recovery");expect(response.ok()).toBe(true);return (await response.json()).context as string; }
async function body(request:APIRequestContext,context:string) {
  const availability=(await (await request.get("/api/reservations?coachId=coach-demo-01")).json()).data as Array<{slots:string[]}>;
  const latest=Math.max(Date.now()+40*86400000,...availability.flatMap(r=>r.slots.map(Date.parse)).filter(Number.isFinite));
  return {creationAttemptId:randomUUID(),creationContext:context,coachId:"coach-demo-01",service:"Reprise synthétique",duration:"30min",slots:[new Date(latest+86400000).toISOString()]};
}
async function signup(request:APIRequestContext) {const response=await request.post("/api/auth/sign-up",{data:{email:`recovery-${randomUUID()}@example.com`,password:`Synthetic-${randomUUID()}`,role:"sportif",firstName:"Test",lastName:"Synthétique",phone:"0600000000",termsAccepted:true}});expect(response.status()).toBe(201);}
test("API concurrent same key, changed content, cookie proof and no-store",async({request,playwright,baseURL})=>{
  const data=await body(request,await prepare(request));
  const [a,b]=await Promise.all([request.post("/api/reservations",{data}),request.post("/api/reservations",{data})]);
  expect(a.ok()).toBe(true);expect(b.ok()).toBe(true);const first=(await a.json()).data;expect((await b.json()).data.id).toBe(first.id);
  const recovered=await request.post("/api/reservations/recovery",{data});expect(recovered.ok()).toBe(true);expect(recovered.headers()["cache-control"]).toBe("no-store");expect((await recovered.json()).data.claimToken).toBe(first.claimToken);
  expect((await request.post("/api/reservations",{data:{...data,service:"Different"}})).status()).toBe(409);
  const stranger=await playwright.request.newContext({baseURL});const otherContext=await prepare(stranger);
  const denied=await stranger.post("/api/reservations/recovery",{data:{...data,creationContext:otherContext}});expect(denied.status()).toBe(403);expect((await denied.json()).data).toBeUndefined();
  expect((await stranger.post("/api/reservations",{data:{...data,creationContext:otherContext}})).status()).toBe(403);
  await stranger.dispose();
  const publicAvailability=(await (await request.get("/api/reservations?coachId=coach-demo-01")).json()).data;
  expect(JSON.stringify(publicAvailability)).not.toContain(data.creationAttemptId);expect(JSON.stringify(publicAvailability)).not.toContain(first.claimToken);
});
test("account binding rejects changed account, anonymous replay and missing browser proof",async({request,playwright,baseURL})=>{
  await signup(request);const data=await body(request,await prepare(request));const response=await request.post("/api/reservations",{data});expect(response.status()).toBe(201);
  const same=await request.post("/api/reservations/recovery",{data});expect(same.ok()).toBe(true);expect((await same.json()).data.claimToken).toBeUndefined();
  await request.post("/api/auth/sign-out");await signup(request);const changed=await prepare(request);
  expect((await request.post("/api/reservations/recovery",{data:{...data,creationContext:changed}})).status()).toBe(403);
  await request.post("/api/auth/sign-out");expect((await request.post("/api/reservations",{data})).status()).toBe(403);
  const fresh=await playwright.request.newContext({baseURL});expect((await fresh.post("/api/reservations/recovery",{data})).status()).toBe(403);await fresh.dispose();
});
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem("gym-cookie-consent-v1","refused"));});
for(const afterCommit of [false,true])test(`reload after lost response committed=${afterCommit}`,async({page})=>{
  let posts=0;let receiptId="";
  await page.route("**/api/reservations",async route=>{if(route.request().method()!=="POST")return route.continue();posts++;if(afterCommit){const response=await route.fetch();expect(response.status()).toBe(201);receiptId=(await response.json()).data.id;}await route.abort("failed");});
  await page.goto(`/creneau?${selection}`);await page.locator("[data-slot]:not(:disabled)").first().click();await page.locator("[data-multi-confirm]").click();
  await expect(page.getByRole("region",{name:"Reprise de la demande"})).toBeVisible();await page.reload();
  await expect(page.locator("[data-multi-confirm]")).toBeDisabled();
  const stored=await page.evaluate(()=>sessionStorage.getItem("gym-booking-pending-v1"));expect(stored).not.toContain("claimToken");expect(stored).not.toContain("ownerEmail");
  await page.unroute("**/api/reservations");await page.getByRole("button",{name:"Vérifier le résultat",exact:true}).click();
  if(!afterCommit){await page.getByRole("button",{name:"Reprendre le même envoi",exact:true}).click();}
  await expect(page.locator("[data-recap-page]")).toBeVisible();if(receiptId)expect(new URL(page.url()).searchParams.get("reservationId")).toBe(receiptId);
  expect(posts).toBe(1);expect(await page.evaluate(()=>sessionStorage.getItem("gym-booking-pending-v1"))).toBeNull();
});
test("recovery failure, account switch, keyboard and mobile layout keep unknown request locked",async({page},info)=>{
  await page.setViewportSize({width:390,height:900});
  await page.route("**/api/reservations",route=>route.abort("failed"));
  await page.goto(`/creneau?${selection}`);await page.locator("[data-slot]:not(:disabled)").first().click();await page.locator("[data-multi-confirm]").click();await expect(page.getByRole("region",{name:"Reprise de la demande"})).toBeVisible();
  await page.route("**/api/reservations/recovery",route=>route.request().method()==="POST"?route.fulfill({status:503,json:{error:"Indisponible"}}):route.continue());
  const check=page.getByRole("button",{name:"Vérifier le résultat",exact:true});await check.focus();await check.press("Enter");await expect(page.locator("#booking-feedback")).toContainText("toujours non confirmé");await expect(page.locator("[data-multi-confirm]")).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const width of [320,390,768,1440]) {
    await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(check).toHaveCSS("min-height","48px");
    if(width===390||width===1440)await page.locator("#gym-booking").screenshot({path:info.outputPath(`recovery-${width}.png`)});
  }
  await page.unroute("**/api/reservations/recovery");await signup(page.request);await page.reload();await page.getByRole("button",{name:"Vérifier le résultat",exact:true}).click();await expect(page.locator("#booking-feedback")).toContainText("session a changé");await expect(page.locator("[data-multi-confirm]")).toBeDisabled();
});
