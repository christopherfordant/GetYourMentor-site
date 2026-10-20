import { NextResponse } from "next/server";
import { filterStoredCoaches, toPublicCoach } from "@/lib/coaches";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const data = await filterStoredCoaches({
      sport: url.searchParams.get("sport") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      latitude: url.searchParams.get("latitude") ?? undefined,
      longitude: url.searchParams.get("longitude") ?? undefined,
      radiusKm: url.searchParams.get("radiusKm") ?? undefined,
      gender: url.searchParams.get("gender") ?? undefined,
      practice: url.searchParams.get("practice") ?? undefined,
      level: url.searchParams.get("level") ?? undefined,
      format: url.searchParams.get("format") ?? undefined,
      availability: url.searchParams.get("availability") ?? undefined,
      minRating: url.searchParams.get("minRating") ?? undefined,
      maxPrice: url.searchParams.get("maxPrice") ?? undefined,
    });

    return NextResponse.json({ data: data.map(toPublicCoach) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalogue indisponible";
    const status = message.includes("n'est pas configuré") ? 503 : 502;
    return NextResponse.json({ error: status === 503 ? "Catalogue indisponible sans configuration de production" : "Catalogue indisponible" }, { status });
  }
}
