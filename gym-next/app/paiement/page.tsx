import { ReservationProofBoundary } from "@/components/common/ReservationProofBoundary";
import { currentSession } from "@/lib/auth";
import type { Metadata } from "next";
import { PaiementLegacyPage } from "@/components/payment-legacy/PaiementLegacyPage";
import { ProductionUnavailable } from "@/components/common/ProductionUnavailable";
import { getBookingGate } from "@/lib/booking-gates";
import { buildCanonical, buildPageMetadata } from "@/lib/seo";

type PaiementPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PaiementPageProps): Promise<Metadata> {
  const params = await searchParams;
  const coachParam = params.coach;
  const sportParam = params.sport;
  const cityParam = params.city;
  const coach = Array.isArray(coachParam) ? coachParam[0] : coachParam;
  const sport = Array.isArray(sportParam) ? sportParam[0] : sportParam;
  const city = Array.isArray(cityParam) ? cityParam[0] : cityParam;

  return {
    ...buildPageMetadata({
      title: coach ? `Paiement - ${coach}` : "Paiement de la reservation",
      description: "Finalisez le paiement de votre reservation sportive sur GetYourMentor.",
    }),
    referrer: "no-referrer", robots: {index:false,follow:false},
    alternates: {
      canonical: buildCanonical("/paiement", { sport, city, coach }),
    },
  };
}

export default async function PaiementPage({ searchParams }: PaiementPageProps) {
  const params = await searchParams;
  const normalizedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  delete normalizedParams.claimToken;
  const gate = await getBookingGate(normalizedParams.coach);
  if (gate.mode === "unavailable" || (gate.mode === "production" && !normalizedParams.reservationId)) {
    return <ProductionUnavailable title="Paiement indisponible" description="Aucun paiement ne peut être présenté sans réservation réelle, coach vérifié et configuration de paiement active." />;
  }

  const session=await currentSession();
  return <ReservationProofBoundary key={normalizedParams.reservationId ?? "none"} id={normalizedParams.reservationId}><PaiementLegacyPage params={normalizedParams} provider={process.env.PAYMENT_PROVIDER === "stripe" ? "stripe" : "local"} athleteEmail={session?.role==="sportif"?session.email:undefined} /></ReservationProofBoundary>;
}
