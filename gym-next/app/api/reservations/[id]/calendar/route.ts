import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { getReservation } from "@/lib/reservations";
import { isIsolatedDemoFeatureEnabled } from "@/lib/runtime";
import { calendarEligible, reservationCalendar } from "@/lib/domain/reservation-calendar";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const failure = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  if (!session) return failure("Connexion requise", 401);
  if (session.role !== "sportif") return failure("Export réservé au compte sportif", 403);
  if (!isIsolatedDemoFeatureEnabled()) return failure("Export disponible en démonstration isolée uniquement", 503);
  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(id)) return failure("Référence invalide", 400);
  try {
    const row = await getReservation(id);
    // A claim URL or another role cannot substitute for ownership of the session.
    if (!row || row.ownerEmail !== session.email) return failure("Réservation inaccessible", 404);
    if (!calendarEligible(row)) return failure("La séance doit être acceptée et posséder un horaire et une durée valides", 409);
    return new Response(reservationCalendar(row), { headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="getyourmentor-seance-demo.ics"' } });
  } catch { return failure("Export indisponible. Réessayez depuis votre compte.", 503); }
}
