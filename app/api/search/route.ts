import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/rbac";

export async function GET(request: Request) {
  try {
    const session = await requireStaffSession("members:view");
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (q.length < 2) {
      return NextResponse.json({ members: [], plans: [] });
    }

    const canViewPlans = hasPermission(session.role, "plans:view");

    const [members, plans] = await Promise.all([
      prisma.member.findMany({
        where: {
          status: { not: "ARCHIVED" },
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { memberCode: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 6,
        select: {
          id: true,
          memberCode: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      }),
      canViewPlans
        ? prisma.membershipPlan.findMany({
            where: {
              isActive: true,
              name: { contains: q, mode: "insensitive" },
            },
            take: 4,
            select: { id: true, name: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        memberCode: m.memberCode,
        name: `${m.firstName} ${m.lastName}`,
        status: m.status,
      })),
      plans: plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    const status = message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
