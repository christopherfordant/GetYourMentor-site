import fs from "node:fs";
import path from "node:path";

const staticDir = path.join(process.cwd(), ".next", "static");
const forbiddenMarkers = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "SESSION_SECRET",
];

if (!fs.existsSync(staticDir)) {
  console.error("Artefacts client absents : lancez d'abord npm run build.");
  process.exit(1);
}

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(entryPath) : [entryPath];
  });
}

const leaks = [];
for (const filePath of filesIn(staticDir)) {
  const content = fs.readFileSync(filePath, "utf8");
  for (const marker of forbiddenMarkers) {
    if (content.includes(marker)) leaks.push(`${marker} dans ${path.relative(process.cwd(), filePath)}`);
  }
}

if (leaks.length) {
  console.error("Secret serveur détecté dans un artefact client :");
  for (const leak of leaks) console.error(`- ${leak}`);
  process.exit(1);
}

console.log("Frontière client/serveur valide : aucun marqueur de secret serveur dans .next/static.");
