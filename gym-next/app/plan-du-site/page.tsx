import Link from "next/link";
import { DiscoveryFrame, DiscoveryIntro } from "@/components/discovery/DiscoveryFrame";
export const metadata = { title: "Plan du site — GetYourMentor", description: "Retrouvez les pages de recherche, de compte et les informations de GetYourMentor." };
const groups = [
 {title:"Découvrir",links:[["Accueil","/"],["Rechercher un coach","/recherche"],["Annuaire des coachs","/coachs"],["Séances collectives","/seances"],["Structures","/structures"],["Offres","/offres"],["Ressources","/contenus"]]},
 {title:"Mon espace",links:[["Compte sportif","/compte"],["Compte coach","/compte?mode=coach"],["Inscrire une structure","/inscription-club"],["Suivi personnel","/suivi"]]},
 {title:"Informations",links:[["Questions fréquentes","/#faq"],["Conditions d’utilisation","/legal/cgu"],["Conditions de vente","/legal/cgv"],["Confidentialité","/legal/confidentialite"],["Cookies","/legal/cookies"],["Accessibilité","/legal/accessibilite"],["Mentions légales et contact","/legal/mentions-legales"]]},
];
export default function SiteMapPage(){return <DiscoveryFrame page="directory"><main className="de-main"><DiscoveryIntro step="NAVIGATION" title="Plan du site">Les pages principales et les informations utiles, réunies au même endroit. Certaines fonctions nécessitent une connexion.</DiscoveryIntro><div className="site-map-groups">{groups.map(g=><section key={g.title}><h2>{g.title}</h2><ul>{g.links.map(([label,href])=><li key={href}><Link href={href}>{label}</Link></li>)}</ul></section>)}</div></main></DiscoveryFrame>}
