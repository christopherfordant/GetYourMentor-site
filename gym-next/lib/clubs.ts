import { randomUUID } from "node:crypto";
import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";

export type ClubLead = {
  id: string;
  clubName: string;
  managerName: string;
  email: string;
  phone?: string;
  addressLabel?: string;
  latitude?: number;
  longitude?: number;
  ibanLast4?: string;
  logoFileName?: string;
  identityFileName?: string;
  createdAt: string;
  status: "pending" | "contacted" | "closed";
};

export type ClubLeadInput = Omit<ClubLead, "id" | "createdAt" | "status"> & {
  logoFile?: File;
  identityFile?: File;
};

export type ClubDocumentKind = "logo" | "identity";

const clubLeads: ClubLead[] = [];

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  assertDemoFallbackAllowed("Persistance des demandes club");
  return null;
}

function storageConfig() {
  const config = supabaseConfig();
  if (!config) return null;
  return { ...config, bucket: process.env.SUPABASE_CLUB_DOCUMENTS_BUCKET ?? "club-documents" };
}

function storageFileName(file: File, field: "logo" | "identity") {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "bin";
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "document";
  return `${field}-${baseName}.${extension}`;
}

async function uploadPrivateDocument(config: ReturnType<typeof storageConfig>, leadId: string, field: "logo" | "identity", file?: File) {
  if (!config || !file || file.size === 0) return undefined;
  const objectPath = `club-leads/${leadId}/${storageFileName(file, field)}`;
  const response = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: Buffer.from(await file.arrayBuffer()),
  });
  if (!response.ok) throw new Error(`Supabase club document upload error (${response.status})`);
  return objectPath;
}

async function removePrivateDocuments(config: ReturnType<typeof storageConfig>, paths: string[]) {
  if (!config || paths.length === 0) return;
  await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}`, {
    method: "DELETE",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => undefined);
}

export async function getClubLeadDocumentSignedUrl(id: string, kind: ClubDocumentKind, expiresIn = 300) {
  const config = storageConfig();
  if (!config) return null;
  const column = kind === "logo" ? "logo_storage_path" : "identity_storage_path";
  const leadResponse = await fetch(`${config.url}/rest/v1/gym_club_leads?id=eq.${encodeURIComponent(id)}&select=${column}&limit=1`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    cache: "no-store",
  });
  if (!leadResponse.ok) throw new Error(`Supabase club lead error (${leadResponse.status})`);
  const [row] = (await leadResponse.json()) as Record<string, unknown>[];
  const objectPath = typeof row?.[column] === "string" ? row[column] as string : "";
  if (!objectPath) return null;
  const signResponse = await fetch(`${config.url}/storage/v1/object/sign/${encodeURIComponent(config.bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`, {
    method: "POST",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
  });
  if (!signResponse.ok) throw new Error(`Supabase club document signing error (${signResponse.status})`);
  const payload = await signResponse.json() as { signedURL?: unknown };
  if (typeof payload.signedURL !== "string") throw new Error("Supabase signed URL missing");
  return payload.signedURL.startsWith("http") ? payload.signedURL : `${config.url}/storage/v1${payload.signedURL.startsWith("/") ? payload.signedURL : `/${payload.signedURL}`}`;
}

export async function deleteClubLeadDocument(id: string, kind: ClubDocumentKind) {
  const config = storageConfig();
  if (!config) return false;
  const column = kind === "logo" ? "logo_storage_path" : "identity_storage_path";
  const leadResponse = await fetch(`${config.url}/rest/v1/gym_club_leads?id=eq.${encodeURIComponent(id)}&select=${column}&limit=1`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
    cache: "no-store",
  });
  if (!leadResponse.ok) throw new Error(`Supabase club lead error (${leadResponse.status})`);
  const [row] = (await leadResponse.json()) as Record<string, unknown>[];
  const objectPath = typeof row?.[column] === "string" ? row[column] as string : "";
  if (!objectPath) return false;
  const deleteResponse = await fetch(`${config.url}/storage/v1/object/${encodeURIComponent(config.bucket)}`, {
    method: "DELETE",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }),
  });
  if (!deleteResponse.ok) throw new Error(`Supabase club document deletion error (${deleteResponse.status})`);
  const clearResponse = await fetch(`${config.url}/rest/v1/gym_club_leads?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ [column]: null }),
  });
  if (!clearResponse.ok) throw new Error(`Supabase club lead update error (${clearResponse.status})`);
  return true;
}

function fromRow(row: Record<string, unknown>): ClubLead {
  const status = row.status === "contacted" || row.status === "closed" ? row.status : "pending";
  return {
    id: String(row.id),
    clubName: String(row.club_name ?? ""),
    managerName: String(row.manager_name ?? ""),
    email: String(row.email ?? ""),
    phone: typeof row.phone === "string" ? row.phone : undefined,
    addressLabel: typeof row.address_label === "string" ? row.address_label : undefined,
    latitude: row.latitude == null ? undefined : Number(row.latitude),
    longitude: row.longitude == null ? undefined : Number(row.longitude),
    ibanLast4: typeof row.iban_last4 === "string" ? row.iban_last4 : undefined,
    logoFileName: typeof row.logo_file_name === "string" ? row.logo_file_name : undefined,
    identityFileName: typeof row.identity_file_name === "string" ? row.identity_file_name : undefined,
    createdAt: String(row.created_at ?? ""),
    status,
  };
}

export async function createClubLead(input: ClubLeadInput) {
  if (isHostedDemo() && !/^[^@\s]+@example\.com$/.test(input.email)) throw new Error("Utilisez une adresse fictive @example.com");
  const config = supabaseConfig();
  const storage = storageConfig();
  const lead: ClubLead = {
    clubName: input.clubName,
    managerName: input.managerName,
    email: input.email,
    phone: input.phone,
    addressLabel: input.addressLabel,
    latitude: input.latitude,
    longitude: input.longitude,
    ibanLast4: input.ibanLast4,
    logoFileName: input.logoFileName,
    identityFileName: input.identityFileName,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  if (config) {
    const uploadedPaths: string[] = [];
    try {
      const logoStoragePath = await uploadPrivateDocument(storage, lead.id, "logo", input.logoFile);
      if (logoStoragePath) uploadedPaths.push(logoStoragePath);
      const identityStoragePath = await uploadPrivateDocument(storage, lead.id, "identity", input.identityFile);
      if (identityStoragePath) uploadedPaths.push(identityStoragePath);
      const response = await fetch(`${config.url}/rest/v1/gym_club_leads`, {
        method: "POST",
        headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          id: lead.id,
          club_name: lead.clubName,
          manager_name: lead.managerName,
          email: lead.email,
          phone: lead.phone ?? null,
          address_label: lead.addressLabel ?? null,
          latitude: lead.latitude ?? null,
          longitude: lead.longitude ?? null,
          iban_last4: lead.ibanLast4 ?? null,
          logo_file_name: lead.logoFileName ?? null,
          identity_file_name: lead.identityFileName ?? null,
          logo_storage_path: logoStoragePath ?? null,
          identity_storage_path: identityStoragePath ?? null,
          created_at: lead.createdAt,
          status: lead.status,
        }),
      });
      if (!response.ok) throw new Error(`Supabase club lead error (${response.status})`);
      const [row] = (await response.json()) as Record<string, unknown>[];
      return row ? fromRow(row) : lead;
    } catch (error) {
      await removePrivateDocuments(storage, uploadedPaths);
      throw error;
    }
  }
  if (isHostedDemo()) return mutateDemoState((s) => { s.clubs.push(lead); return lead; });
  clubLeads.push(lead);
  return lead;
}

export async function listClubLeads() {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/rest/v1/gym_club_leads?select=*&order=created_at.desc`, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Supabase club lead error (${response.status})`);
    return ((await response.json()) as Record<string, unknown>[]).map(fromRow);
  }
  return isHostedDemo() ? (await readDemoState()).clubs : [...clubLeads];
}

export async function getClubLeadForEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(
      `${config.url}/rest/v1/gym_club_leads?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,club_name,manager_name,email,phone,address_label,latitude,longitude,logo_file_name,identity_file_name,status,created_at&order=created_at.desc&limit=1`,
      { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: "no-store" },
    );
    if (!response.ok) throw new Error(`Supabase club lead error (${response.status})`);
    const [row] = (await response.json()) as Record<string, unknown>[];
    return row ? fromRow(row) : null;
  }
  return [...(isHostedDemo() ? (await readDemoState()).clubs : clubLeads)]
    .reverse()
    .find((lead) => lead.email.trim().toLowerCase() === normalizedEmail) ?? null;
}

export async function updateClubLeadStatus(id: string, status: ClubLead["status"]) {
  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/rest/v1/gym_club_leads?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error(`Supabase club lead error (${response.status})`);
    const [row] = (await response.json()) as Record<string, unknown>[];
    return row ? fromRow(row) : null;
  }
  if (isHostedDemo()) return mutateDemoState((s) => { const lead = s.clubs.find((l) => l.id === id); if (!lead) return null; lead.status = status; return lead; });
  const lead = clubLeads.find((entry) => entry.id === id);
  if (!lead) return null;
  lead.status = status;
  return { ...lead };
}
