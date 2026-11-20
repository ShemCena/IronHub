import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { generateOpaqueQrToken } from "@/lib/qr/token";
import { writeAuditLog } from "@/lib/audit/log";

const generateSchema = z.object({
  memberId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("qr:manage");
    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 422 });
    }

    const member = await prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      select: {
        id: true,
        memberCode: true,
        firstName: true,
        lastName: true,
        status: true,
        memberships: {
          orderBy: { endDate: "desc" },
          take: 1,
          select: { planNameSnapshot: true, endDate: true },
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    if (member.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "Cannot issue a QR credential for an archived member." },
        { status: 400 }
      );
    }

    const { rawToken, tokenHash, tokenLast4 } = generateOpaqueQrToken();

    const credential = await prisma.$transaction(async (tx) => {
      await tx.qRCredential.updateMany({
        where: { memberId: member.id, isActive: true },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: "Replaced by regenerated credential",
        },
      });

      const created = await tx.qRCredential.create({
        data: {
          memberId: member.id,
          tokenHash,
          tokenLast4,
          isActive: true,
          issuedById: session.userId,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "QR_CREDENTIAL_GENERATED",
        entityType: "QRCredential",
        entityId: created.id,
        metadata: { memberId: member.id, tokenLast4 },
      });

      return created;
    });

    // High-contrast black-on-white QR with quiet margin for reliable scanning
    const qrDataUrl = await QRCode.toDataURL(rawToken, {
      errorCorrectionLevel: "M",
      margin: 4,
      width: 320,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return NextResponse.json({
      credential: {
        id: credential.id,
        tokenLast4: credential.tokenLast4,
        issuedAt: credential.issuedAt,
      },
      member: {
        id: member.id,
        memberCode: member.memberCode,
        name: `${member.firstName} ${member.lastName}`,
        plan: member.memberships[0]?.planNameSnapshot ?? "No Plan",
      },
      qrDataUrl,
      // Returned once so staff can test or copy in dev/scanner fallback if needed
      tokenPreview: rawToken,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate QR";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
