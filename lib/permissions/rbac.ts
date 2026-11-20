import type { StaffRole } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "members:view"
  | "members:write"
  | "members:archive"
  | "checkin:perform"
  | "qr:revoke"
  | "plans:view"
  | "plans:manage"
  | "payments:view"
  | "payments:record"
  | "payments:refund_void"
  | "reports:view"
  | "reports:export"
  | "settings:view"
  | "settings:manage"
  | "staff:manage"
  | "audit:view"
  | "account:self";

const ADMIN_PERMISSIONS = new Set<Permission>([
  "dashboard:view",
  "members:view",
  "members:write",
  "members:archive",
  "checkin:perform",
  "qr:revoke",
  "plans:view",
  "plans:manage",
  "payments:view",
  "payments:record",
  "payments:refund_void",
  "reports:view",
  "reports:export",
  "settings:view",
  "settings:manage",
  "staff:manage",
  "audit:view",
  "account:self",
]);

/**
 * 3-Role System:
 * 1. ADMIN   -> "Admin" (handles all gym operations, front-desk, billing, coach tracking, settings)
 * 2. TRAINER -> "Trainor" (views personal coaching revenue, coached clients, attendance, salary)
 * 3. Member  -> "Client" (Client Portal /portal — attendance, plan expiry, photo upload, QR pass)
 * (Legacy OWNER / FRONT_DESK enum values map to ADMIN for backward compatibility)
 */
const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  OWNER: ADMIN_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  FRONT_DESK: ADMIN_PERMISSIONS,
  TRAINER: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "members:write",
    "account:self",
  ]),
};

export function hasPermission(role: StaffRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function assertPermission(role: StaffRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: role ${getRoleLabel(role)} lacks permission ${permission}`);
  }
}

/** Admins can add and manage Admin and Trainor accounts (3-role model). */
export function getAssignableRoles(actor: StaffRole): StaffRole[] {
  if (actor === "ADMIN" || actor === "OWNER") {
    return ["ADMIN", "TRAINER"];
  }
  return [];
}

export function canManageStaffRole(actor: StaffRole, target: StaffRole): boolean {
  if (actor === "ADMIN" || actor === "OWNER") {
    return target === "ADMIN" || target === "TRAINER" || target === "OWNER";
  }
  return false;
}

export function getRoleLabel(role: StaffRole): string {
  switch (role) {
    case "OWNER":
    case "ADMIN":
    case "FRONT_DESK":
      return "Admin";
    case "TRAINER":
      return "Trainor";
  }
}
