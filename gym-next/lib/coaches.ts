import { coachIdForName, coachProfiles, createCoachProfile, setCoachVerification, updateCoachProfile, type CoachProfile } from "@/lib/domain";
import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";
import { supabaseHeaders } from "@/lib/supabase";
import { distanceKm, isWithinCoachServiceRadius, parseCoordinates, normalizeRadiusKm, type Coordinates } from "@/lib/location";
import { normalizeSearchFilters, type SearchFilters } from "@/lib/domain/validation/search-filters";
import { withReviewStats } from "@/lib/domain/review-rules";
import { listReviews } from "@/lib/reviews";
import { listReservations } from "@/lib/reservations";

export type PublicCoachProfile = Omit<CoachProfile, "bankAccountLast4" | "latitude" | "longitude"> & { distanceKm?: number };
export type CoachDocumentKind = "identity" | "diploma";

export function toPublicCoach(coach: CoachProfile & { distanceKm?: number }): PublicCoachProfile {
  const publicCoach = { ...coach } as PublicCoachProfile & { bankAccountLast4?: string; latitude?: number; longitude?: number };
  delete publicCoach.bankAccountLast4;
  delete publicCoach.latitude;
  delete publicCoach.longitude;
  return publicCoach;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  assertDemoFallbackAllowed("Supabase Coaches");
  return null;
}

function coachStorageConfig() {
  const config = supabaseConfig();
  if (!config) return null;
  return { ...config, bucket: process.env.SUPABASE_COACH_DOCUMENTS_BUCKET ?? "coach-documents" };
}

function coachDocumentName(file: File, kind: CoachDocumentKind) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
}

function coachDocumentColumn(kind: CoachDocumentKind, path = false) {
  return kind === "identity" ? (path ? "identity_storage_path" : "identity_file_name") : (path ? "diploma_storage_path" : "diploma_file_name");
}

async function uploadCoachDocument(config: ReturnType<typeof coachStorageConfig>, coachId: string, kind: CoachDocumentKind, file: File) {
  if (!config) return null;
  const objectPath = `coaches/${encodeURIComponent(coachId)}/${coachDocumentName(file, kind)}`;
  const response = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!response.ok) throw new Error(`Supabase coach document upload error (${response.status})`);
  return objectPath;
}

async function deleteCoachStorageObject(config: ReturnType<typeof coachStorageConfig>, objectPath: string) {
  if (!config || !objectPath) return;
  await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}`, {
    method: "DELETE",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }),
  });
}

export async function saveCoachDocument(id: string, kind: CoachDocumentKind, file: File) {
  const config = coachStorageConfig();
  if (!config) return null;
  const pathColumn = coachDocumentColumn(kind, true);
  const nameColumn = coachDocumentColumn(kind);
  const previousResponse = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}&select=${pathColumn}&limit=1`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: "no-store",
  });
  if (!previousResponse.ok) throw new Error(`Supabase coach lookup error (${previousResponse.status})`);
  const [previous] = await previousResponse.json() as Array<Record<string, unknown>>;
  const objectPath = await uploadCoachDocument(config, id, kind, file);
  if (!objectPath) return null;
  const updateResponse = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ [pathColumn]: objectPath, [nameColumn]: file.name, verification_status: "pending", verified: false, verified_at: null }),
  });
  if (!updateResponse.ok) {
    await deleteCoachStorageObject(config, objectPath);
    throw new Error(`Supabase coach document metadata error (${updateResponse.status})`);
  }
  const previousPath = typeof previous?.[pathColumn] === "string" ? previous[pathColumn] as string : "";
  if (previousPath) await deleteCoachStorageObject(config, previousPath);
  return { kind, fileName: file.name };
}

export async function getCoachDocumentSignedUrl(id: string, kind: CoachDocumentKind, expiresIn = 300) {
  const config = coachStorageConfig();
  if (!config) return null;
  const pathColumn = coachDocumentColumn(kind, true);
  const response = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}&select=${pathColumn}&limit=1`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase coach lookup error (${response.status})`);
  const [row] = await response.json() as Array<Record<string, unknown>>;
  const objectPath = typeof row?.[pathColumn] === "string" ? row[pathColumn] as string : "";
  if (!objectPath) return null;
  const signResponse = await fetch(`${config.url}/storage/v1/object/sign/${encodeURIComponent(config.bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!signResponse.ok) throw new Error(`Supabase coach document signing error (${signResponse.status})`);
  const payload = await signResponse.json() as { signedURL?: unknown };
  if (typeof payload.signedURL !== "string") throw new Error("Supabase signed URL missing");
  return payload.signedURL.startsWith("http") ? payload.signedURL : `${config.url}/storage/v1${payload.signedURL.startsWith("/") ? payload.signedURL : `/${payload.signedURL}`}`;
}

export async function deleteCoachDocument(id: string, kind: CoachDocumentKind) {
  const config = coachStorageConfig();
  if (!config) return false;
  const pathColumn = coachDocumentColumn(kind, true);
  const nameColumn = coachDocumentColumn(kind);
  const response = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}&select=${pathColumn}&limit=1`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase coach lookup error (${response.status})`);
  const [row] = await response.json() as Array<Record<string, unknown>>;
  const objectPath = typeof row?.[pathColumn] === "string" ? row[pathColumn] as string : "";
  if (!objectPath) return false;
  await deleteCoachStorageObject(config, objectPath);
  const clearResponse = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ [pathColumn]: null, [nameColumn]: null, verification_status: "pending", verified: false, verified_at: null }),
  });
  if (!clearResponse.ok) throw new Error(`Supabase coach metadata error (${clearResponse.status})`);
  return true;
}

function fromRow(row: Record<string, unknown>): CoachProfile {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    sport: row.sport as CoachProfile["sport"],
    specialty: String(row.specialty ?? ""),
    city: String(row.city ?? ""),
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    priceFrom: Number(row.price_from ?? 0),
    verified: Boolean(row.verified),
    verificationStatus: row.verification_status === "approved" || row.verification_status === "rejected" ? row.verification_status : "pending",
    description: String(row.description ?? ""),
    disciplines: String(row.disciplines ?? ""),
    diplomas: String(row.diplomas ?? ""),
    sessionTypes: String(row.session_types ?? ""),
    availability: String(row.availability ?? ""),
    photoUrl: String(row.photo_url ?? ""),
    bankAccountLast4: String(row.bank_account_last4 ?? ""),
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    serviceRadiusKm: row.service_radius_km == null ? undefined : Number(row.service_radius_km),
    gender: row.gender === "homme" || row.gender === "femme" ? row.gender : undefined,
    practice: row.practice === "interieur" || row.practice === "exterieur" ? row.practice : undefined,
    level: row.level === "debutant" || row.level === "intermediaire" || row.level === "confirme" ? row.level : undefined,
    format: row.session_format === "presentiel" || row.session_format === "visio" ? row.session_format : undefined,
    availabilityTags: Array.isArray(row.availability_tags) ? row.availability_tags.filter((value): value is "morning" | "afternoon" => value === "morning" || value === "afternoon") : undefined,
  };
}

export async function listCoaches() {
  const config = supabaseConfig();
  if (!config) {
    if (isHostedDemo()) { const state = await readDemoState(); return withReviewStats(state.coaches, state.reviews, state.reservations); }
    return withReviewStats(coachProfiles, await listReviews(), await listReservations());
  }
  const response = await fetch(`${config.url}/rest/v1/gym_coaches?select=*&order=name.asc`, {
    headers: supabaseHeaders(config.key),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    console.error("[supabase] gym_coaches list failed", response.status, details);
    throw new Error(`Supabase coach error (${response.status})`);
  }
  const rows = (await response.json()) as Record<string, unknown>[];
  return rows.map(fromRow);
}

export async function getCoach(idOrName?: string) {
  const config = supabaseConfig();
  if (!config) {
    const coaches = await listCoaches();
    const normalized = decodeURIComponent(idOrName ?? "").toLowerCase();
    return idOrName ? coaches.find((c) => c.id === normalized || c.name.toLowerCase() === normalized) ?? null : coaches[0] ?? null;
  }
  const normalized = decodeURIComponent(idOrName ?? "");
  const response = await fetch(`${config.url}/rest/v1/gym_coaches?select=*&or=(id.eq.${encodeURIComponent(normalized)},name.ilike.*${encodeURIComponent(normalized)}*)&limit=1`, {
    headers: supabaseHeaders(config.key),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    console.error("[supabase] gym_coaches lookup failed", response.status, details);
    throw new Error(`Supabase coach error (${response.status})`);
  }
  const [row] = (await response.json()) as Record<string, unknown>[];
  return row ? fromRow(row) : null;
}

export async function updateCoach(id: string, updates: Partial<Pick<CoachProfile, "specialty" | "city" | "priceFrom" | "description" | "disciplines" | "diplomas" | "sessionTypes" | "availability" | "photoUrl" | "bankAccountLast4" | "serviceRadiusKm" | "gender" | "practice" | "level" | "format" | "availabilityTags" | "groupPrices">> & { latitude?: number | null; longitude?: number | null }) {
  const config = supabaseConfig();
  if (!config) {
    if (isHostedDemo()) return mutateDemoState((s) => {
      const coach = s.coaches.find((c) => c.id === id); if (!coach) return null;
      Object.assign(coach, updates); return coach;
    });
    return updateCoachProfile(id, updates);
  }
  const body = Object.fromEntries(Object.entries(updates).map(([key, value]) => [
    key === "priceFrom" ? "price_from" : key === "sessionTypes" ? "session_types" : key === "photoUrl" ? "photo_url" : key === "bankAccountLast4" ? "bank_account_last4" : key === "serviceRadiusKm" ? "service_radius_km" : key === "format" ? "session_format" : key === "availabilityTags" ? "availability_tags" : key,
    value,
  ]));
  const response = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase coach error (${response.status})`);
  const [row] = (await response.json()) as Record<string, unknown>[];
  return row ? fromRow(row) : null;
}

export async function createStoredCoachProfile(input: { name: string; id?: string; city?: string }) {
  const localProfile = createCoachProfile({ ...input, id: input.id ?? coachIdForName(input.name) });
  const config = supabaseConfig();
  if (!config) return localProfile;
  const response = await fetch(`${config.url}/rest/v1/gym_coaches`, {
    method: "POST",
    headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "return=representation,resolution=merge-duplicates" }),
    body: JSON.stringify({
      id: localProfile.id,
      name: localProfile.name,
      sport: localProfile.sport,
      specialty: localProfile.specialty,
      city: localProfile.city,
      rating: localProfile.rating,
      review_count: localProfile.reviewCount,
      price_from: localProfile.priceFrom,
      verified: localProfile.verified,
      description: localProfile.description,
      disciplines: localProfile.disciplines,
      diplomas: localProfile.diplomas,
      session_types: localProfile.sessionTypes,
      availability: localProfile.availability,
      photo_url: localProfile.photoUrl,
      bank_account_last4: localProfile.bankAccountLast4,
      gender: localProfile.gender ?? null,
      practice: localProfile.practice ?? null,
      level: localProfile.level ?? null,
      session_format: localProfile.format ?? null,
      availability_tags: localProfile.availabilityTags ?? [],
    }),
  });
  if (!response.ok) throw new Error(`Supabase coach error (${response.status})`);
  const [row] = (await response.json()) as Record<string, unknown>[];
  return row ? fromRow(row) : localProfile;
}

export async function setStoredCoachVerification(id: string, verified: boolean) {
  const config = supabaseConfig();
  if (!config) {
    if (isHostedDemo()) return mutateDemoState((s) => {
      const coach = s.coaches.find((c) => c.id === id); if (!coach) return null;
      coach.verified = verified; coach.verificationStatus = verified ? "approved" : "pending"; return coach;
    });
    return setCoachVerification(id, verified);
  }
  const response = await fetch(`${config.url}/rest/v1/gym_coaches?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: supabaseHeaders(config.key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ verified, verification_status: verified ? "approved" : "rejected", verified_at: verified ? new Date().toISOString() : null }),
  });
  if (!response.ok) throw new Error(`Supabase coach error (${response.status})`);
  const [row] = (await response.json()) as Record<string, unknown>[];
  return row ? fromRow(row) : null;
}

export async function filterStoredCoaches(filters: SearchFilters) {
  const normalizedFilters = normalizeSearchFilters(filters);
  const coaches = await listCoaches();
  const origin = parseCoordinates(normalizedFilters.latitude, normalizedFilters.longitude);
  const radiusKm = normalizeRadiusKm(normalizedFilters.radiusKm);
  const canonicalSport = normalizedFilters.sport;
  return coaches
    .map((coach) => ({ ...coach, ...(origin && coach.latitude != null && coach.longitude != null ? { distanceKm: distanceKm(origin, { latitude: coach.latitude, longitude: coach.longitude }) } : {}) }))
    .filter((coach) => coach.verified
      && (!canonicalSport || coach.sport === canonicalSport)
      && (!normalizedFilters.city || coach.city.toLowerCase() === normalizedFilters.city.toLowerCase())
      && (!origin || isWithinCoachServiceRadius(coach.distanceKm, radiusKm, coach.serviceRadiusKm))
      && (!normalizedFilters.gender || coach.gender === normalizedFilters.gender)
      && (!normalizedFilters.practice || coach.practice === normalizedFilters.practice)
      && (!normalizedFilters.level || coach.level === normalizedFilters.level)
      && (!normalizedFilters.format || coach.format === normalizedFilters.format)
      && (!normalizedFilters.availability || coach.availabilityTags?.includes(normalizedFilters.availability as "morning" | "afternoon"))
      && (!normalizedFilters.minRating || coach.rating >= Number(normalizedFilters.minRating))
      && (!normalizedFilters.maxPrice || coach.priceFrom <= Number(normalizedFilters.maxPrice)))
    .sort((first, second) => (first.distanceKm ?? Number.POSITIVE_INFINITY) - (second.distanceKm ?? Number.POSITIVE_INFINITY));
}
