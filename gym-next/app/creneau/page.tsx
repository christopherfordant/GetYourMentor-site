import { getCoach } from "@/lib/coaches";
import type { Metadata } from "next";
import "../gym-booking-design.css";
import { ChoixCoachCreneauLegacyPage } from "@/components/reservation-legacy/ChoixCoachCreneauLegacyPage";
import { ProductionUnavailable } from "@/components/common/ProductionUnavailable";
import { getBookingGate } from "@/lib/booking-gates";
import { buildCanonical, buildPageMetadata } from "@/lib/seo";

type CreneauPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: CreneauPageProps): Promise<Metadata> {
  const params = await searchParams;
  const coachParam = params.coach;
  const sportParam = params.sport;
  const cityParam = params.city;
  const coach = Array.isArray(coachParam) ? coachParam[0] : coachParam;
  const sport = Array.isArray(sportParam) ? sportParam[0] : sportParam;
  const city = Array.isArray(cityParam) ? cityParam[0] : cityParam;

  return {
    ...buildPageMetadata({
      title: coach ? `Choix du creneau - ${coach}` : "Choix du creneau",
      description: "Choisissez un creneau disponible avant de confirmer votre reservation sur GetYourMentor.",
    }),
    alternates: {
      canonical: buildCanonical("/creneau", { sport, city, coach }),
    },
  };
}

export default async function CreneauPage({ searchParams }: CreneauPageProps) {
  const params = await searchParams;
  const normalizedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  const gate = await getBookingGate(normalizedParams.coach);
  if (gate.mode === "unavailable") {
    return <ProductionUnavailable title="Créneau indisponible" description="Ce calendrier sera affiché dès qu’un coach vérifié et ses disponibilités réelles seront configurés." />;
  }

  const profile = gate.coach ?? await getCoach(normalizedParams.coach ?? "coach-demo-01");
  if (!profile?.verified) return <ProductionUnavailable title="Coach indisponible" description="Choisissez un coach disponible depuis la recherche." />;
  return <ChoixCoachCreneauLegacyPage key={profile.id} calendarNow={Date.now()} demo={gate.mode === "demo"} params={{ ...normalizedParams, coachId: profile.id, coach: profile.name, city: profile.city, sport: profile.sport, price: String(profile.priceFrom), service: normalizedParams.service || profile.specialty }} />;
}
