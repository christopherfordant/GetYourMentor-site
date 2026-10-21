import {expect,test} from "@playwright/test";

test("Factory payment: unavailable state, illustrative selection and complete responsive footer",async({page},info)=>{
 await page.goto("/paiement");
 await expect(page.locator('[data-payment-status]')).toContainText("Identifiant de réservation manquant");
 await expect(page.getByRole("button",{name:"Paiement indisponible",exact:true})).toBeDisabled();
 const method=page.getByRole("button",{name:"Apple Pay Illustration sans service externe"});await method.focus();await page.keyboard.press("Enter");await expect(method).toHaveAttribute("aria-pressed","true");await expect(method.locator("strong")).toHaveCSS("text-decoration-line","underline");
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});
  await expect(page.locator("#gym-discovery")).toHaveCSS("background-color","rgb(20, 20, 20)");
  await expect(page.locator(".payment-summary-card")).toHaveCSS("background-color","rgb(28, 28, 28)");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const footer=page.locator("footer");await expect(footer).toBeVisible();
  expect(await footer.evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1)).toBe(true);
  const banner=page.locator(".cookie-consent-banner");if(await banner.isVisible())expect(await footer.evaluate(el=>el.getBoundingClientRect().bottom)).toBeLessThanOrEqual((await banner.boundingBox())!.y+1);
  if([390,1440].includes(width))await page.screenshot({path:info.outputPath(`factory-payment-${width}.png`),fullPage:true});
 }
});

test("Factory personal progress: authenticated form, saved objective and read failure",async({page},info)=>{
 await page.goto("/compte?mode=sportif");await expect(page.locator(".cookie-consent-banner,.cookie-preferences-trigger")).toHaveCount(1);const refuse=page.getByRole("button",{name:"Refuser le non nécessaire",exact:true});if(await refuse.isVisible())await refuse.click();
 await page.locator("#account-email").fill(`factory-progress-${info.project.name}@example.com`);await page.locator("#account-password").fill("demo-password");await page.getByRole("button",{name:"Se connecter",exact:true}).click();await expect(page.locator("[data-account-session]")).toBeVisible();
 await page.goto("/suivi");const root=page.locator("[data-personal-progress]");await expect(root).toHaveAttribute("aria-busy","false");
 await root.getByLabel("Intitulé fictif",{exact:true}).fill("Régularité fictive");await root.getByLabel("Nombre total de séances visé").fill("5");await root.getByRole("checkbox").check();await root.getByRole("button",{name:"Enregistrer l’objectif fictif"}).click();await expect(root.getByRole("status")).toContainText("Objectif fictif enregistré");
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(root.locator('input[name="title"]')).toHaveCSS("background-color","rgb(28, 28, 28)");await expect(root.locator('input[name="title"]')).toHaveCSS("color","rgb(252, 251, 249)");
 if([390,1440].includes(width))await page.screenshot({path:info.outputPath(`factory-progress-${width}.png`),fullPage:true});}
 await page.route("**/api/progress",route=>route.fulfill({status:503,json:{error:"Suivi fictif temporairement indisponible"}}));await root.getByRole("button",{name:"Actualiser mon suivi"}).click();await expect(root.getByRole("alert")).toContainText("temporairement indisponible");await expect(root.getByRole("alert")).toHaveCSS("color","rgb(252, 165, 165)");
});
