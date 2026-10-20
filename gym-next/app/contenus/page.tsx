import { DiscoveryFrame, DiscoveryIntro } from "@/components/discovery/DiscoveryFrame";
import { ContentExplorer } from "@/components/ContentExplorer";
import { currentSession } from "@/lib/auth";
import { demoContentsEnabled } from "@/lib/demo-contents";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export const metadata={title:"Contenus et bibliothèque de démonstration",robots:{index:false,follow:false}};
export default async function ContentsPage(){if(!demoContentsEnabled())notFound();const session=await currentSession();return <DiscoveryFrame page="directory" demo><main className="de-main"><DiscoveryIntro step="RESSOURCES DES COACHS" title="Le bon contenu. Au bon endroit.">Explore les ressources de démonstration et retrouve tes accès personnels. Aucun paiement réel.</DiscoveryIntro><p><a href="/compte">Retour à mon compte</a></p><ContentExplorer connected={Boolean(session)}/></main></DiscoveryFrame>;}
