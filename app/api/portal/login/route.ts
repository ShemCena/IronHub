import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { memberPortalLoginSchema } from "@/lib/validation/schemas";
import { setMemberSessionCookie } from "@/lib/auth/member-session";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = memberPortalLoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid login details." },
        { status: 422 }
      );
    }

    const identifier = parsed.data.identifier.trim();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    const rateKey = `portal-login:${identifier.toLowerCase()}:${ip}`;
    const limit = checkRateLimit(rateKey, 12, 15 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` },
        { status: 429 }
      );
    }

    const member = await prisma.member.findFirst({
      where: {
        status: { not: "ARCHIVED" },
        OR: [
          { memberCode: { equals: identifier, mode: "insensitive" } },
          { email: { equals: identifier.toLowerCase(), mode: "insensitive" } },
        ],
      },
    });

    if (!member || !member.passwordHash) {
      return NextResponse.json(
        {
          error:
            "Invalid credentials or portal pass not activated yet. Use the Activate Pass tab first.",
        },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(parsed.data.password, member.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid Member ID/email or password." }, { status: 401 });
    }

    resetRateLimit(rateKey);

    await prisma.member.update({
      where: { id: member.id },
      data: { lastPortalLoginAt: new Date() },
    });

    await setMemberSessionCookie(member.id);

    return NextResponse.json({
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: `${member.firstName} ${member.lastName}`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to sign in right now." }, { status: 500 });
  }
}
