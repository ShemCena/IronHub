import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { canManageStaffRole } from "@/lib/permissions/rbac";
import { staffUpdateSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/log";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaffSession("staff:manage");
    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json(
        { error: "You cannot modify your own role or active status." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = staffUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid staff update." },
        { status: 422 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    }

    if (!canManageStaffRole(session.role, target.role)) {
      return NextResponse.json(
        { error: `Forbidden: ${session.role} cannot modify a ${target.role} account.` },
        { status: 403 }
      );
    }

    if (parsed.data.role && !canManageStaffRole(session.role, parsed.data.role)) {
      return NextResponse.json(
        { error: `Forbidden: ${session.role} cannot assign role ${parsed.data.role}.` },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: {
          role: parsed.data.role,
          isActive: parsed.data.isActive,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "STAFF_USER_UPDATED",
        entityType: "User",
        entityId: id,
        metadata: { role: user.role, isActive: user.isActive },
      });

      return user;
    });

    return NextResponse.json({ staff: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update staff";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
