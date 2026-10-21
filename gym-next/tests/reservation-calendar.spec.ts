import { expect, test, type APIRequestContext } from "@playwright/test";
import type { Reservation } from "../lib/domain";
import { coachProfiles } from "../lib/domain";
import { reservationCalendar, calendarEligible } from "../lib/domain/reservation-calendar";

const row = (patch: Partial<Reservation> = {}): Reservation => ({ id: "calendar-unit", ownerEmail: "private@example.com", coachId: "coach", coachName: "Private name", sport: "basketball", city: "Private city", service: "Private title\r\nATTENDEE:secret@example.com", duration: "1 heure 30", slots: ["2027-03-28T00:30:00Z", "2027-03-28T01:30:00Z"], appointmentAt: "2027-03-28T01:30:00Z", price: 35, status: "accepted", createdAt: "2026-10-21T10:00:00Z", reservationCode: "secret-code", ...patch });
test("calendar format: agreed slot, UTC across DST, stable UID, privacy and UTF-8 folding", () => {
  const text = reservationCalendar(row(), Date.parse("2026-10-21T12:00:00Z"));
  expect(text).toContain("DTSTART:20270328T013000Z\r\nDTEND:20270328T030000Z");
  expect(text).toContain("CLASS:PRIVATE"); expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
  expect(text).not.toMatch(/private@example|Private name|Private city|Private title|secret|ATTENDEE|ORGANIZER|VALARM|METHOD:|URL:/i);
  for (const line of text.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  expect(text.replace(/\r\n /g, "")).toContain("annulations ne sont pas synchronisés");
  const uid = (value: string) => value.replace(/\r\n /g, "").match(/UID:([^\r]+)/)![1];
  expect(uid(reservationCalendar(row(), Date.now()))).toBe(uid(text));
  for (const status of ["requested", "cancelled", "rejected"] as const) expect(calendarEligible(row({ status }))).toBe(false);
  for (const patch of [{ appointmentAt: "invalid" }, { duration: "unknown" }, { appointmentAt: undefined }, { appointmentAt: "2027-02-30T12:00:00Z" }]) expect(() => reservationCalendar(row(patch))).toThrow();
});

async function signIn(request: APIRequestContext, role: string, email: string) {
  const response = await request.post("/api/auth/sign-in", { data: { role, email, password: "demo-password" } }); expect(response.status()).toBe(200);
  return { Cookie: response.headers()["set-cookie"].split(";")[0] };
}
test("calendar endpoint: ownership, roles, agreed slot, no mutation, cancellation and HEAD", async ({ request }, info) => {
  const path = "/api/reservations/no-such-calendar/calendar";
  expect((await request.get(path, { headers: { Cookie: "" } })).status()).toBe(401);
  const athlete = await signIn(request, "sportif", `calendar-api-${info.project.name}@example.com`);
  const other = await signIn(request, "sportif", `calendar-other-${info.project.name}@example.com`);
  const coach = await signIn(request, "coach", "coach@example.com");
  const created = await request.post("/api/reservations", { headers: athlete, data: { coachId: coachProfiles[0].id, service: "Calendar synthetic", duration: "1 heure", slots: [new Date(Date.now() + 1900 * 86400000).toISOString(), new Date(Date.now() + 1902 * 86400000).toISOString()] } }); expect(created.status()).toBe(201);
  const original = (await created.json()).data as Reservation, url = `/api/reservations/${original.id}/calendar`;
  expect((await request.get(url, { headers: athlete })).status()).toBe(409);
  expect((await request.patch(`/api/reservations/${original.id}`, { headers: coach, data: { status: "accepted", appointmentAt: original.slots[1] } })).status()).toBe(200);
  const before = (await (await request.get(`/api/reservations/${original.id}`, { headers: athlete })).json()).data;
  const response = await request.get(`${url}?ownerEmail=forged&price=999&claimToken=forged`, { headers: athlete }); expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/calendar"); expect(response.headers()["cache-control"]).toContain("no-store"); expect(response.headers()["content-disposition"]).toContain("attachment;");
  expect(await response.text()).toContain(`DTSTART:${original.slots[1].replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`);
  expect((await request.head(url, { headers: athlete })).status()).toBe(200);
  expect((await request.get(url, { headers: other })).status()).toBe(404);
  for (const role of ["coach", "club", "admin"]) { const headers = await signIn(request, role, `${role}@example.com`); expect((await request.get(url, { headers })).status()).toBe(403); }
  expect((await (await request.get(`/api/reservations/${original.id}`, { headers: athlete })).json()).data).toEqual(before);
  expect((await request.post(`/api/reservations/${original.id}/cancel`, { headers: athlete })).status()).toBe(200);
  expect((await request.get(url, { headers: athlete })).status()).toBe(409);
});

test("calendar UI: keyboard download, private local data, error/retry and responsive account", async ({ page, request }, info) => {
  const email = `calendar-ui-${info.project.name}@example.com`, athlete = await signIn(request, "sportif", email), coach = await signIn(request, "coach", "coach@example.com");
  const created = await request.post("/api/reservations", { headers: athlete, data: { coachId: coachProfiles[0].id, service: "Calendrier fictif", duration: "1 heure", slots: [new Date(Date.now() + 1950 * 86400000).toISOString()] } }); expect(created.status()).toBe(201); const reservation = (await created.json()).data;
  expect((await request.patch(`/api/reservations/${reservation.id}`, { headers: coach, data: { status: "accepted" } })).status()).toBe(200);
  await page.goto("/compte?mode=sportif"); await expect(page.locator(".cookie-consent-banner,.cookie-preferences-trigger")).toHaveCount(1); const refuse = page.getByRole("button", { name: "Refuser le non nécessaire", exact: true }); if (await refuse.isVisible()) await refuse.click();
  await page.locator("#account-email").fill(email); await page.locator("#account-password").fill("demo-password"); await page.getByRole("button", { name: "Se connecter", exact: true }).click(); await expect(page.locator("[data-account-session]")).toBeVisible();
  const root = page.locator(`[data-athlete-reservation="${reservation.id}"] [data-reservation-calendar]`), button = root.getByRole("button"); await expect(button).toBeVisible();
  await button.focus(); const download = page.waitForEvent("download"); await page.keyboard.press("Enter"); expect((await download).suggestedFilename()).toBe("getyourmentor-seance-demo.ics"); await expect(root.getByRole("status")).toContainText("aucune synchronisation automatique");
  const route = `**/api/reservations/${reservation.id}/calendar`;
  await page.route(route, r => r.fulfill({ status: 503, json: { error: "synthetic" } })); await button.click(); await expect(root.getByRole("alert")).toContainText("non confirmé");
  await page.unroute(route); await button.click(); await expect(root.getByRole("status")).toBeVisible();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await expect(button).toBeVisible(); if ([390, 1440].includes(width)) await root.screenshot({ path: info.outputPath(`calendar-${width}.png`) }); }
});
