import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { canManageStaffRole, getAssignableRoles } from "@/lib/permissions/rbac";
import { staffCreateSchema } from "@/lib/validation/schemas";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET() {
  try {
    const session = await requireStaffSession("staff:manage");
    const staff = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      staff,
      assignableRoles: getAssignableRoles(session.role),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load staff";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireStaffSession("staff:manage");
    const body = await request.json();
    const parsed = staffCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid staff details." },
        { status: 422 }
      );
    }

    const { name, email, password, role } = parsed.data;
    if (!canManageStaffRole(session.role, role)) {
      return NextResponse.json(
        { error: `Forbidden: ${session.role} cannot create a ${role} account.` },
        { status: 403 }
      );
    }

    const cleanEmail = email.toLowerCase();
    const [existingUser, existingMember] = await Promise.all([
      prisma.user.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
      prisma.member.findUnique({ where: { email: cleanEmail }, select: { id: true } }),
    ]);
    if (existingUser || existingMember) {
      return NextResponse.json(
        { error: "This email address is already registered to another account." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role,
          isActive: true,
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
        action: "STAFF_USER_CREATED",
        entityType: "User",
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      });

      return user;
    });

    return NextResponse.json({ staff: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create staff";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
