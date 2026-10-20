import type { BookingAttempt } from "@/lib/booking-attempt-server";
import type { PersonalGoal } from "@/lib/personal-progress";
import type { DemoContent, DemoContentPurchase } from "@/lib/demo-contents";
import type { Affiliation } from "@/lib/affiliations";
import type { Feedback } from "@/lib/feedback";
import type { OfferPreview } from "@/lib/offer-previews";
import { getStore } from "@netlify/blobs";
import { coachProfiles, type CoachProfile, type Reservation } from "@/lib/domain";
import { isHostedDemo } from "@/lib/runtime";
import type { ClubLead } from "@/lib/clubs";
import type { Message } from "@/lib/messages";
import type { Review } from "@/lib/reviews";
import type { CommissionSettings } from "@/lib/repositories/commission-repository";
import type { StructureOffer } from "@/lib/structure-offers";

export type DemoUser = { passwordHash: string; salt: string; role: "sportif" | "coach" | "club"; coachId?: string };
export type DemoState = {
  reservations: Reservation[];
  bookingAttempts?: BookingAttempt[];
  coaches: CoachProfile[];
  users: Record<string, DemoUser>;
  clubs: ClubLead[];
  messages: Message[];
  pendingMessageFiles?: Array<{ id: string; createdAt: string }>;
  reviews: Review[];
  commission?: CommissionSettings;
  structureOffers?: StructureOffer[];
  affiliations?: Affiliation[];
  feedback?: Feedback[];
  offerPreviews?: OfferPreview[];
  personalGoals?: PersonalGoal[];
  contents?: DemoContent[];
  contentPurchases?: DemoContentPurchase[];
};

export type DemoBlobStore = Pick<ReturnType<typeof getStore>, "get" | "getWithMetadata" | "set" | "setJSON" | "delete">;

export function demoBlobStore() {
  if (!isHostedDemo()) throw new Error("Stockage de démonstration non autorisé");
  // Next patches fetch with its data cache, which itself uses Blobs on Netlify.
  // Storage requests must bypass that cache to avoid recursive cache reads.
  const patchedFetch = globalThis.fetch as typeof fetch & { _nextOriginalFetch?: typeof fetch };
  const originalFetch = patchedFetch._nextOriginalFetch ?? patchedFetch;
  const storageFetch: typeof fetch = (input, init) => originalFetch(input, {
    ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(8000),
    next: { internal: true },
  } as RequestInit);
  return getStore({ name: "gym-isolated-demo-v1", consistency: "strong", fetch: storageFetch });
}

function emptyState(): DemoState {
  return { reservations: [], coaches: structuredClone(coachProfiles), users: {}, clubs: [], messages: [], reviews: [] };
}

export async function readDemoState(blobs: Pick<DemoBlobStore, "get"> = demoBlobStore()): Promise<DemoState> {
  return (await blobs.get("state", { type: "json" })) ?? emptyState();
}

// One versioned document gives the small demo atomic slot claims/settings updates.
// Production keeps Supabase and its relational constraints; this adapter is demo-only.
export async function mutateDemoState<T>(change: (state: DemoState) => T, blobs: Pick<DemoBlobStore, "getWithMetadata" | "setJSON"> = demoBlobStore()): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const entry = await blobs.getWithMetadata("state", { type: "json" });
    const state: DemoState = entry?.data ?? emptyState();
    const result = change(state);
    const saved = await blobs.setJSON("state", state, entry?.etag ? { onlyIfMatch: entry.etag } : { onlyIfNew: true });
    if (saved.modified) return result;
  }
  throw new Error("Démonstration occupée, réessayez dans un instant");
}
