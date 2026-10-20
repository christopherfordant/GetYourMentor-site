import { canonicalSportSlug } from "@/lib/domain";
export type SessionFilters = { sport: string; city: string; source: string; participants: number };
export type DiscoverableSession = {
  sport?: string; city?: string; source?: string; capacity?: number; slots: string[];
  availability?: Array<{ slot: string; remaining: number }>;
  individualPrice?: number; groupPrices?: Array<{ participantCount: number; totalCents: number }>;
};
const sports = new Set(["football", "basketball", "metiers-de-la-forme", "sports-de-combat"]);
const canonicalSports = new Set([...sports].map(sport => canonicalSportSlug(sport)));
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export function parseSessionFilters(params: URLSearchParams): SessionFilters {
  const value = params.get("sport") ?? "", sport = value === "fitness" ? "metiers-de-la-forme" : value, source = params.get("source") ?? "";
  const size = Number(params.get("participants") ?? 1);
  return { sport: sports.has(sport) ? sport : "", city: (params.get("city") ?? "").trim().slice(0, 120), source: ["coach", "structure"].includes(source) ? source : "", participants: Number.isInteger(size) && size >= 1 && size <= 50 ? size : 1 };
}

export function matchesSession(offer: DiscoverableSession, filters: SessionFilters, now = Date.now()) {
  const sport = canonicalSportSlug(offer.sport);
  if (!canonicalSports.has(sport)) return false;
  if (filters.sport && sport !== canonicalSportSlug(filters.sport)) return false;
  if (filters.city && !normalize(offer.city ?? "").includes(normalize(filters.city))) return false;
  if (filters.source && (offer.source ?? "structure") !== filters.source) return false;
  const price = filters.participants === 1 ? offer.individualPrice : (offer.groupPrices?.find(p => p.participantCount === filters.participants)?.totalCents ?? NaN) / 100;
  if (!Number.isFinite(price) || price! <= 0) return false;
  return offer.slots.some(slot => Date.parse(slot) > now && (offer.availability?.find(a => a.slot === slot)?.remaining ?? offer.capacity ?? 1) >= filters.participants);
}
