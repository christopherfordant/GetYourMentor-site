import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
  const publicRoutes = ["/", "/recherche", "/coachs", "/coach", "/inscription-club"];

  return publicRoutes.map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
