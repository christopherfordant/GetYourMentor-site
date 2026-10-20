import type { Metadata } from "next";
import { SelectionCoachsLegacyPage } from "@/components/directory-legacy/SelectionCoachsLegacyPage";
import { filterStoredCoaches } from "@/lib/coaches";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { buildCanonical, buildPageMetadata, getSportLabel } from "@/lib/seo";

type CoachsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: CoachsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const sportParam = params.sport;
  const cityParam = params.city;
  const sport = Array.isArray(sportParam) ? sportParam[0] : sportParam;
  const city = Array.isArray(cityParam) ? cityParam[0] : cityParam;
  const sportLabel = getSportLabel(sport);
  const title = city ? `Coachs ${sportLabel} a ${city}` : `Liste des coachs ${sportLabel}`;

  return {
    ...buildPageMetadata({
      title,
      description: city
        ? `Consultez les coachs de ${sportLabel} disponibles a ${city}, comparez les profils et ouvrez la fiche detaillee.`
        : `Consultez les coachs de ${sportLabel} disponibles sur GetYourMentor.`,
    }),
    alternates: {
      canonical: buildCanonical("/coachs", { sport, city }),
    },
  };
}

export default async function CoachsPage({ searchParams }: CoachsPageProps) {
  const params = await searchParams;
  const sportParam = params.sport;
  const cityParam = params.city;
  const latitudeParam = params.latitude;
  const longitudeParam = params.longitude;
  const radiusParam = params.radiusKm;
  const genderParam = params.gender;
  const practiceParam = params.practice;
  const levelParam = params.level;
  const formatParam = params.format;
  const availabilityParam = params.availability;
  const minRatingParam = params.minRating;
  const maxPriceParam = params.maxPrice;

  const sport = Array.isArray(sportParam) ? sportParam[0] : sportParam;
  const city = Array.isArray(cityParam) ? cityParam[0] : cityParam;
  const latitude = Array.isArray(latitudeParam) ? latitudeParam[0] : latitudeParam;
  const longitude = Array.isArray(longitudeParam) ? longitudeParam[0] : longitudeParam;
  const radiusKm = Array.isArray(radiusParam) ? radiusParam[0] : radiusParam;
  const gender = Array.isArray(genderParam) ? genderParam[0] : genderParam;
  const practice = Array.isArray(practiceParam) ? practiceParam[0] : practiceParam;
  const level = Array.isArray(levelParam) ? levelParam[0] : levelParam;
  const format = Array.isArray(formatParam) ? formatParam[0] : formatParam;
  const availability = Array.isArray(availabilityParam) ? availabilityParam[0] : availabilityParam;
  const minRating = Array.isArray(minRatingParam) ? minRatingParam[0] : minRatingParam;
  const maxPrice = Array.isArray(maxPriceParam) ? maxPriceParam[0] : maxPriceParam;

  const hasPersistentCoachCatalog = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const demoAllowed = isDemoFallbackAllowed();
  let catalogUnavailable = !hasPersistentCoachCatalog && !demoAllowed;
  let persistedCoaches: Awaited<ReturnType<typeof filterStoredCoaches>> = [];
  if (!catalogUnavailable) {
    try {
      persistedCoaches = await filterStoredCoaches({ sport, city, latitude, longitude, radiusKm, gender, practice, level, format, availability, minRating, maxPrice });
    } catch {
      catalogUnavailable = true;
    }
  }
  const initialCoaches = persistedCoaches?.map((coach) => ({
    id: coach.id,
    name: coach.name,
    address: coach.city || city || "Zone à confirmer",
    city: coach.city || city,
    meta: `${coach.rating.toFixed(1)} (${coach.reviewCount} avis) · ${coach.specialty}`,
    morning: [],
    afternoon: [],
    cta: "Voir le profil",
    price: coach.priceFrom,
    rating: coach.rating,
    verified: coach.verified,
    distanceKm: coach.distanceKm,
    format: coach.sessionTypes?.toLowerCase().includes("visio") ? ("visio" as const) : undefined,
    gender: coach.gender,
    practice: coach.practice,
    level: coach.level,
    availability: coach.availabilityTags?.[0],
  }));

  return <SelectionCoachsLegacyPage key={`${sport ?? "football"}:${city ?? "Paris"}`} sport={sport} city={city} initialCoaches={initialCoaches} demo={demoAllowed} catalogUnavailable={catalogUnavailable} />;
}
