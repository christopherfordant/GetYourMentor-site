import {test,expect} from "@playwright/test";
const dto={id:"res-synthetic",coachName:"Coach synthétique",sport:"fitness",city:"Paris",service:"Séance synthétique",duration:"30min",price:35,slots:["2031-01-01T10:00:00Z"],appointmentAt:"2031-01-01T10:00:00Z",status:"requested",participantCount:1,authenticated:false};
test("journey layout before and after",async({page},info)=>{
 await page.addInitScript(()=>localStorage.setItem("gym-cookie-consent-v1","refused"));await page.route("**/api/reservations/summary",r=>r.fulfill({json:{data:dto}}));
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});await page.goto("/recapitulatif?reservationId=res-synthetic");await expect(page.locator("[data-recap-login]")).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(process.env.UX_BEFORE){if(width===390||width===1440)await page.screenshot({path:`assets/journey-ux-2026-10-20/before-${width}.png`,fullPage:true});}
 else {if(width===390||width===1440)await page.screenshot({path:`assets/journey-ux-2026-10-20/after-${width}.png`,fullPage:true});}
 if(!process.env.UX_BEFORE&&width<=760){const menu=page.locator(".de-menu-toggle");await menu.focus();await menu.press("Enter");await expect(menu).toHaveAttribute("aria-expanded","true");await expect(page.locator(".de-sports")).toBeVisible();await menu.press("Escape");await expect(menu).toBeFocused();await expect(page.locator(".de-sports")).toBeHidden();}
 console.log(`header ${width}px height ${Math.round((await page.locator(".de-header").boundingBox())!.height)}`);
 }
});

test("shared mobile header across discovery routes and long content reflow",async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("gym-cookie-consent-v1","refused"));
 await page.route("**/api/reservations/summary",r=>r.fulfill({json:{data:{...dto,service:"Accompagnement sportif personnalisé et préparation progressive pour une reprise adaptée aux objectifs de chaque participant"}}}));
 for(const path of ["/recherche","/coachs","/coach?coach=coach-demo-01","/creneau?coach=coach-demo-01","/recapitulatif?reservationId=res-synthetic"]){await page.setViewportSize({width:390,height:900});await page.goto(path);const menu=page.locator(".de-menu-toggle");await expect(menu).toBeVisible();await menu.click();await expect(page.locator(".de-sports a")).toHaveCount(4);await expect(page.getByRole("link",{name:"Mon compte",exact:false}).first()).toBeVisible();await menu.press("Escape");await expect(menu).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 // 720 CSS pixels emulate reflow at 200% on a 1440px viewport; not a physical browser zoom certification.
 await page.setViewportSize({width:720,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
