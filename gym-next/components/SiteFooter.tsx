import Link from "next/link";
import { LanguageSelector } from "./common/LanguageSelector";
import { FooterUtilitySlot } from "./FooterUtilities";
import { SocialLinks } from "./SocialLinks";

export function SiteFooter() {
  return <footer className="gym-footer">
    <FooterUtilitySlot />
    <div className="gym-footer-brand"><Link href="/" aria-label="GetYourMentor, accueil"><b>GYM<span aria-hidden="true">↗</span></b><span>GetYourMentor</span></Link><SocialLinks /><LanguageSelector placement="footer" /></div>
    <div className="gym-footer-links">
      <FooterColumn title="Plateforme" links={[["Comment ça marche","/#espace"],["Devenir coach","/compte?mode=coach"],["Tarifs","/#forfaits"],["Entreprises","/inscription-club"]]} />
      <FooterColumn title="Disciplines" links={[["Football","/recherche?sport=football"],["Basketball","/recherche?sport=basketball"],["Fitness","/recherche?sport=metiers-de-la-forme"],["Sports de combat","/recherche?sport=sports-de-combat"]]} />
      <FooterColumn title="Support" links={[["FAQ","/#faq"],["Accessibilité","/legal/accessibilite"],["Cookies","/legal/cookies"],["Plan du site","/plan-du-site"]]} />
      <FooterColumn title="Légal" links={[["CGU","/legal/cgu"],["CGV","/legal/cgv"],["Confidentialité","/legal/confidentialite"],["Mentions légales et contact","/legal/mentions-legales"]]} />
    </div>
    <small className="gym-footer-bottom">© 2026 GetYourMentor · Démo non commerciale.</small>
  </footer>;
}

function FooterColumn({title,links}:{title:string;links:Array<[string,string]>}) {
  return <nav className="gym-footer-column" aria-label={title}><h2>{title}</h2>{links.map(([label,href]) => <Link key={label} href={href} >{label}</Link>)}</nav>;
}
