import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness probe: confirms that the Next.js process can answer HTTP requests. */
export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
