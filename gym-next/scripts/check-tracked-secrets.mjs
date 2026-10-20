import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = path.resolve(process.cwd(), "..");
const trackedFiles = execFileSync("git", ["-C", repoRoot, "ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const allowedTemplates = new Set([
  "gym-next/.env.example",
]);
const sensitiveFilePattern = /(^|\/)(\.env(\..*)?|.*\.(pem|key|p12|pfx))$/i;
const placeholderPattern = /(demo|example|replace|placeholder|your[-_]|test[-_]?secret|replaceme)/i;
const highConfidencePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk_live_[A-Za-z0-9]{12,}/,
  /(?:STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET)\s*[:=]\s*["']?(sk_(?:test|live)_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{20,})/,
  /RESEND_API_KEY\s*[:=]\s*["']?re_[A-Za-z0-9]{20,}/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?eyJ[A-Za-z0-9_-]{30,}/,
];

const findings = [];
for (const relativePath of trackedFiles) {
  if (allowedTemplates.has(relativePath)) continue;
  if (sensitiveFilePattern.test(relativePath)) {
    findings.push(`${relativePath} : fichier sensible suivi par Git`);
    continue;
  }

  const absolutePath = path.join(repoRoot, relativePath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    continue;
  }

  for (const pattern of highConfidencePatterns) {
    const matches = content.match(pattern);
    if (!matches) continue;
    if (placeholderPattern.test(matches[0])) continue;
    findings.push(`${relativePath} : motif de secret potentiel détecté`);
    break;
  }
}

if (findings.length) {
  console.error("Secret ou fichier sensible détecté dans les fichiers suivis par Git :");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Dépôt propre : aucun secret à haute confiance ni fichier sensible suivi par Git.");
