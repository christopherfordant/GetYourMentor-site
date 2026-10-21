import { expect, test } from "@playwright/test";

const summary = { id: "res-factory-summary", coachName: "Coach de démonstration", sport: "fitness", city: "Paris", service: "Séance synthétique", duration: "30min", price: 35, slots: ["2031-01-01T10:00:00.000Z"], status: "requested", participantCount: 1, authenticated: false };

test("Factory slot selection stays bounded, visible and keyboard accessible", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("gym-cookie-consent-v1", "refused"));
  const response = await page.request.get("/api/coaches"); expect(response.ok()).toBe(true);
  const { data } = await response.json(); expect(data.length).toBeGreaterThan(0);
  const coach = data[0];
  const path = `/creneau?${new URLSearchParams({ coach: coach.id, city: coach.city, sport: coach.sport === "fitness" ? "metiers-de-la-forme" : coach.sport })}`;
  await page.goto(path);
  const calendar = page.getByRole("region", { name: "Calendrier des horaires de démonstration" });
  const slot = calendar.locator("[data-slot]:not(:disabled)").first(); await expect(slot).toBeEnabled();
  await slot.focus(); await slot.press("Enter");
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  await expect(slot).toHaveCSS("text-decoration-line", "underline");
  await expect(slot).toHaveCSS("background-color", "rgb(194, 65, 12)");
  await expect(page.getByRole("region", { name: "Récapitulatif avant envoi" })).toContainText("Europe/Paris");
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("#gym-discovery.gym-theme-factory")).toBeVisible();
    await expect(page.locator(".bk-reservation-selection-panel")).toHaveCSS("background-color", "rgb(28, 28, 28)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 768) {
      const last = calendar.getByRole("button", { name: "Semaine suivante", exact: true }); await last.focus();
      expect(await calendar.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
      await expect(last).toBeInViewport();
    }
    await slot.focus();
    if ([390,1440].includes(width)) await page.screenshot({ path: info.outputPath(`factory-booking-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Préférences cookies", exact: true }).click();
    await expect(page.locator(".cookie-consent-banner")).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      window.scrollTo(0,document.documentElement.scrollHeight);
      return document.querySelector(".gym-footer-bottom")!.getBoundingClientRect().bottom <= document.querySelector(".cookie-consent-banner")!.getBoundingClientRect().top;
    })).toBe(true);
    await page.getByRole("button", { name: "Refuser le non nécessaire", exact: true }).click();
  }
});

test("Factory summary renders server data and usable account actions at all widths", async ({ page }, info) => {
  await page.addInitScript(() => localStorage.setItem("gym-cookie-consent-v1", "refused"));
  await page.route("**/api/reservations/summary", route => route.fulfill({ json: { data: summary } }));
  await page.goto(`/recapitulatif?reservationId=${summary.id}&price=0&coach=Untrusted`);
  await expect(page.locator("[data-recap-name]")).toHaveText(summary.coachName);
  await expect(page.locator(".bk-recap-service-copy")).toContainText("35");
  expect(new URL(page.url()).searchParams.size).toBe(1);
  for (const width of [320,390,768,1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("#gym-discovery")).toHaveCSS("background-color", "rgb(20, 20, 20)");
    await expect(page.locator(".bk-recap-auth-card")).toHaveCSS("background-color", "rgb(28, 28, 28)");
    const login = page.locator("[data-recap-login]"); await login.focus(); await expect(login).toBeFocused();
    await expect(login).toHaveCSS("background-color", "rgb(194, 65, 12)");
    await expect(page.locator("[data-recap-create]")).toHaveAttribute("href", /\/compte/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator("#gym-booking").innerText()).not.toContain("Untrusted");
    if ([390,1440].includes(width)) await page.screenshot({ path: info.outputPath(`factory-summary-${width}.png`), fullPage: true });
  }
  await page.route("**/api/reservations/summary", route => route.fulfill({ status: 403, json: { error: "synthetic" } }));
  await page.reload(); await expect(page.locator(".bk-reservation-inline-error").getByRole("alert")).toContainText("Accès refusé");
  await expect(page.locator("[data-recap-login]")).toHaveCount(0);
  await expect(page.locator(".bk-reservation-inline-error")).toHaveCSS("background-color", "rgb(47, 29, 29)");
});
