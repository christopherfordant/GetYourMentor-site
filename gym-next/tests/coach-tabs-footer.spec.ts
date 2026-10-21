import { expect, test, type Page } from "@playwright/test";

async function profilePath(page: Page) {
  const response = await page.request.get("/api/coaches?sport=football&city=Paris");
  expect(response.ok()).toBe(true);
  const { data } = await response.json(); expect(data.length).toBeGreaterThan(0);
  return `/coach?${new URLSearchParams({ coach: data[0].id, sport: "football", city: "Paris" })}`;
}

test("coach tabs expose panels and support arrows, Home, End, Tab and touch", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("gym-cookie-consent-v1", "refused"));
  const path = await profilePath(page);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height: 900 }); await page.goto(path);
    const list = page.getByRole("tablist", { name: "Sections du profil" });
    const about = list.getByRole("tab", { name: "À propos", exact: true });
    await about.focus(); await expect(about).toHaveAttribute("aria-selected", "true");
    const before = await list.boundingBox();
    await about.press("ArrowRight");
    const planning = list.getByRole("tab", { name: "Planning", exact: true });
    await expect(planning).toBeFocused(); await expect(planning).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(page.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "booking-tab-planning");
    expect(Math.abs((await list.boundingBox())!.y - before!.y)).toBeLessThan(2);
    await planning.press("Tab"); await expect(page.getByRole("tabpanel")).toBeFocused();
    await planning.focus(); await planning.press("End");
    const contents = list.getByRole("tab", { name: "Contenus", exact: true });
    await expect(contents).toBeFocused(); await expect(contents).toHaveAttribute("aria-selected", "true");
    await contents.press("ArrowRight"); await expect(about).toBeFocused();
    await about.press("ArrowLeft"); await expect(contents).toBeFocused();
    await contents.press("Home"); await expect(about).toBeFocused();
    if (test.info().project.name === "mobile-chromium") await contents.tap(); else await contents.click(); await expect(contents).toHaveAttribute("aria-selected", "true");
    await expect(contents).toHaveCSS("text-decoration-line", "underline");
    const bounds = await list.getByRole("tab").evaluateAll(es => es.map(e => ({ width: e.clientWidth, text: e.scrollWidth, height: e.getBoundingClientRect().height })));
    for (const b of bounds) { expect(b.text).toBeLessThanOrEqual(b.width); expect(b.height).toBeGreaterThanOrEqual(44); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Réserver", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Planning", exact: true })).toBeFocused();
});

test("shared footer controls remain reachable with the cookie banner at every width", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("gym-cookie-consent-v1", "refused"));
  test.setTimeout(120_000);
  const path = await profilePath(page);
  for (const route of [path, "/recherche", "/coachs?sport=football&city=Paris", "/", "/compte?mode=coach", "/legal/cookies", "/recapitulatif", "/inscription-club", "/paiement"]) {
    await page.goto(route); await expect(page.locator(".gym-footer")).toBeVisible();
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({ width, height: 900 });
      const menu = page.locator(".de-menu-toggle:visible");
      if (await menu.count()) { await menu.click(); await menu.press("Escape"); }
      const sectionTab = page.getByRole("tab", { name: width < 768 ? "Contenus" : "Planning", exact: true });
      if (await sectionTab.count()) await sectionTab.click();
      await page.getByRole("button", { name: "Préférences cookies", exact: true }).click();
      await expect(page.locator(".cookie-consent-banner")).toBeVisible();
      await expect.poll(() => page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom)), { message: `${route} ${width}px banner reserve` }).toBeGreaterThan(0);
      await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
      await expect.poll(() => page.evaluate(() => {
        window.scrollTo(0,document.documentElement.scrollHeight);
        const last = document.querySelector(".gym-footer-bottom")!.getBoundingClientRect();
        const banner = document.querySelector(".cookie-consent-banner")!.getBoundingClientRect();
        return last.bottom <= banner.top && last.top >= 0;
      }), { message: `${route} ${width}px last footer above banner` }).toBe(true);
      if (await page.evaluate(() => scrollY > 420)) await expect(page.getByRole("link", { name: "Remonter en haut de la page", exact: true })).toBeVisible();
      const covered = await page.locator(".gym-footer").evaluate(footer => {
        return [...footer.querySelectorAll<HTMLElement>("a,button")].filter(e => e.getClientRects().length && e.getAttribute("aria-hidden") !== "true").filter(e => {
          e.scrollIntoView({ block: "center", behavior: "instant" });
          const r = e.getBoundingClientRect(); const x = Math.max(0,Math.min(innerWidth-1,r.left+r.width/2)); const y = r.top+r.height/2;
          const hit = document.elementFromPoint(x,y);
          return y < 0 || y >= innerHeight || !hit || !(e === hit || e.contains(hit));
        }).map(e => e.textContent || e.getAttribute("aria-label"));
      });
      expect(covered, `${route} ${width}px`).toEqual([]);
      await page.getByRole("button", { name: "Refuser le non nécessaire", exact: true }).click();
      await expect(page.getByRole("button", { name: "Préférences cookies", exact: true })).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--cookie-banner-space"))).toBe("");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("short error, long text and enlarged text preserve footer access", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coach?coach=unknown-coach"); await expect(page.locator("[data-coach-unavailable]")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".gym-footer-bottom")).toBeAttached();
  await page.goto(await profilePath(page));
  await page.locator(".de-booking-tab").first().evaluate(e => { e.textContent = "Présentation détaillée"; });
  await page.getByRole("tab").evaluateAll(es => es.forEach(e => { (e as HTMLElement).style.fontSize = "26px"; }));
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0,document.documentElement.scrollHeight));
  await expect.poll(() => page.evaluate(() => document.querySelector(".gym-footer-bottom")!.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
});
