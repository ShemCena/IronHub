import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";

const revokeSchema = z.object({
  memberId: z.string().min(1),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("qr:revoke");
    const body = await request.json();
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Member ID is required." }, { status: 422 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.qRCredential.updateMany({
        where: { memberId: parsed.data.memberId, isActive: true },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: parsed.data.reason ?? "Revoked by staff",
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "QR_CREDENTIAL_REVOKED",
        entityType: "Member",
        entityId: parsed.data.memberId,
        metadata: { count: res.count, reason: parsed.data.reason ?? "Revoked by staff" },
      });

      return res.count;
    });

    return NextResponse.json({ revokedCount: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke QR";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
