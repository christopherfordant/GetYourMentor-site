import { randomBytes } from "node:crypto";
import { defineConfig, devices } from "@playwright/test";

const auditExternalServer = process.env.PW_AUDIT_EXTERNAL_SERVER === "true";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  // Le mode de démonstration partage un store mémoire entre les scénarios.
  // Un worker unique évite les collisions artificielles ; la production réelle
  // sera validée séparément contre Supabase.
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: auditExternalServer ? undefined : {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run dev -- --hostname 127.0.0.1 --port 3001`,
    url: "http://127.0.0.1:3001/",
    // Ne jamais réutiliser un serveur lancé avec un autre environnement ou un ancien build.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      // Ephemeral key for a loopback development test server; production cookie protections stay enabled.
      SESSION_SECRET: randomBytes(32).toString("hex"),
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3001",
      PAYMENT_PROVIDER: "local",
      GETYOURMENTOR_ALLOW_DEMO: "true",
    },
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1200 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
      },
    },
  ],
});
