import { NextResponse } from "next/server";
import { createClubLead } from "@/lib/clubs";
import { bodyExceedsLimit, rateLimit, textExceedsLimit } from "@/lib/request-guards";
import { isHostedDemo } from "@/lib/runtime";

export async function POST(request: Request) {
  const limit = rateLimit(request, "club-lead", 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Trop de demandes, réessayez plus tard" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  if (bodyExceedsLimit(request, 6 * 1024 * 1024)) return NextResponse.json({ error: "Fichiers trop volumineux" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formulaire invalide" }, { status: 400 });

  const clubName = String(form.get("clubName") ?? "").trim();
  const managerName = String(form.get("managerName") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const addressLabel = String(form.get("addressLabel") ?? "").trim();
  const latitudeValue = String(form.get("latitude") ?? "").trim();
  const longitudeValue = String(form.get("longitude") ?? "").trim();
  const latitude = latitudeValue === "" ? undefined : Number(latitudeValue);
  const longitude = longitudeValue === "" ? undefined : Number(longitudeValue);
  const ibanInput = String(form.get("iban") ?? "").replace(/\s+/g, "").toUpperCase();
  const ibanLast4 = ibanInput.length >= 4 ? ibanInput.slice(-4) : undefined;
  const logo = form.get("logo");
  const identity = form.get("identity");
  const fileNames = [logo, identity]
    .filter((file): file is File => file instanceof File)
    .map((file) => file.name);
  if (
    [clubName, managerName, email, phone, addressLabel, ibanInput, ...fileNames].some((value) =>
      textExceedsLimit(value, 512),
    )
  ) {
    return NextResponse.json({ error: "Données du formulaire trop longues" }, { status: 400 });
  }
  if ([logo, identity].some((file) => file instanceof File && file.size > 5 * 1024 * 1024)) {
    return NextResponse.json({ error: "Fichier trop volumineux" }, { status: 413 });
  }
  if (logo instanceof File && logo.size > 0 && !["image/jpeg", "image/png", "image/webp"].includes(logo.type)) {
    return NextResponse.json({ error: "Le logo doit être une image" }, { status: 400 });
  }
  if (identity instanceof File && identity.size > 0 && !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(identity.type)) {
    return NextResponse.json({ error: "La pièce d’identité doit être un PDF ou une image" }, { status: 400 });
  }

  if (!clubName || !managerName || !email) {
    return NextResponse.json({ error: "Le club, le responsable et l’adresse mail sont requis" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Adresse mail invalide" }, { status: 400 });
  }
  if (isHostedDemo() && !/^[^@\s]+@example\.com$/.test(email)) return NextResponse.json({ error: "Mode démonstration : utilisez une adresse fictive @example.com" }, { status: 400 });
  if ((latitude !== undefined && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== undefined && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180))) {
    return NextResponse.json({ error: "Coordonnées de localisation invalides" }, { status: 400 });
  }

  let lead: Awaited<ReturnType<typeof createClubLead>>;
  try {
    lead = await createClubLead({
      clubName,
      managerName,
      email,
      phone: phone || undefined,
      addressLabel: addressLabel || undefined,
      latitude,
      longitude,
      ibanLast4,
      logoFileName: logo instanceof File && logo.size > 0 ? logo.name : undefined,
      identityFileName: identity instanceof File && identity.size > 0 ? identity.name : undefined,
      logoFile: logo instanceof File && logo.size > 0 ? logo : undefined,
      identityFile: identity instanceof File && identity.size > 0 ? identity : undefined,
    });
  } catch {
    return NextResponse.json({ error: "La demande ne peut pas être stockée pour le moment" }, { status: 503 });
  }

  return NextResponse.json({ data: lead }, { status: 201 });
}
