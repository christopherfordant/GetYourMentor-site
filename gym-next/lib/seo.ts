import type { Metadata } from "next";

const siteName = "GetYourMentor";
const defaultDescription =
  "Trouvez et reservez votre coach sportif en ligne sur GetYourMentor.";
const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

const sportLabels: Record<string, string> = {
  football: "football",
  basketball: "basketball",
  "metiers-de-la-forme": "fitness",
  "sports-de-combat": "sports de combat",
};

export function getSportLabel(sport?: string) {
  if (!sport) return "sport";
  return sportLabels[sport] ?? sport.replaceAll("-", " ");
}

export function buildPageMetadata({
  title,
  description,
}: {
  title: string;
  description?: string;
}): Metadata {
  return {
    title,
    description: description ?? defaultDescription,
    applicationName: siteName,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      siteName,
      title,
      description: description ?? defaultDescription,
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description ?? defaultDescription,
    },
  };
}

export function buildCanonical(pathname: string, params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value && value.trim()) {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
