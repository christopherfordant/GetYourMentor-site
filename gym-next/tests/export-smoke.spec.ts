import {test,expect} from "@playwright/test";
test("standalone demo pages and original placeholder artwork load",async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:900});
 await page.addInitScript(()=>localStorage.setItem("gym-cookie-consent-v1","refused"));
 for(const route of ["/","/recherche","/coachs","/coach?coach=coach-demo-01","/creneau?coach=coach-demo-01","/compte"]){const response=await page.goto(route);expect(response?.status()).toBe(200);await expect(page.locator("body")).not.toBeEmpty();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 const art=await page.request.get("/images/demo-sport.svg");expect(art.status()).toBe(200);expect(art.headers()["content-type"]).toContain("image/svg+xml");
 expect((await page.request.get("/api/knowledge/search?q=synthetic")).status()).toBe(404);
});
