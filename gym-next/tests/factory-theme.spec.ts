import { expect, test } from "@playwright/test";

function contrast(a: number[], b: number[]) {
  const light = (rgb: number[]) => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126,.7152,.0722][i], 0);
  const x = light(a), y = light(b);
  return (Math.max(x,y) + .05) / (Math.min(x,y) + .05);
}

test("Factory discovery keeps its catalogue, accessible contrast and responsive layout", async ({ page }) => {
  const response = await page.request.get("/api/coaches?sport=football&city=Paris");
  expect(response.ok()).toBe(true);
  const { data } = await response.json(); expect(data.length).toBeGreaterThan(0);
  const profile = new URLSearchParams({ coach: data[0].id, sport: "football", city: "Paris" });
  await page.addInitScript(() => localStorage.setItem("gym-cookie-consent-v1", "refused"));
  for (const path of ["/recherche?sport=football&city=Paris", "/coachs?sport=football&city=Paris", `/coach?${profile}`]) {
    await page.goto(path);
    const frame = page.locator("#gym-discovery.gym-theme-factory"); await expect(frame).toBeVisible();
    await expect(frame.locator("h1")).toBeVisible();
    await expect(frame).toHaveCSS("background-color", "rgb(20, 20, 20)");
    await expect(frame).toHaveCSS("font-family", /system-ui/);
    await expect(frame.locator("footer")).toHaveCSS("background-color", "rgb(28, 28, 28)");
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("link", { name: "Mon compte", exact: false }).first()).toBeVisible();
    }
  }
  await page.goto("/recherche?sport=football&city=Paris");
  const values = await page.locator(".de-search-form button").evaluate(e => {
    const rgb = (s: string) => s.match(/[\d.]+/g)!.slice(0,3).map(Number);
    const s = getComputedStyle(e), input = getComputedStyle(document.querySelector(".de-search-form input")!);
    return { text: rgb(s.color), background: rgb(s.backgroundColor), border: rgb(input.borderTopColor), surface: rgb(input.backgroundColor) };
  });
  expect(contrast(values.text, values.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(values.border, values.surface)).toBeGreaterThanOrEqual(3);
  expect(contrast([212,212,216], [28,28,28])).toBeGreaterThanOrEqual(4.5);
  await expect(page.getByRole("combobox", { name: "Quelle discipline ?" }).locator("option")).toHaveCount(4);
});

test("Factory cookies and mobile disclosure retain keyboard operation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recherche");
  await page.getByRole("button", { name: "Refuser le non nécessaire", exact: true }).click();
  const menu = page.locator(".de-menu-toggle"); await menu.focus(); await menu.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await menu.press("Escape"); await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Préférences cookies", exact: true }).click();
  await expect(page.locator(".cookie-consent-banner")).toHaveCSS("background-color", "rgb(28, 28, 28)");
  await page.getByRole("button", { name: "Refuser le non nécessaire", exact: true }).click();
  await expect(page.getByRole("button", { name: "Préférences cookies", exact: true })).toBeFocused();
});

test("Booking routes now inherit Factory while access validation stays explicit", async ({ page }) => {
  await page.goto("/recapitulatif");
  await expect(page.locator("#gym-discovery")).toBeVisible();
  await expect(page.locator(".gym-theme-factory")).toHaveCount(1);
  await expect(page.locator("#gym-discovery")).toHaveCSS("background-color", "rgb(20, 20, 20)");
});
