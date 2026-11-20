import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertPermission, type Permission } from "@/lib/permissions/rbac";
import { getAuthSecretKey } from "@/lib/auth/secret";

const COOKIE_NAME = "ironhub_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours
const SESSION_CACHE_TTL_MS = 15_000; // 15s warm-lambda cache to avoid redundant DB round-trips

const sessionCache = new Map<string, { session: StaffSession | null; expiresAt: number }>();

export function invalidateStaffSessionCache(userId?: string): void {
  if (userId) {
    sessionCache.delete(userId);
  } else {
    sessionCache.clear();
  }
}

export interface StaffSession {
  userId: string;
  email: string;
  name: string;
  role: StaffRole;
}

export async function signSessionToken(session: StaffSession): Promise<string> {
  return new SignJWT({ typ: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecretKey());
}

async function readStaffUserId(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (payload.typ !== "staff" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: StaffSession): Promise<void> {
  const token = await signSessionToken(session);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/**
 * Resolves the signed-in staff member and re-reads role/active state from the
 * database so deactivations and role changes take effect immediately.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = await readStaffUserId(token);
  if (!userId) return null;

  const cached = sessionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.session;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  const resolved = !user || !user.isActive
    ? null
    : { userId: user.id, email: user.email, name: user.name, role: user.role };

  sessionCache.set(userId, { session: resolved, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  return resolved;
}

export async function requireStaffSession(permission?: Permission): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    throw new Error("Unauthorized: please sign in.");
  }
  if (permission) {
    assertPermission(session.role, permission);
  }
  return session;
}
