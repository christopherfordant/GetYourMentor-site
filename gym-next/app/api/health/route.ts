import { NextResponse } from "next/server";
import { getRuntimeReadiness, isHostedDemo } from "@/lib/runtime";
import { readDemoState } from "@/lib/repositories/demo-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const readiness = getRuntimeReadiness();
  if (isHostedDemo()) {
    try { await readDemoState(); }
    catch { return NextResponse.json({ status: "degraded", mode: "demo", ready: false, error: "Stockage de démonstration indisponible" }, { status: 503 }); }
  }
  const status = readiness.mode === "demo" ? "demo" : readiness.ready ? "ok" : "degraded";
  return NextResponse.json(
    { status, mode: readiness.mode, ready: readiness.ready, checks: readiness.checks },
    { status: readiness.ready ? 200 : 503 },
  );
}
