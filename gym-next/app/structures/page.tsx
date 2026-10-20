import { DiscoveryFrame } from "@/components/discovery/DiscoveryFrame";
import { StructureOffers } from "@/components/StructureOffers";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Séances des structures", robots: { index: false, follow: false } };
export default function StructuresPage() {
  if (!isDemoFallbackAllowed()) notFound();
  return <DiscoveryFrame page="slot" demo><main style={{ maxWidth: 960, margin: "32px auto", padding: 24 }}><h1>Séances proposées par les structures</h1><p>L’élève réserve, le coach accepte la demande puis l’élève paie. La structure suit le planning. Les paiements de cette démonstration sont simulés.</p><p><a href="/seances?source=structure">Filtrer les s?ances</a> ? <a href="/compte">Mon compte</a> · <a href="/">Accueil</a></p><StructureOffers /></main></DiscoveryFrame>;
}
