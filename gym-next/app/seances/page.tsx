import { DiscoveryFrame, DiscoveryIntro } from "@/components/discovery/DiscoveryFrame";
import { StructureOffers } from "@/components/StructureOffers";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trouver une séance collective", description: "Découvrez les séances proposées par les coachs et les structures, leurs créneaux et les places disponibles.", alternates: { canonical: "/seances" }, robots: { index: false, follow: false } };

export default async function SessionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isDemoFallbackAllowed() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) notFound();
  const params = await searchParams;
  return <DiscoveryFrame page="directory" demo><main className="de-main">
    <DiscoveryIntro step="TON SPORT, TON GROUPE" title="Trouve ta prochaine séance collective">Compare les séances des coachs et des structures. Le coach accepte ta demande avant tout paiement simulé.</DiscoveryIntro>
    <p><a href="/recherche">Rechercher un coach</a> · <a href="/structures">Séances des structures</a></p>
    <StructureOffers discovery key={JSON.stringify(params)} />
  </main></DiscoveryFrame>;
}
