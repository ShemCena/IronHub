import { redirect } from "next/navigation";
import { getStaffSession, type StaffSession } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/permissions/rbac";

/** Server-side page guard: unauthenticated -> /login, unauthorized -> /dashboard. */
export async function guardPage(permission: Permission): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/login");
  if (!hasPermission(session.role, permission)) redirect("/dashboard");
  return session;
}
