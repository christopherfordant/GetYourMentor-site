import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { payReservation } from "@/lib/reservations";
import { bodyExceedsLimit } from "@/lib/request-guards";

function validSignature(rawBody: string, signature: string, secret: string) {
  const parts = Object.fromEntries(signature.split(",").map((part) => part.split("=", 2) as [string, string]));
  if (!parts.t || !parts.v1) return false;
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const received = Buffer.from(parts.v1, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return received.length === expectedBuffer.length && timingSafeEqual(received, expectedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (bodyExceedsLimit(request, 1024 * 1024)) return NextResponse.json({ error: "Webhook trop volumineux" }, { status: 413 });
  if (!secret || !signature) return NextResponse.json({ error: "Webhook Stripe non configuré" }, { status: 503 });
  const rawBody = await request.text();
  if (!validSignature(rawBody, signature, secret)) return NextResponse.json({ error: "Signature Stripe invalide" }, { status: 400 });

  let event: { type?: string; data?: { object?: { customer_details?: { email?: string }; customer_email?: string; payment_intent?: string; metadata?: { reservation_id?: string } } } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return NextResponse.json({ error: "Payload Stripe invalide" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const checkout = event.data?.object;
    const reservationId = checkout?.metadata?.reservation_id;
    const ownerEmail = checkout?.customer_details?.email ?? checkout?.customer_email;
    const paymentIntent = typeof checkout?.payment_intent === "string" ? checkout.payment_intent : undefined;
    if (typeof reservationId === "string" && reservationId.length <= 128) {
      if (process.env.PAYMENT_PROVIDER === "stripe" && !paymentIntent) {
        return NextResponse.json({ error: "PaymentIntent Stripe absent" }, { status: 400 });
      }
      await payReservation(
        reservationId,
        typeof ownerEmail === "string" ? ownerEmail : undefined,
        paymentIntent,
      );
    }
  }
  return NextResponse.json({ received: true });
}
