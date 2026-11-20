import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { memberPortalActivateSchema } from "@/lib/validation/schemas";
import { setMemberSessionCookie } from "@/lib/auth/member-session";
import { writeAuditLog } from "@/lib/audit/log";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = memberPortalActivateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid activation details." },
        { status: 422 }
      );
    }

    const code = parsed.data.memberCode.trim().toUpperCase();
    const contact = parsed.data.emailOrPhone.trim().toLowerCase();

    const member = await prisma.member.findFirst({
      where: {
        memberCode: { equals: code, mode: "insensitive" },
        status: { not: "ARCHIVED" },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member ID not found." }, { status: 404 });
    }

    const emailMatch = member.email && member.email.toLowerCase() === contact;
    const phoneMatch =
      member.phone &&
      member.phone.replace(/\s+/g, "") === parsed.data.emailOrPhone.replace(/\s+/g, "");

    if (!emailMatch && !phoneMatch) {
      return NextResponse.json(
        { error: "Email or phone does not match the member profile on file." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: member.id },
        data: {
          passwordHash,
          portalActivatedAt: new Date(),
          lastPortalLoginAt: new Date(),
        },
      });

      await writeAuditLog(tx, {
        actorId: null,
        action: "MEMBER_PORTAL_ACTIVATED",
        entityType: "Member",
        entityId: member.id,
        metadata: { memberCode: member.memberCode },
      });
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
    return NextResponse.json({ error: "Unable to activate member portal." }, { status: 500 });
  }
}
