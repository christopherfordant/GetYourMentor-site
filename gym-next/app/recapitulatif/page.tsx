import type { Metadata } from "next";
import "../gym-booking-design.css";
import { RecapitulatifReservationLegacyPage } from "@/components/reservation-legacy/RecapitulatifReservationLegacyPage";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { buildCanonical, buildPageMetadata } from "@/lib/seo";
export const metadata: Metadata = {
  ...buildPageMetadata({title:"Récapitulatif de réservation",description:"Consultez les informations enregistrées et le suivi de votre demande."}),
  alternates:{canonical:buildCanonical("/recapitulatif")},robots:{index:false,follow:false},referrer:"no-referrer",
};
export default async function RecapitulatifPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;const id=Array.isArray(params.reservationId)?params.reservationId[0]:params.reservationId;
  // No commercial query value or private proof serialized into component props/metadata.
  return <RecapitulatifReservationLegacyPage demo={isDemoFallbackAllowed()} params={{reservationId:id}} />;
}
