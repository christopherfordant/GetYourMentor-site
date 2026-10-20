import { DiscoveryFrame,DiscoveryIntro } from "@/components/discovery/DiscoveryFrame";
import { PersonalProgress } from "@/components/PersonalProgress";
import { currentSession } from "@/lib/auth";
import { isIsolatedDemoFeatureEnabled } from "@/lib/runtime";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export const metadata={title:"Mon suivi personnel de démonstration",robots:{index:false,follow:false}};
export default async function ProgressPage(){if(!isIsolatedDemoFeatureEnabled())notFound();const session=await currentSession();return <DiscoveryFrame page="directory" demo><main className="de-main"><DiscoveryIntro step="MON RYTHME" title="Un objectif. Des repères clairs.">Un suivi personnel de démonstration à partir de tes réservations, sans conseil automatique.</DiscoveryIntro><p><a href="/compte">Retour à mon compte</a></p>{session?.role==="sportif"?<PersonalProgress/>:<p>{session?"Le suivi personnel est disponible dans le compte sportif.":"Connecte-toi avec un compte sportif pour accéder à ton suivi."}</p>}</main></DiscoveryFrame>;}
