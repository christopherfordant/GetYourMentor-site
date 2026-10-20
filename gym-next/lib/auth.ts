import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { coachIdForName, coachProfiles, createCoachProfile } from "@/lib/domain";
import { createStoredCoachProfile } from "@/lib/coaches";
import { assertDemoFallbackAllowed, isHostedDemo } from "@/lib/runtime";
import { mutateDemoState, readDemoState } from "@/lib/repositories/demo-state";

export type UserRole = "sportif" | "coach" | "club" | "admin";
export type Session = { email: string; role: UserRole; coachId?: string; accessToken?: string };
type SignupProfile = { firstName: string; lastName: string; phone: string; city?: string; termsAccepted: boolean };

const sessions = new Map<string, Session>();
const localUsers = new Map<string, { password: string; role: UserRole; coachId?: string }>();
const COOKIE_NAME = "gym_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function isUserRole(value: unknown): value is UserRole {
  return value === "sportif" || value === "coach" || value === "club" || value === "admin";
}

function supabaseRole(profile: Record<string, unknown>) {
  const metadata = profile?.app_metadata as Record<string, unknown> | undefined;
  return isUserRole(metadata?.role) ? metadata.role : "sportif";
}

function supabaseCoachId(profile: Record<string, unknown>) {
  const metadata = profile?.app_metadata as Record<string, unknown> | undefined;
  return typeof metadata?.coach_id === "string" ? metadata.coach_id : undefined;
}

function sessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return createHash("sha256").update(secret).digest();
  assertDemoFallbackAllowed("SESSION_SECRET");
  return null;
}

function encodeSession(session: Session) {
  const key = sessionKey();
  if (!key) {
    const sessionId = randomUUID();
    sessions.set(sessionId, session);
    return sessionId;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((value) => value.toString("base64url")).join(".");
}

function decodeSession(value: string) {
  const key = sessionKey();
  if (!key) return sessions.get(value) ?? null;

  try {
    const [ivValue, tagValue, encryptedValue] = value.split(".");
    if (!ivValue || !tagValue || !encryptedValue) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(decrypted) as Partial<Session>;
    return typeof parsed.email === "string" && isUserRole(parsed.role)
      ? { email: parsed.email, role: parsed.role, coachId: typeof parsed.coachId === "string" ? parsed.coachId : undefined, accessToken: typeof parsed.accessToken === "string" ? parsed.accessToken : undefined }
      : null;
  } catch {
    return null;
  }
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (url && key) return { url: url.replace(/\/$/, ""), key };
  assertDemoFallbackAllowed("Supabase Auth");
  return null;
}

export async function signIn(email: string, password: string, role: Session["role"]) {
  const config = supabaseConfig();
  let accessToken: string | undefined;
  let resolvedRole = role;
  let coachId: string | undefined;

  if (config) {
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error("Identifiants invalides");
    accessToken = (await response.json()).access_token;
    const profileResponse = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!profileResponse.ok) throw new Error("Profil utilisateur indisponible");
    const profile = await profileResponse.json();
    resolvedRole = supabaseRole(profile);
    coachId = supabaseCoachId(profile);
  } else if (isHostedDemo()) {
    const fixtures: Record<string, { role: UserRole; coachId?: string }> = {
      "sportif@example.com": { role: "sportif" }, "coach@example.com": { role: "coach", coachId: "coach-demo-01" },
      "club@example.com": { role: "club" }, "admin@example.com": { role: "admin" },
    };
    const fixture = fixtures[email];
    const user = (await readDemoState()).users[email];
    if (fixture && password === "demo-password") { resolvedRole = fixture.role; coachId = fixture.coachId; }
    else if (user && typeof password === "string" && password.length <= 256
      && timingSafeEqual(Buffer.from(user.passwordHash, "hex"), scryptSync(password, user.salt, 32))) { resolvedRole = user.role; coachId = user.coachId; }
    else throw new Error("Utilisez un compte de démonstration valide");
  } else if (!email || !password) {
    throw new Error("Identifiant et mot de passe requis");
  } else if (localUsers.has(email)) {
    const localUser = localUsers.get(email);
    if (localUser?.password !== password) throw new Error("Identifiants invalides");
    resolvedRole = localUser.role;
    coachId = localUser.coachId;
  } else if (role === "coach") {
    coachId = "coach-demo-01";
  }

  const sessionId = encodeSession({ email, role: resolvedRole, coachId, accessToken });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_MAX_AGE, path: "/" });
  const availableCoaches = isHostedDemo() ? (await readDemoState()).coaches : coachProfiles;
  const coachName = coachId ? availableCoaches.find((coach) => coach.id === coachId)?.name : undefined;
  return { email, role: resolvedRole, coachId, coachName };
}

export async function signUp(email: string, password: string, role: UserRole, profile?: SignupProfile) {
  if (profile && (!profile.firstName || !profile.lastName || !profile.phone || !profile.termsAccepted)) {
    throw new Error("Les informations personnelles et l'acceptation des CGU sont requises");
  }
  if (!email || !password || password.length < 8) throw new Error("Un email et un mot de passe de 8 caractères sont requis");
  const config = supabaseConfig();
  if (config) {
    const coachId = role === "coach" && profile ? coachIdForName(`${profile.firstName} ${profile.lastName}`.trim()) : undefined;
    const response = await fetch(`${config.url}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: config.key, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, data: profile }),
    });
    if (!response.ok) throw new Error("Inscription impossible");
    const signupPayload = await response.json();
    const userId = typeof signupPayload?.user?.id === "string" ? signupPayload.user.id : undefined;
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!userId || !adminKey) {
      assertDemoFallbackAllowed("Supabase Auth role metadata");
    } else {
      const metadataResponse = await fetch(`${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: "PUT",
        headers: { apikey: adminKey, Authorization: `Bearer ${adminKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ app_metadata: { role, ...(coachId ? { coach_id: coachId } : {}) } }),
      });
      if (!metadataResponse.ok) throw new Error("Profil de rôle indisponible");
    }
    if (coachId && profile) await createStoredCoachProfile({ id: coachId, name: `${profile.firstName} ${profile.lastName}`.trim(), city: profile.city });
  } else if (isHostedDemo()) {
    if (!/^[^@\s]+@example\.com$/.test(email) || ["sportif@example.com", "coach@example.com", "club@example.com", "admin@example.com"].includes(email)) throw new Error("Utilisez une adresse fictive unique @example.com");
    if (role === "admin") throw new Error("Inscription administrateur interdite");
    const salt = randomBytes(16).toString("hex");
    const passwordHash = scryptSync(password, salt, 32).toString("hex");
    const coachId = role === "coach" && profile ? coachIdForName(`${profile.firstName} ${profile.lastName}`) : undefined;
    await mutateDemoState((s) => {
      if (s.users[email]) throw new Error("Cette adresse est déjà inscrite");
      s.users[email] = { passwordHash, salt, role, coachId };
      if (coachId && profile) {
        const coach = createCoachProfile({ id: coachId, name: `${profile.firstName} ${profile.lastName}`, city: profile.city });
        if (!s.coaches.some((c) => c.id === coachId)) s.coaches.push(coach);
      }
    });
  } else {
    if (localUsers.has(email)) throw new Error("Cette adresse est déjà inscrite");
    const coach = role === "coach" && profile ? createCoachProfile({ name: `${profile.firstName} ${profile.lastName}`.trim() }) : null;
    localUsers.set(email, { password, role, coachId: coach?.id });
  }
  return signIn(email, password, role);
}

export async function currentSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? decodeSession(token) : null;
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export async function requireRole(role: Session["role"]) {
  const session = await currentSession();
  if (!session || session.role !== role) return null;
  return session;
}

// Only used by the isolated demo affiliation route, after its demo guard.
export async function demoStructureExists(email: string) {
  assertDemoFallbackAllowed("Annuaire structures de démonstration");
  if (email === "club@example.com") return true;
  return isHostedDemo() ? (await readDemoState()).users[email]?.role === "club" : localUsers.get(email)?.role === "club";
}
