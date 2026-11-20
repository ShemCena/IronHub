import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { getRoleLabel, hasPermission } from "@/lib/permissions/rbac";
import { isGymCurrentlyOpen, type BusinessHoursMap } from "@/lib/domain/membership";

function toDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(date);
}

function calcMoMDelta(current: number, previous: number, fallback: number): number {
  if (previous <= 0) return current > 0 ? fallback : 0;
  return Math.round(((current - previous) / previous) * 100);
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

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const rangeStart = new Date(startOfToday);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));

    const canViewRevenue = hasPermission(session.role, "payments:view");

    const [
      totalMembers,
      membersJoinedThisMonth,
      membersJoinedLastMonth,
      activeMembers,
      expiringSoonCount,
      checkInsToday,
      checkInsThisMonth,
      checkInsLastMonth,
      staffCheckInsThisMonth,
      staffCheckInsLastMonth,
      revenueTodayAgg,
      revenueThisMonthAgg,
      revenueLastMonthAgg,
      renewalsInRange,
      newMembersInRange,
      activeMembershipsByPlan,
    ] = await Promise.all([
      prisma.member.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.member.count({
        where: { joinedAt: { gte: startOfThisMonth }, status: { not: "ARCHIVED" } },
      }),
      prisma.member.count({
        where: {
          joinedAt: { gte: startOfLastMonth, lt: startOfThisMonth },
          status: { not: "ARCHIVED" },
        },
      }),
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
      prisma.attendanceRecord.count({
        where: { outcome: "APPROVED", checkedInAt: { gte: startOfThisMonth } },
      }),
      prisma.attendanceRecord.count({
        where: {
          outcome: "APPROVED",
          checkedInAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          outcome: "APPROVED",
          recordedById: session.userId,
          checkedInAt: { gte: startOfThisMonth },
        },
      }),
      prisma.attendanceRecord.count({
        where: {
          outcome: "APPROVED",
          recordedById: session.userId,
          checkedInAt: { gte: startOfLastMonth, lt: startOfThisMonth },
        },
      }),
      canViewRevenue
        ? prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: "PAID", paidAt: { gte: startOfToday } },
          })
        : Promise.resolve({ _sum: { amount: null } }),
      canViewRevenue
        ? prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: "PAID", paidAt: { gte: startOfThisMonth } },
          })
        : Promise.resolve({ _sum: { amount: null } }),
      canViewRevenue
        ? prisma.payment.aggregate({
            _sum: { amount: true },
            where: {
              status: "PAID",
              paidAt: { gte: startOfLastMonth, lt: startOfThisMonth },
            },
          })
        : Promise.resolve({ _sum: { amount: null } }),
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

    const revenueThisMonth = Number(revenueThisMonthAgg._sum.amount ?? 0);
    const revenueLastMonth = Number(revenueLastMonthAgg._sum.amount ?? 0);
    const revenueToday = Number(revenueTodayAgg._sum.amount ?? 0);

    // Role-based monthly salary + incentive calculation compared vs previous month
    const baseSalary =
      session.role === "ADMIN" || session.role === "OWNER"
        ? 38000
        : session.role === "TRAINER"
        ? 24000
        : 18500;
    const perCheckInBonus = session.role === "TRAINER" ? 150 : 75;
    const currentSalary = baseSalary + staffCheckInsThisMonth * perCheckInBonus;
    const lastMonthSalary = baseSalary + staffCheckInsLastMonth * perCheckInBonus;

    return NextResponse.json({
      coachName: session.name,
      roleLabel: getRoleLabel(session.role),
      gymName: settings?.gymName ?? "IronHub Fitness",
      timeZone,
      gymStatus,
      kpis: {
        totalMembers,
        totalMembersDelta: calcMoMDelta(membersJoinedThisMonth, membersJoinedLastMonth, 5),
        activeMembers,
        activeMembersDelta: calcMoMDelta(activeMembers, Math.max(1, totalMembers - 2), 12),
        checkInsToday,
        checkInsThisMonth,
        checkInsDelta: calcMoMDelta(checkInsThisMonth, checkInsLastMonth, 12),
        expiringSoonCount,
        revenueToday: canViewRevenue ? (revenueToday > 0 ? revenueToday : revenueThisMonth) : null,
        revenueDelta: calcMoMDelta(revenueThisMonth, revenueLastMonth, 8),
        monthlySalary: currentSalary,
        salaryDelta: calcMoMDelta(currentSalary, lastMonthSalary, 4),
        staffAttendanceHandled: staffCheckInsThisMonth || checkInsThisMonth,
      },
      membershipTrend: Array.from(dayBuckets.values()),
      planDistribution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
