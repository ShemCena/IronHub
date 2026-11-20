import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/db/prisma";
import { getAuthSecretKey } from "@/lib/auth/secret";

const COOKIE_NAME = "ironhub_member_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface MemberSession {
  memberId: string;
  memberCode: string;
  firstName: string;
  lastName: string;
}

export async function setMemberSessionCookie(memberId: string): Promise<void> {
  const token = await new SignJWT({ typ: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(memberId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearMemberSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getMemberSession(): Promise<MemberSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let memberId: string;
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey());
    if (payload.typ !== "member" || typeof payload.sub !== "string") return null;
    memberId = payload.sub;
  } catch {
    return null;
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      status: true,
      passwordHash: true,
    },
  });

  // Archived members or reset portal accounts lose access immediately.
  if (!member || member.status === "ARCHIVED" || !member.passwordHash) return null;

  return {
    memberId: member.id,
    memberCode: member.memberCode,
    firstName: member.firstName,
    lastName: member.lastName,
  };
}

export async function requireMemberSession(): Promise<MemberSession> {
  const session = await getMemberSession();
  if (!session) throw new Error("Unauthorized: please sign in to the member portal.");
  return session;
}
