import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireStaffSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/rbac";

export async function GET(request: Request) {
  try {
    const session = await requireStaffSession("reports:view");
    const { searchParams } = new URL(request.url);
    const daysParam = Number(searchParams.get("days") ?? "30");
    const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
    const format = searchParams.get("format");

    if (format === "csv" && !hasPermission(session.role, "reports:export")) {
      return NextResponse.json({ error: "Forbidden: export not permitted." }, { status: 403 });
    }

    const now = new Date();
    const rangeStart = new Date(now);
    rangeStart.setDate(rangeStart.getDate() - (days - 1));
    rangeStart.setHours(0, 0, 0, 0);

    const [payments, newMembers, checkIns, renewals, activeMemberships] =
      await Promise.all([
        prisma.payment.findMany({
          where: { paidAt: { gte: rangeStart }, status: { in: ["PAID", "REFUNDED"] } },
          orderBy: { paidAt: "asc" },
          include: {
            member: { select: { memberCode: true, firstName: true, lastName: true } },
            membership: { select: { planNameSnapshot: true } },
          },
        }),
        prisma.member.count({
          where: { createdAt: { gte: rangeStart }, status: { not: "ARCHIVED" } },
        }),
        prisma.attendanceRecord.count({
          where: { checkedInAt: { gte: rangeStart }, outcome: "APPROVED" },
        }),
        prisma.membership.count({
          where: { createdAt: { gte: rangeStart }, isRenewal: true },
        }),
        prisma.membership.groupBy({
          by: ["planNameSnapshot"],
          where: { status: "ACTIVE", endDate: { gte: now } },
          _count: { _all: true },
        }),
      ]);

    const grossRevenue = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const refundedAmount = payments
      .filter((p) => p.status === "REFUNDED")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const netRevenue = Math.max(0, grossRevenue - refundedAmount);

    if (format === "csv") {
      const header = "Receipt,Member Code,Member Name,Plan,Method,Status,Amount (PHP),Paid At\n";
      const rows = payments
        .map((p) =>
          [
            p.receiptNumber,
            p.member.memberCode,
            `"${p.member.firstName} ${p.member.lastName}"`,
            `"${p.membership?.planNameSnapshot ?? "Manual"}"`,
            p.method,
            p.status,
            Number(p.amount).toFixed(2),
            p.paidAt.toISOString(),
          ].join(",")
        )
        .join("\n");

      return new NextResponse(header + rows, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ironhub-report-${days}d.csv"`,
        },
      });
    }

    const dailyMap = new Map<string, { label: string; revenue: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dailyMap.set(key, { label, revenue: 0 });
    }

    for (const p of payments) {
      if (p.status !== "PAID") continue;
      const key = p.paidAt.toISOString().slice(0, 10);
      const bucket = dailyMap.get(key);
      if (bucket) bucket.revenue += Number(p.amount);
    }

    const methodMap = new Map<string, number>();
    for (const p of payments) {
      if (p.status !== "PAID") continue;
      methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + Number(p.amount));
    }

    const totalActivePlans = activeMemberships.reduce((s, a) => s + a._count._all, 0);
    const retentionRate =
      newMembers + renewals > 0
        ? Math.min(99, Math.round((renewals / Math.max(1, newMembers + renewals)) * 100))
        : 0;

    return NextResponse.json({
      days,
      summary: {
        grossRevenue,
        refundedAmount,
        netRevenue,
        newMembers,
        checkIns,
        renewals,
        retentionRate,
      },
      revenueSeries: Array.from(dailyMap.values()),
      paymentMethodBreakdown: Array.from(methodMap.entries()).map(([method, total]) => ({
        method,
        total,
      })),
      topPlans: activeMemberships.map((p) => ({
        name: p.planNameSnapshot,
        count: p._count._all,
        percentage: totalActivePlans > 0 ? Math.round((p._count._all / totalActivePlans) * 100) : 0,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load reports";
    const status = message.startsWith("Unauthorized") ? 401 : message.startsWith("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
