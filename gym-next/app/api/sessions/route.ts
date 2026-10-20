import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coaches";
import { isDemoFallbackAllowed } from "@/lib/runtime";
import { listStructureOffers, publicSessionOffer } from "@/lib/structure-offers";
import { listReservations } from "@/lib/reservations";

export async function GET() {
  if (!isDemoFallbackAllowed() || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Catalogue de séances disponible en démonstration isolée uniquement" }, { status: 503 });
  }
  try {
    const [offers, reservations] = await Promise.all([listStructureOffers(), listReservations()]);
    const coaches = new Map(await Promise.all([...new Set(offers.map(offer => offer.coachId))].map(async id => [id, await getCoach(id)] as const)));
    const rows = await Promise.all(offers.map(async offer => {
      const coach = coaches.get(offer.coachId);
      if (!coach?.verified) return null;
      return { ...await publicSessionOffer(offer, { coach, reservations }), sport: coach.sport, city: coach.city, source: offer.source ?? "structure" };
    }));
    return NextResponse.json({ data: rows.filter(row => row !== null) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Séances indisponibles. Réessayez dans un instant." }, { status: 503 });
  }
}
