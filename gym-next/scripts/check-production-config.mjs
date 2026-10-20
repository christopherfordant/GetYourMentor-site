const required = [
  ["SUPABASE_URL", "URL du projet Supabase"],
  ["SUPABASE_ANON_KEY", "clé publique Supabase côté serveur"],
  ["SUPABASE_SERVICE_ROLE_KEY", "clé Supabase serveur uniquement"],
  ["SESSION_SECRET", "secret de chiffrement des sessions"],
  ["CRON_SECRET", "secret du planificateur de rappels"],
  ["NEXT_PUBLIC_APP_URL", "URL publique de l’application"],
  ["STRIPE_SECRET_KEY", "clé secrète Stripe"],
  ["STRIPE_WEBHOOK_SECRET", "secret du webhook Stripe"],
  ["RESEND_API_KEY", "clé API Resend"],
  ["RESEND_FROM_EMAIL", "adresse d’expédition Resend"],
  ["LEGAL_ENTITY_NAME", "raison sociale de l’éditeur"],
  ["LEGAL_ENTITY_ADDRESS", "adresse de l’éditeur"],
  ["LEGAL_CONTACT_EMAIL", "contact juridique"],
  ["LEGAL_REGISTRATION", "immatriculation de l’éditeur"],
  ["LEGAL_DIRECTOR_NAME", "directeur de publication"],
  ["LEGAL_CONTENT_APPROVED", "validation juridique explicite"],
];

const errors = [];

if (process.env.NODE_ENV === "production" && process.env.GETYOURMENTOR_ALLOW_DEMO === "true") {
  errors.push("GETYOURMENTOR_ALLOW_DEMO doit rester désactivé en production.");
}
if (process.env.NODE_ENV === "production" && process.env.GETYOURMENTOR_ACCEPTANCE_MODE === "true") {
  errors.push("GETYOURMENTOR_ACCEPTANCE_MODE est réservé à la recette locale et doit rester désactivé en production.");
}

function looksLikePlaceholder(value) {
  return /^(YOUR_|REPLACE_|CHANGE_ME|CHANGEME|<|\[)/i.test(value.trim());
}

function requireHttpsUrl(name, value) {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") errors.push(`${name} doit utiliser HTTPS en production.`);
    if (["localhost", "127.0.0.1"].includes(parsed.hostname)) errors.push(`${name} ne doit pas pointer vers localhost en production.`);
  } catch {
    errors.push(`${name} doit être une URL valide.`);
  }
}

for (const [name, label] of required) {
  if (!process.env[name]?.trim()) errors.push(`${name} est requis (${label}).`);
  else if (looksLikePlaceholder(process.env[name])) errors.push(`${name} contient encore une valeur placeholder.`);
}

requireHttpsUrl("SUPABASE_URL", process.env.SUPABASE_URL?.trim());
requireHttpsUrl("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL?.trim());

if (process.env.PAYMENT_PROVIDER !== "stripe") {
  errors.push('PAYMENT_PROVIDER doit être exactement "stripe" en production.');
}

if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
  errors.push("SESSION_SECRET doit contenir au moins 32 caractères.");
}
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) {
  errors.push("CRON_SECRET doit contenir au moins 32 caractères.");
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith("NEXT_PUBLIC_")) {
  errors.push("SUPABASE_SERVICE_ROLE_KEY ne doit jamais être une variable publique.");
}

if (process.env.STRIPE_SECRET_KEY && !/^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY)) {
  errors.push("STRIPE_SECRET_KEY doit être une clé Stripe test ou live valide.");
}
if (process.env.STRIPE_WEBHOOK_SECRET && !/^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET)) {
  errors.push("STRIPE_WEBHOOK_SECRET doit commencer par whsec_.");
}
if (process.env.RESEND_API_KEY && !/^re_/.test(process.env.RESEND_API_KEY)) {
  errors.push("RESEND_API_KEY doit commencer par re_.");
}
if (process.env.RESEND_FROM_EMAIL && !/^\S+@\S+\.\S+$/.test(process.env.RESEND_FROM_EMAIL.replace(/^.*<|>.*$/g, "").trim())) {
  errors.push("RESEND_FROM_EMAIL doit contenir une adresse email valide.");
}
if (process.env.LEGAL_CONTENT_APPROVED !== "true") {
  errors.push("LEGAL_CONTENT_APPROVED doit être true après validation par la personne juridique responsable.");
}
if (process.env.LEGAL_CONTACT_EMAIL && !/^\S+@\S+\.\S+$/.test(process.env.LEGAL_CONTACT_EMAIL.trim())) {
  errors.push("LEGAL_CONTACT_EMAIL doit contenir une adresse email valide.");
}

if (errors.length) {
  console.error("Configuration de production incomplète :");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Configuration de production complète : secrets présents et paramètres cohérents.");
