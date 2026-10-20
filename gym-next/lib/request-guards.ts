export function bodyExceedsLimit(request: Request, maxBytes: number) {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return false;
  const parsed = Number(contentLength);
  return Number.isFinite(parsed) && parsed > maxBytes;
}

export function textExceedsLimit(value: unknown, maxCharacters: number) {
  return typeof value === "string" && value.length > maxCharacters;
}

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitStore = new Map<string, RateLimitEntry>();

function requestClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown-client";
}

export function rateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  }
  const key = `${scope}:${requestClientKey(request)}`;
  const current = rateLimitStore.get(key);
  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}
