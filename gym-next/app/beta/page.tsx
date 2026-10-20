import { DiscoveryFrame, DiscoveryIntro } from "@/components/discovery/DiscoveryFrame";
import { currentSession } from "@/lib/auth";
import { feedbackEnabled } from "@/lib/feedback";
import { BetaFeedback } from "@/components/BetaFeedback";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Retours bêta", robots: { index: false, follow: false } };
export default async function BetaPage() {
  if (!feedbackEnabled()) notFound();
  const session = await currentSession();
  return <DiscoveryFrame page="directory" demo><main className="de-main">
    <DiscoveryIntro step="CONSTRUISONS LA SUITE ENSEMBLE" title="Ton expérience compte.">Une idée, un problème ou un point positif ? Partage ton retour et retrouve son état ici.</DiscoveryIntro>
    <p><a href="/compte">Retour à mon compte</a></p>
    {session ? <BetaFeedback admin={session.role === "admin"} /> : <p>Connecte-toi pour partager un retour et découvrir les suggestions des membres. <a href="/compte?next=%2Fbeta">Se connecter</a></p>}
  </main></DiscoveryFrame>;
}
