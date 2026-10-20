import { NextResponse, type NextRequest } from "next/server";

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function demoFallbackAllowed() {
  const acceptanceMode = process.env.GETYOURMENTOR_ACCEPTANCE_MODE === "true"
    && process.env.CI === "true";
  return acceptanceMode
    || (process.env.NODE_ENV !== "production" && process.env.GETYOURMENTOR_ALLOW_DEMO === "true");
}

export function middleware(request: NextRequest) {
  if (demoFallbackAllowed() || !unsafeMethods.has(request.method)) return NextResponse.next();

  const origin = request.headers.get("origin");
  if (!origin) return NextResponse.next();

  const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!publicUrl) {
    return NextResponse.json({ error: "Origine publique non configurée" }, { status: 503 });
  }

  try {
    if (new URL(origin).origin !== new URL(publicUrl).origin) {
      return NextResponse.json({ error: "Origine de requête non autorisée" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Origine de requête invalide" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
