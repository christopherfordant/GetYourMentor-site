import { DiscoveryFrame, DiscoveryIntro } from "@/components/discovery/DiscoveryFrame";
import { OfferExplorer } from "@/components/OfferExplorer";
import { currentSession } from "@/lib/auth";
import { offerPreviewsEnabled } from "@/lib/offer-previews";
import { notFound } from "next/navigation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Offres et aperçu de démonstration", robots: { index: false, follow: false } };
export default async function OffersPage() {
  if (!offerPreviewsEnabled()) notFound();
  const session = await currentSession();
  return <DiscoveryFrame page="directory" demo><main className="de-main">
    <DiscoveryIntro step="LE BON CADRE POUR CHAQUE PROFIL" title="Compare les offres prévues.">Les abonnements ne sont pas ouverts à la souscription. Explore un aperçu sans paiement ni activation d’avantages.</DiscoveryIntro>
    <p><a href="/compte">Retour à mon compte</a></p><OfferExplorer connected={Boolean(session)} />
  </main></DiscoveryFrame>;
}
