import { canonicalSportSlug } from "@/lib/domain";

export type SearchFilters = {
  sport?: string;
  city?: string;
  latitude?: string;
  longitude?: string;
  radiusKm?: string;
  gender?: string;
  practice?: string;
  level?: string;
  format?: string;
  availability?: string;
  minRating?: string;
  maxPrice?: string;
};

const values = {
  gender: ["homme", "femme"],
  practice: ["interieur", "exterieur"],
  level: ["debutant", "intermediaire", "confirme"],
  format: ["presentiel", "visio"],
  availability: ["morning", "afternoon"],
} as const;

function preserveOrMarkInvalid(value: string | undefined, allowed: readonly string[]) {
  if (!value) return undefined;
  return allowed.includes(value) ? value : "__invalid__";
}

export function normalizeSearchFilters(input: SearchFilters): SearchFilters {
  return {
    ...input,
    sport: canonicalSportSlug(input.sport),
    city: input.city?.trim() || undefined,
    gender: preserveOrMarkInvalid(input.gender, values.gender),
    practice: preserveOrMarkInvalid(input.practice, values.practice),
    level: preserveOrMarkInvalid(input.level, values.level),
    format: preserveOrMarkInvalid(input.format, values.format),
    availability: preserveOrMarkInvalid(input.availability, values.availability),
  };
}
