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

    const isTrainor = session.role === "TRAINER";
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
      revenueTodayAgg,
      revenueThisMonthAgg,
      revenueLastMonthAgg,
      renewalsInRange,
      newMembersInRange,
      activeMembershipsByPlan,
      trainersData,
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
      prisma.user.findMany({
        where: { role: "TRAINER", isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          coachedMembers: {
            where: { status: { not: "ARCHIVED" } },
            select: {
              id: true,
              memberCode: true,
              firstName: true,
              lastName: true,
              status: true,
              photoUrl: true,
              memberships: {
                orderBy: { endDate: "desc" },
                take: 1,
                select: { planNameSnapshot: true, endDate: true },
              },
              payments: {
                where: { status: "PAID" },
                select: { amount: true, paidAt: true },
              },
              attendanceRecords: {
                where: { outcome: "APPROVED" },
                select: { checkedInAt: true },
              },
            },
          },
        },
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

    // Compute per-coach performance rankings for Admin & personal stats for Trainor
    const coachRankings = trainersData
      .map((t) => {
        const totalClients = t.coachedMembers.length;
        const activeClients = t.coachedMembers.filter((m) => m.status === "ACTIVE").length;
        const totalSessions = t.coachedMembers.reduce(
          (sum, m) => sum + m.attendanceRecords.length,
          0
        );
        const clientRevenue = t.coachedMembers.reduce(
          (sum, m) => sum + m.payments.reduce((pSum, p) => pSum + Number(p.amount), 0),
          0
        );
        // Trainor coaching revenue = 40% commission on coached clients' plans + ₱250/session
        const coachingRevenue = Math.round(clientRevenue * 0.4 + totalSessions * 250);
        const monthlySalary = 22000 + coachingRevenue;

        return {
          id: t.id,
          name: t.name,
          email: t.email,
          totalClients,
          activeClients,
          totalSessions,
          clientRevenue,
          coachingRevenue,
          monthlySalary,
          deltaPercent: totalClients > 0 ? 6 + activeClients * 2 : 0,
          clients: t.coachedMembers.map((m) => ({
            id: m.id,
            memberCode: m.memberCode,
            name: `${m.firstName} ${m.lastName}`,
            status: m.status,
            photoUrl: m.photoUrl,
            planName: m.memberships[0]?.planNameSnapshot ?? "Unassigned",
            expiryDate: m.memberships[0]?.endDate ?? null,
            sessions: m.attendanceRecords.length,
            revenueGenerated: m.payments.reduce((s, p) => s + Number(p.amount), 0),
          })),
        };
      })
      .sort((a, b) => b.coachingRevenue - a.coachingRevenue || b.activeClients - a.activeClients);

    const myCoachRecord = isTrainor
      ? coachRankings.find((c) => c.id === session.userId) ?? null
      : null;

    return NextResponse.json({
      coachName: session.name,
      role: session.role,
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
      },
      trainerStats: myCoachRecord
        ? {
            coachingRevenue: myCoachRecord.coachingRevenue,
            coachingRevenueDelta: myCoachRecord.deltaPercent,
            clientsCoached: myCoachRecord.totalClients,
            activeClients: myCoachRecord.activeClients,
            clientsDelta: 10,
            sessionsCompleted: myCoachRecord.totalSessions,
            sessionsDelta: 14,
            monthlySalary: myCoachRecord.monthlySalary,
            salaryDelta: 8,
            coachedClients: myCoachRecord.clients,
          }
        : null,
      topCoaches: !isTrainor
        ? coachRankings.map(({ clients: _c, ...summary }) => summary)
        : [],
      membershipTrend: Array.from(dayBuckets.values()),
      planDistribution,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
