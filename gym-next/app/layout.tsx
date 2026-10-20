import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { InternalNavigationEnhancer } from "@/components/InternalNavigationEnhancer";
import { FooterUtilities } from "@/components/FooterUtilities";
import { ClientEnhancers } from "@/components/ClientEnhancers";
import "./globals.css";
import "./redesign-2026.css";
import "./final-motion-overrides.css";
import "./gym-account-design.css";
import "./gym-footer-design.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "GetYourMentor",
    template: "%s | GetYourMentor",
  },
  description: "Trouvez et reservez votre coach sportif en ligne sur GetYourMentor.",
  applicationName: "GetYourMentor",
  category: "sports",
  keywords: ["coach sportif", "coaching sportif", "réservation coach", "entraînement", "sport"],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "GetYourMentor",
    title: "GetYourMentor — Trouve le coach qui te correspond",
    description: "Trouvez et réservez votre coach sportif en ligne sur GetYourMentor.",
    url: appUrl,
    images: [{ url: "/images/demo-sport.svg", width: 1600, height: 900, alt: "Athlètes et coachs en mouvement" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GetYourMentor — Trouve le coach qui te correspond",
    description: "Trouvez et réservez votre coach sportif en ligne sur GetYourMentor.",
    images: ["/images/demo-sport.svg"],
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={manrope.variable}>
        <div id="top" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${appUrl}/#website`,
                  url: appUrl,
                  name: "GetYourMentor",
                  description: "Plateforme de mise en relation entre sportifs et coachs.",
                  inLanguage: "fr-FR",
                },
                {
                  "@type": "Organization",
                  "@id": `${appUrl}/#organization`,
                  name: "GetYourMentor",
                  url: appUrl,
                  logo: `${appUrl}/images/demo-sport.svg`,
                },
              ],
            }),
          }}
        />
        <InternalNavigationEnhancer />
        <ClientEnhancers />
        {children}
        <FooterUtilities />
      </body>
    </html>
  );
}
