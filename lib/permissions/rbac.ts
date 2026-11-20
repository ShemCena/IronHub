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
 * 4-Role System:
 * 1. ADMIN -> "Admin"
 * 2. FRONT_DESK -> "Staff"
 * 3. TRAINER -> "Trainor"
 * 4. Member -> "Client" (Member Portal /portal)
 * (Legacy OWNER enum maps identically to ADMIN)
 */
const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  OWNER: ADMIN_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  FRONT_DESK: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "members:write",
    "checkin:perform",
    "plans:view",
    "payments:view",
    "payments:record",
    "account:self",
  ]),
  TRAINER: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "checkin:perform",
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

/** Admins can add and manage Admin, Staff (FRONT_DESK), and Trainor (TRAINER). */
export function getAssignableRoles(actor: StaffRole): StaffRole[] {
  if (actor === "ADMIN" || actor === "OWNER") {
    return ["ADMIN", "FRONT_DESK", "TRAINER"];
  }
  return [];
}

export function canManageStaffRole(actor: StaffRole, target: StaffRole): boolean {
  if (actor === "ADMIN" || actor === "OWNER") {
    return (
      target === "ADMIN" ||
      target === "FRONT_DESK" ||
      target === "TRAINER" ||
      target === "OWNER"
    );
  }
  return false;
}

export function getRoleLabel(role: StaffRole): string {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "Admin";
    case "FRONT_DESK":
      return "Staff";
    case "TRAINER":
      return "Trainor";
  }
}
