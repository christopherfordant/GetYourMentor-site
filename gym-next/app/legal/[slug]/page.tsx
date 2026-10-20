import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildCanonical } from "@/lib/seo";
import { SiteFooter } from "@/components/SiteFooter";

const documents = {
  cgv: {
    sections: [["Objet", "GetYourMentor met en relation des sportifs et des coachs independants pour des seances reservees via la plateforme."], ["Reservation et paiement", "Une demande devient une reservation apres validation du coach. Le paiement est realise via le prestataire affiche au moment du reglement."], ["Annulation", "Sauf regle particuliere affichee lors de la commande, le remboursement est de 100 % au-dela de 48 heures et de 50 % entre 24 et 48 heures avant la seance."], ["Validation juridique", "Les informations sur le vendeur, la TVA, les frais et le droit de rétractation ne sont pas encore publiées."]],
    label: "Conditions générales de vente",
    description: "Informations provisoires sur les réservations et paiements. Conditions définitives non publiées.",
  },
  cgu: {
    sections: [["Compte", "L utilisateur fournit des informations exactes, conserve ses identifiants et utilise la plateforme pour une activite licite."], ["Roles", "Les sportifs, coachs, etablissements et administrateurs disposent de droits distincts. Les coachs ne sont visibles qu apres validation."], ["Disponibilite", "La plateforme peut etre interrompue pour maintenance ou securite."]],
    label: "Conditions générales d’utilisation",
    description: "Le document qui encadrera l’utilisation de GetYourMentor.",
  },
  confidentialite: {
    sections: [["Donnees traitees", "Identite, coordonnees, reservations, messages, paiements et localisation lorsque l utilisateur l autorise."], ["Finalites", "Creer le compte, rechercher, reserver, notifier et prevenir la fraude."], ["Droits", "Toute personne peut demander l acces, la rectification, l effacement, la limitation ou la portabilite de ses donnees selon le cadre applicable."], ["Conservation", "Les durées de conservation, le responsable de traitement et le contact dédié ne sont pas encore publiés."]],
    label: "Politique de confidentialité",
    description: "Le document qui précisera les traitements de données et les droits des personnes.",
  },
  "mentions-legales": {
    sections: [["Editeur", "Les informations d’identification de l’éditeur ne sont pas encore publiées."], ["Hebergement", "Hebergeur applicatif : Netlify. Donnees applicatives : Supabase. Les coordonnées contractuelles ne sont pas encore publiées."], ["Contact", "L’adresse de contact du service n’est pas encore publiée."]],
    label: "Mentions légales",
    description: "Les informations légales de l’éditeur et de l’hébergeur.",
  },
  cookies: {
    sections: [["Cookies necessaires", "La plateforme peut utiliser les cookies strictement necessaires a la session et a la securite."], ["Mesure d audience", "Aucun outil non necessaire ne doit etre active sans le consentement requis."], ["Gestion", "Utilisez Préférences cookies dans le pied de page pour revoir votre choix."]],
    label: "Gestion des cookies",
    description: "Le document et les choix de consentement relatifs aux cookies.",
  },
  accessibilite: {
    sections: [["Engagement", "GetYourMentor vise une experience responsive, lisible au clavier et compatible avec les technologies d assistance."], ["Limites connues", "Aucun audit complet de conformité n’est publié à ce stade."], ["Contact", "Le contact dédié à l’accessibilité n’est pas encore disponible."]],
    label: "Accessibilité",
    description: "La déclaration d’accessibilité et les moyens de contact associés.",
  },
} as const;

function getDocument(slug: string) {
  if (!Object.prototype.hasOwnProperty.call(documents, slug)) return undefined;
  return documents[slug as keyof typeof documents];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const document = getDocument(slug);
  if (!document) return {};

  return {
    title: `${document.label} — GetYourMentor`,
    description: document.description,
    robots: { index: false, follow: false },
    alternates: { canonical: buildCanonical(`/legal/${slug}`) },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = getDocument(slug);
  if (!document) notFound();

  return (
    <>
      <main className="legal-placeholder-page">
      <div className="legal-placeholder-card">
        <p className="legal-placeholder-kicker">Informations provisoires</p>
        <h1>{document.label}</h1>
        <p>
          Les documents définitifs ne sont pas encore publiés. Ces informations provisoires
          ne constituent pas des conditions contractuelles applicables et ne permettent pas de conclure un achat.
        </p>
        <p className="legal-placeholder-topic">{document.description}</p>
        <div className="legal-sections">
          {document.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
        </div>
        <Link href="/">Retour à l’accueil</Link>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
