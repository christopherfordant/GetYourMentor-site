import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { InscriptionClubLegacyPage } from "@/components/club-signup-legacy/InscriptionClubLegacyPage";
import { buildCanonical, buildPageMetadata } from "@/lib/seo";

type InscriptionClubPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Inscription club",
    description:
      "Inscrivez votre club ou votre structure sportive sur GetYourMentor pour preparer votre espace et vos coachs.",
  }),
  alternates: {
    canonical: buildCanonical("/inscription-club"),
  },
};

export default async function InscriptionClubPage({ searchParams }: InscriptionClubPageProps) {
  const params = await searchParams;
  const stylesheetPath = path.join(process.cwd(), "app", "legacy-prototype.css");
  const legacyStyles = fs
    .readFileSync(stylesheetPath, "utf8")
    .replaceAll("../design_assets/", "/design_assets/");

  const normalizedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  return <InscriptionClubLegacyPage legacyStyles={legacyStyles} params={normalizedParams} />;
}
