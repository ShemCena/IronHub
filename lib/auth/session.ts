import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { StaffRole } from "@prisma/client";
import { assertPermission, type Permission } from "@/lib/permissions/rbac";

const COOKIE_NAME = "ironhub_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours

export interface StaffSession {
  userId: string;
  email: string;
  name: string;
  role: StaffRole;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable must be configured.");
    }
    return new TextEncoder().encode("ironhub-local-dev-secret-change-in-prod");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(session: StaffSession): Promise<string> {
  return new SignJWT({
    sub: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null;
    }
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as StaffRole,
    };
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

export async function getStaffSession(): Promise<StaffSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireStaffSession(
  permission?: Permission
): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) {
    throw new Error("Unauthorized: please sign in.");
  }
  if (permission) {
    assertPermission(session.role, permission);
  }
  return session;
}
