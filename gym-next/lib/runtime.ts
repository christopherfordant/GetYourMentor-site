function isAcceptanceTestMode() {
  return process.env.GETYOURMENTOR_ACCEPTANCE_MODE === "true"
    && process.env.CI === "true"
    && /^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.NEXT_PUBLIC_APP_URL ?? "");
}

export function isDemoFallbackAllowed() {
  return isHostedDemo()
    || isAcceptanceTestMode()
    || (process.env.NODE_ENV !== "production" && process.env.GETYOURMENTOR_ALLOW_DEMO === "true");
}

// A hosted demo is deliberately isolated: no Supabase, Stripe or email credentials.
// GETYOURMENTOR_ALLOW_DEMO alone still never enables fallbacks in production.
export function isHostedDemo() {
  let hostname = "";
  try { hostname = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").hostname; } catch { return false; }
  return process.env.DEPLOY_ENV === "demo"
    && process.env.GETYOURMENTOR_ALLOW_DEMO === "true"
    && process.env.PAYMENT_PROVIDER === "local"
    && Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
    && Boolean(process.env.SITE_ID)
    && hostname.endsWith(".netlify.app")
    && (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://")
    && ![process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.SUPABASE_ANON_KEY, process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET, process.env.RESEND_API_KEY].some(Boolean);
}

export function assertDemoFallbackAllowed(resource: string) {
  if (!isDemoFallbackAllowed()) {
    throw new Error(`${resource} n'est pas configuré pour cet environnement de production`);
  }
}

function isValidProductionUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function hasLegalProductionApproval() {
  return process.env.LEGAL_CONTENT_APPROVED === "true"
    && Boolean(
      process.env.LEGAL_ENTITY_NAME?.trim()
      && process.env.LEGAL_ENTITY_ADDRESS?.trim()
      && process.env.LEGAL_CONTACT_EMAIL?.trim()
      && process.env.LEGAL_REGISTRATION?.trim()
      && process.env.LEGAL_DIRECTOR_NAME?.trim(),
    );
}

export function getRuntimeReadiness() {
  const isStaging = process.env.DEPLOY_ENV === "staging";
  const checks = {
    publicUrl: isValidProductionUrl(process.env.NEXT_PUBLIC_APP_URL),
    sessionSecret: Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32),
    cronSecret: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 32),
    supabase: Boolean(
      (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    stripe: process.env.PAYMENT_PROVIDER === "stripe" && Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    resend: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
    legal: hasLegalProductionApproval(),
  };
  const demo = isDemoFallbackAllowed();
  const technicalChecksReady = Object.entries(checks)
    .filter(([name]) => name !== "legal")
    .every(([, value]) => value);
  const servicesReady = Object.values(checks).every(Boolean);
  return {
    mode: demo ? "demo" : isStaging ? "staging" : "production",
    ready: demo || servicesReady || (isStaging && technicalChecksReady),
    checks,
  } as const;
}

// Shared gate for personal demo modules; never mixes their state with Supabase.
export function isIsolatedDemoFeatureEnabled() {
  return isDemoFallbackAllowed() && ![process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY].some(Boolean);
}
