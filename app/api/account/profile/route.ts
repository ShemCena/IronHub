import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/log";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireStaffSession("account:self");
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile details." },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: session.userId },
        data: { name: parsed.data.name },
        select: { id: true, name: true, email: true, role: true },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "ACCOUNT_PROFILE_UPDATED",
        entityType: "User",
        entityId: session.userId,
      });

      return user;
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
