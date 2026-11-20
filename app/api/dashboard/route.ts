import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/rbac";
import { isGymCurrentlyOpen, type BusinessHoursMap } from "@/lib/domain/membership";

function toDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

export async function GET(request: Request) {
  try {
    const session = await requireStaffSession("dashboard:view");
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? "7");
    const days = [7, 30, 90].includes(daysParam) ? daysParam : 7;

    const settings = await prisma.gymSetting.findUnique({ where: { id: "default" } });
    const timeZone = settings?.timezone ?? "Asia/Manila";

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));

    const canViewRevenue = hasPermission(session.role, "payments:view");

    const [
      totalMembers,
      activeMembers,
      expiringSoonCount,
      checkInsToday,
      revenueTodayAgg,
      recentCheckIns,
      renewalsInRange,
      newMembersInRange,
      activeMembershipsByPlan,
    ] = await Promise.all([
      prisma.member.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.member.count({ where: { status: "ACTIVE" } }),
      prisma.membership.count({
        where: {
          status: "ACTIVE",
          endDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.attendanceRecord.count({
        where: { outcome: "APPROVED", checkedInAt: { gte: startOfToday } },
      }),
      canViewRevenue
        ? prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: "PAID", paidAt: { gte: startOfToday } },
          })
        : Promise.resolve({ _sum: { amount: null } }),
      prisma.attendanceRecord.findMany({
        take: 6,
        orderBy: { checkedInAt: "desc" },
        include: {
          member: {
            select: { id: true, memberCode: true, firstName: true, lastName: true, status: true },
          },
        },
      }),
      prisma.membership.findMany({
        where: { startDate: { gte: rangeStart }, isRenewal: true },
        select: { startDate: true },
      }),
      prisma.member.findMany({
        where: { joinedAt: { gte: rangeStart }, status: { not: "ARCHIVED" } },
        select: { joinedAt: true },
      }),
      prisma.membership.groupBy({
        by: ["planNameSnapshot"],
        where: { status: "ACTIVE", endDate: { gte: now } },
        _count: { _all: true },
      }),
    ]);

    const dayBuckets = new Map<string, { label: string; newMembers: number; renewals: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const key = toDateKey(d, timeZone);
      const label = d.toLocaleDateString("en-US", {
        weekday: days <= 7 ? "short" : undefined,
        month: days > 7 ? "short" : undefined,
        day: days > 7 ? "numeric" : undefined,
        timeZone,
      });
      dayBuckets.set(key, { label, newMembers: 0, renewals: 0 });
    }

    for (const m of newMembersInRange) {
      const key = toDateKey(m.joinedAt, timeZone);
      const bucket = dayBuckets.get(key);
      if (bucket) bucket.newMembers += 1;
    }

    for (const r of renewalsInRange) {
      const key = toDateKey(r.startDate, timeZone);
      const bucket = dayBuckets.get(key);
      if (bucket) bucket.renewals += 1;
    }

    const totalPlanCount = activeMembershipsByPlan.reduce(
      (acc, item) => acc + item._count._all,
      0
    );

    const planDistribution = activeMembershipsByPlan.map((item) => ({
      name: item.planNameSnapshot,
      count: item._count._all,
      percentage: totalPlanCount > 0 ? Math.round((item._count._all / totalPlanCount) * 100) : 0,
    }));

    const gymStatus = isGymCurrentlyOpen(
      (settings?.businessHours as BusinessHoursMap | undefined) ?? null,
      timeZone
    );

    return NextResponse.json({
      coachName: session.name,
      gymName: settings?.gymName ?? "IronHub Fitness",
      timeZone,
      gymStatus,
      kpis: {
        totalMembers,
        activeMembers,
        checkInsToday,
        expiringSoonCount,
        revenueToday: canViewRevenue ? Number(revenueTodayAgg._sum.amount ?? 0) : null,
      },
      membershipTrend: Array.from(dayBuckets.values()),
      planDistribution,
      recentCheckIns: recentCheckIns.map((r) => ({
        id: r.id,
        memberId: r.member.id,
        memberCode: r.member.memberCode,
        memberName: `${r.member.firstName} ${r.member.lastName}`,
        method: r.method,
        outcome: r.outcome,
        denialReason: r.denialReason,
        checkedInAt: r.checkedInAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
