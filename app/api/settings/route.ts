import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { gymSettingsSchema } from "@/lib/validation/schemas";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/domain/membership";
import { getAssignableRoles, getRoleLabel, hasPermission } from "@/lib/permissions/rbac";
import { writeAuditLog } from "@/lib/audit/log";

export async function GET(request: Request) {
  try {
    const session = await requireStaffSession("account:self");
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") ?? "all"; // "settings" | "staff" | "audit" | "all"

    const canViewGymSettings = hasPermission(session.role, "settings:view");
    const canManageGymSettings = hasPermission(session.role, "settings:manage");
    const canManageStaff = hasPermission(session.role, "staff:manage");
    const canViewAudit = hasPermission(session.role, "audit:view");

    const loadSettings = canViewGymSettings && (scope === "all" || scope === "settings");
    const loadStaff = canManageStaff && (scope === "all" || scope === "staff");
    const loadAudit = canViewAudit && (scope === "all" || scope === "audit");

    const [settings, staff, auditLogs] = await Promise.all([
      loadSettings
        ? prisma.gymSetting.findUnique({ where: { id: "default" } })
        : Promise.resolve(null),
      loadStaff
        ? prisma.user.findMany({
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              lastLoginAt: true,
            },
          })
        : Promise.resolve([]),
      loadAudit
        ? prisma.auditLog.findMany({
            take: 200,
            orderBy: { createdAt: "desc" },
            include: { actor: { select: { name: true, role: true } } },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      currentUser: {
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        roleLabel: getRoleLabel(session.role),
      },
      permissions: {
        canViewGymSettings,
        canManageGymSettings,
        canManageStaff,
        canViewAudit,
        assignableRoles: getAssignableRoles(session.role),
      },
      settings: canViewGymSettings
        ? settings ?? {
            id: "default",
            gymName: "IronHub Fitness",
            email: "support@ironhub.ph",
            phone: "+63 917 000 0000",
            address: "123 Fitness Street, Cadiz City",
            timezone: "Asia/Manila",
            currency: "PHP",
            businessHours: DEFAULT_BUSINESS_HOURS,
            allowMultipleCheckInsPerDay: false,
            duplicateCheckInWindowMinutes: 30,
            expiryReminderDays: 7,
          }
        : null,
      staff,
      auditLogs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireStaffSession("settings:manage");
    const body = await request.json();
    const parsed = gymSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid settings values." },
        { status: 422 }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.gymSetting.upsert({
        where: { id: "default" },
        update: parsed.data,
        create: {
          id: "default",
          ...parsed.data,
        },
      });

      await writeAuditLog(tx, {
        actorId: session.userId,
        action: "GYM_SETTINGS_UPDATED",
        entityType: "GymSetting",
        entityId: "default",
      });

      return saved;
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
