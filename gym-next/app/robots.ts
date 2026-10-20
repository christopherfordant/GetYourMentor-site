import type { MetadataRoute } from "next";
import { isHostedDemo } from "@/lib/runtime";

export default function robots(): MetadataRoute.Robots {
  if (isHostedDemo()) return { rules: { userAgent: "*", disallow: "/" } };
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/recherche", "/coachs", "/coach", "/inscription-club"],
      disallow: ["/api/", "/compte", "/paiement", "/recapitulatif", "/creneau"],
    },
    sitemap: `${baseUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
