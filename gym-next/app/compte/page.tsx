import { ReservationProofBoundary } from "@/components/common/ReservationProofBoundary";
import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import { AccountLegacyPage } from "@/components/account-legacy/AccountLegacyPage";
import { currentSession } from "@/lib/auth";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { buildCanonical, buildPageMetadata } from "@/lib/seo";
import { getCoach } from "@/lib/coaches";

type ComptePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: ComptePageProps): Promise<Metadata> {
  const params = await searchParams;
  const modeParam = params.mode;
  const mode = Array.isArray(modeParam) ? modeParam[0] : modeParam;
  const title =
    mode === "coach"
      ? "Compte coach"
      : mode === "club"
        ? "Compte club"
        : "Mon compte";

  return {
    ...buildPageMetadata({
      title,
      description: "Connectez-vous ou accedez a votre espace GetYourMentor selon votre profil sportif, coach ou club.",
    }),
    referrer: "no-referrer", robots: {index:false,follow:false},
    alternates: {
      canonical: buildCanonical("/compte", { mode }),
    },
  };
}

export default async function ComptePage({ searchParams }: ComptePageProps) {
  const params = await searchParams;
  const stylesheetPath = path.join(process.cwd(), "app", "legacy-prototype.css");
  const legacyStyles = fs
    .readFileSync(stylesheetPath, "utf8")
    .replaceAll("../design_assets/", "/design_assets/");

  const normalizedParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  delete normalizedParams.claimToken;
  const session = await currentSession();
  // Client query parameters can never authenticate or choose another role.
  delete normalizedParams.connected;
  delete normalizedParams.coachId;
  if (session) {
    normalizedParams.connected = "1";
    if (session.coachId) normalizedParams.coachId = session.coachId;
    normalizedParams.mode = session.role;
    if (session.role === "coach" && session.coachId) normalizedParams.coach = (await getCoach(session.coachId))?.name ?? "Coach";
  }

  return <ReservationProofBoundary key={normalizedParams.reservationId ?? "none"} id={normalizedParams.reservationId}><AccountLegacyPage key={session ? `${session.role}:${session.email}` : "anonymous"} legacyStyles={legacyStyles} params={normalizedParams} athleteEmail={session?.role === "sportif" ? session.email : undefined} allowDemoFallback={isDemoFallbackAllowed()} /></ReservationProofBoundary>;
}
