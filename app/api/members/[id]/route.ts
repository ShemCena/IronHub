import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { memberUpdateSchema } from "@/lib/validation/schemas";
import { hasPermission } from "@/lib/permissions/rbac";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaffSession("members:view");
    const { id } = await params;

    const canViewPayments = hasPermission(session.role, "payments:view");

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        memberships: { orderBy: { startDate: "desc" } },
        qrCredentials: { orderBy: { issuedAt: "desc" }, take: 5 },
        attendanceRecords: { orderBy: { checkedInAt: "desc" }, take: 25 },
        payments: canViewPayments
          ? { orderBy: { paidAt: "desc" }, take: 25 }
          : false,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load member";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaffSession("members:write");
    const { id } = await params;
    const body = await request.json();
    const parsed = memberUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid update payload." },
        { status: 422 }
      );
    }

    const data = parsed.data;
    if (data.status === "ARCHIVED" && !hasPermission(session.role, "members:archive")) {
      return NextResponse.json(
        { error: "Forbidden: only Owner or Admin can archive members." },
        { status: 403 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({
        where: { id },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ? data.email.toLowerCase() : null,
          phone: data.phone || null,
          emergencyContactName: data.emergencyContactName || null,
          emergencyContactPhone: data.emergencyContactPhone || null,
          address: data.address || null,
          notes: data.notes || null,
          trainerId: data.trainerId === "" ? null : data.trainerId,
          status: data.status,
          archivedAt: data.status === "ARCHIVED" ? new Date() : undefined,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: data.status ? `MEMBER_STATUS_${data.status}` : "MEMBER_UPDATED",
        entityType: "Member",
        entityId: id,
      });

      return m;
    });

    return NextResponse.json({ member: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update member";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireStaffSession("members:archive");
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id },
        data: { status: "ARCHIVED", archivedAt: new Date() },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "MEMBER_ARCHIVED",
        entityType: "Member",
        entityId: id,
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to archive member";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
