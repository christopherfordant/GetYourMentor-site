import { getCoach, type PublicCoachProfile } from "@/lib/coaches";
import { isDemoFallbackAllowed } from "@/lib/runtime";

function hasSupabaseServiceConfig() {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function getBookingGate(coachIdOrName: string | undefined) {
  if (isDemoFallbackAllowed()) return { mode: "demo" as const, coach: null };
  if (!coachIdOrName || !hasSupabaseServiceConfig()) return { mode: "unavailable" as const, coach: null };

  try {
    const coach = await getCoach(coachIdOrName);
    if (!coach?.verified) return { mode: "unavailable" as const, coach: null };
    return { mode: "production" as const, coach: coach as PublicCoachProfile };
  } catch {
    return { mode: "unavailable" as const, coach: null };
  }
}
