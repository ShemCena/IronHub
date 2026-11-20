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

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  OWNER: new Set<Permission>([
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
  ]),
  ADMIN: new Set<Permission>([
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
    "staff:manage",
    "audit:view",
    "account:self",
  ]),
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
    throw new Error(`Forbidden: role ${role} lacks permission ${permission}`);
  }
}

/** Roles an actor is allowed to create or manage. Nobody can create another Owner. */
export function getAssignableRoles(actor: StaffRole): StaffRole[] {
  if (actor === "OWNER") return ["ADMIN", "FRONT_DESK", "TRAINER"];
  if (actor === "ADMIN") return ["FRONT_DESK", "TRAINER"];
  return [];
}

export function canManageStaffRole(actor: StaffRole, target: StaffRole): boolean {
  return getAssignableRoles(actor).includes(target);
}

export function getRoleLabel(role: StaffRole): string {
  switch (role) {
    case "OWNER":
      return "Gym Owner";
    case "ADMIN":
      return "Administrator";
    case "FRONT_DESK":
      return "Front Desk Staff";
    case "TRAINER":
      return "Trainer";
  }
}
