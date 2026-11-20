import type { StaffRole } from "@prisma/client";

export type Permission =
  | "dashboard:view"
  | "members:view"
  | "members:write"
  | "members:archive"
  | "checkin:perform"
  | "qr:manage"
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
  | "audit:view";

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  OWNER: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "members:write",
    "members:archive",
    "checkin:perform",
    "qr:manage",
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
  ]),
  ADMIN: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "members:write",
    "members:archive",
    "checkin:perform",
    "qr:manage",
    "plans:view",
    "plans:manage",
    "payments:view",
    "payments:record",
    "payments:refund_void",
    "reports:view",
    "reports:export",
    "settings:view",
    "audit:view",
  ]),
  FRONT_DESK: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "members:write",
    "checkin:perform",
    "qr:manage",
    "plans:view",
    "payments:view",
    "payments:record",
  ]),
  TRAINER: new Set<Permission>([
    "dashboard:view",
    "members:view",
    "checkin:perform",
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

export function getRoleLabel(role: StaffRole): string {
  switch (role) {
    case "OWNER":
      return "Gym Owner";
    case "ADMIN":
      return "Administrator";
    case "FRONT_DESK":
      return "Front Desk";
    case "TRAINER":
      return "Trainer";
  }
}
