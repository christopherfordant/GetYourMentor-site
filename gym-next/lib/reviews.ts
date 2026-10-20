export type Review = {
  id: string;
  reservationId: string;
  authorEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
  coachId?: string;
};

import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";

const memoryReviews: Review[] = [];

export async function listReviews(authorEmail?: string): Promise<Review[]> {
  const config = supabaseConfig();
  if (!config) {
    const rows = isHostedDemo() ? (await readDemoState()).reviews : memoryReviews;
    return rows.filter(row => !authorEmail || row.authorEmail === authorEmail);
  }
  const response = await fetch(`${config.url}/rest/v1/gym_reviews?select=*&order=created_at.desc${authorEmail ? `&author_email=eq.${encodeURIComponent(authorEmail)}` : ""}`, { headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Avis indisponibles");
  return (await response.json()).map((row: Record<string, unknown>) => ({ id: row.id, reservationId: row.reservation_id, authorEmail: row.author_email, rating: row.rating, comment: row.comment, createdAt: row.created_at })) as Review[];
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  assertDemoFallbackAllowed("Supabase Reviews");
  return null;
}

export async function createReview(review: Review) {
  if (memoryReviews.some((item) => item.reservationId === review.reservationId)) {
    throw new Error("Un avis existe déjà pour cette réservation");
  }

  const config = supabaseConfig();
  if (config) {
    const response = await fetch(`${config.url}/rest/v1/gym_reviews`, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: review.id,
        reservation_id: review.reservationId,
        author_email: review.authorEmail,
        rating: review.rating,
        comment: review.comment,
        created_at: review.createdAt,
      }),
    });
    if (!response.ok) throw new Error(response.status === 409 ? "Un avis existe déjà pour cette réservation" : `Supabase review error (${response.status})`);
    const [saved] = await response.json();
    return { ...review, id: saved.id ?? review.id, createdAt: saved.created_at ?? review.createdAt };
  }

  if (isHostedDemo()) return mutateDemoState((s) => {
    if (s.reviews.some((r) => r.reservationId === review.reservationId)) throw new Error("Un avis existe déjà pour cette réservation");
    s.reviews.push(review); return review;
  });
  memoryReviews.push(review);
  return review;
}
