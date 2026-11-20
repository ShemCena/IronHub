import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { setMemberSessionCookie, clearMemberSessionCookie } from "@/lib/auth/member-session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { writeAuditLog } from "@/lib/audit/log";

const unifiedLoginSchema = z.object({
  identifier: z.string().trim().min(2, "Enter your email or Member ID."),
  password: z.string().min(6, "Enter your password."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawIdentifier = (body.identifier ?? body.email ?? "").trim();
    const parsed = unifiedLoginSchema.safeParse({
      identifier: rawIdentifier,
      password: body.password,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid credentials format." },
        { status: 422 }
      );
    }

    const identifier = parsed.data.identifier;
    const lower = identifier.toLowerCase();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rateKey = `login:${lower}:${ip}`;
    const limit = checkRateLimit(rateKey, 12, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${limit.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    // 1. Check Staff User first (if identifier looks like an email)
    if (lower.includes("@")) {
      const staffUser = await prisma.user.findUnique({
        where: { email: lower },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          isActive: true,
        },
      });

      if (staffUser) {
        if (!staffUser.isActive) {
          return NextResponse.json({ error: "Account is deactivated." }, { status: 401 });
        }
        const valid = await bcrypt.compare(parsed.data.password, staffUser.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
        }

        resetRateLimit(rateKey);
        await prisma.user.update({
          where: { id: staffUser.id },
          data: { lastLoginAt: new Date() },
        });
        await writeAuditLog(prisma, {
          actorId: staffUser.id,
          action: "AUTH_LOGIN",
          entityType: "User",
          entityId: staffUser.id,
          ipAddress: ip,
        });

        await clearMemberSessionCookie();
        await setSessionCookie({
          userId: staffUser.id,
          email: staffUser.email,
          name: staffUser.name,
          role: staffUser.role,
        });

        return NextResponse.json({
          accountType: "STAFF",
          redirectTo: "/dashboard",
          user: {
            id: staffUser.id,
            email: staffUser.email,
            name: staffUser.name,
            role: staffUser.role,
          },
        });
      }
    }

    // 2. Otherwise check Member account (by email or Member ID e.g. IH-1001)
    const member = await prisma.member.findFirst({
      where: {
        status: { not: "ARCHIVED" },
        OR: [
          { email: { equals: lower, mode: "insensitive" } },
          { memberCode: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });

    if (!member || !member.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email/Member ID or password." },
        { status: 401 }
      );
    }

    const validMember = await bcrypt.compare(parsed.data.password, member.passwordHash);
    if (!validMember) {
      return NextResponse.json(
        { error: "Invalid email/Member ID or password." },
        { status: 401 }
      );
    }

    resetRateLimit(rateKey);
    await prisma.member.update({
      where: { id: member.id },
      data: { lastPortalLoginAt: new Date() },
    });

    await clearSessionCookie();
    await setMemberSessionCookie(member.id);

    return NextResponse.json({
      accountType: "MEMBER",
      redirectTo: "/portal",
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: `${member.firstName} ${member.lastName}`,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Unable to sign in right now." },
      { status: 500 }
    );
  }
}
