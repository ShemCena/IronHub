"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  ScanLine,
  Banknote,
  QrCode,
  UserPlus,
  CreditCard,
  AlertCircle,
  ChevronRight,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency, formatTime } from "@/lib/formatting/currency";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { PlanDistributionDonut } from "@/components/charts/plan-distribution-donut";
import { cn } from "@/lib/utils";

interface DashboardPayload {
  coachName: string;
  gymName: string;
  timeZone: string;
  gymStatus: { isOpen: boolean; label: string };
  kpis: {
    totalMembers: number;
    activeMembers: number;
    checkInsToday: number;
    expiringSoonCount: number;
    revenueToday: number | null;
  };
  membershipTrend: { label: string; newMembers: number; renewals: number }[];
  planDistribution: { name: string; count: number; percentage: number }[];
  recentCheckIns: {
    id: string;
    memberId: string;
    memberCode: string;
    memberName: string;
    method: string;
    outcome: string;
    denialReason: string | null;
    checkedInAt: string;
  }[];
}

export default function DashboardPage() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/dashboard?days=${days}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
        return json;
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Error loading data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [days]);

  const firstName = data?.coachName?.split(" ")[0] ?? "Coach";
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: data?.timeZone ?? "Asia/Manila",
  }).format(new Date());

  return (
    <div className="space-y-6 animate-panel-enter">
      {/* Welcome Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[#292E38] bg-[#111318] p-6">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#E32935]/12 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F5F6F8] sm:text-3xl">
              Welcome back, <span className="text-[#E32935]">{firstName}!</span>
            </h1>
            <p className="mt-1 text-sm text-[#A4AAB5]">
              Here&apos;s what&apos;s happening at {data?.gymName ?? "your gym"} today.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#A4AAB5]">
                <Calendar className="h-3.5 w-3.5 text-[#8A93A2]" aria-hidden="true" />
                {todayLabel}
              </span>
              {data && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
                    data.gymStatus.isOpen
                      ? "border-[#2BCB83]/30 bg-[#2BCB83]/10 text-[#2BCB83]"
                      : "border-[#F05252]/30 bg-[#F05252]/10 text-[#F05252]"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      data.gymStatus.isOpen ? "bg-[#2BCB83]" : "bg-[#F05252]"
                    )}
                    aria-hidden="true"
                  />
                  {data.gymStatus.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-[#292E38] bg-[#171A21] p-1">
              {([7, 30, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]",
                    days === d
                      ? "bg-[#E32935] text-white"
                      : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                  )}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-[#F05252]/30 bg-[#F05252]/10 p-4 text-sm text-[#F05252]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Members"
          value={loading ? "—" : data?.kpis.totalMembers ?? 0}
          helper="Non-archived profiles"
          icon={Users}
          tone="blue"
          href="/members"
        />
        <KpiCard
          label="Active Today"
          value={loading ? "—" : data?.kpis.activeMembers ?? 0}
          helper={
            loading ? "Checking validity..." : `${data?.kpis.expiringSoonCount ?? 0} expiring in 7 days`
          }
          icon={UserCheck}
          tone="green"
          href="/members?status=ACTIVE"
        />
        {data?.kpis.revenueToday !== null ? (
          <KpiCard
            label="Revenue Today"
            value={loading ? "—" : formatCurrency(data?.kpis.revenueToday ?? 0)}
            helper="Posted over-the-counter"
            icon={Banknote}
            tone="red"
            href="/plans-payments"
          />
        ) : (
          <KpiCard
            label="Expiring Soon"
            value={loading ? "—" : data?.kpis.expiringSoonCount ?? 0}
            helper="Ending within 7 days"
            icon={Users}
            tone="amber"
            href="/members?status=EXPIRED"
          />
        )}
        <KpiCard
          label="Check-Ins Today"
          value={loading ? "—" : data?.kpis.checkInsToday ?? 0}
          helper="Approved QR & manual"
          icon={ScanLine}
          tone="green"
          href="/check-in"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#F5F6F8]">
                Membership Overview ({days} Days)
              </h2>
              <p className="text-xs text-[#8A93A2]">New registrations vs. renewals</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#A4AAB5]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#4B91F1]" />
                New Members
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E32935]" />
                Renewals
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-[#8A93A2]">
                Loading activity chart...
              </div>
            ) : !data?.membershipTrend.length ? (
              <div className="flex h-full items-center justify-center text-xs text-[#8A93A2]">
                No membership activity in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.membershipTrend}>
                  <defs>
                    <linearGradient id="newMembersFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4B91F1" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#4B91F1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="renewalsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E32935" stopOpacity={0.26} />
                      <stop offset="100%" stopColor="#E32935" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#232833" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#8A93A2"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#8A93A2"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171A21",
                      border: "1px solid #292E38",
                      borderRadius: "8px",
                      color: "#F5F6F8",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="newMembers"
                    name="New Members"
                    stroke="#4B91F1"
                    strokeWidth={2.25}
                    fill="url(#newMembersFill)"
                    dot={{ r: 3, strokeWidth: 2, fill: "#111318" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="renewals"
                    name="Renewals"
                    stroke="#E32935"
                    strokeWidth={2.25}
                    fill="url(#renewalsFill)"
                    dot={{ r: 3, strokeWidth: 2, fill: "#111318" }}
                    activeDot={{ r: 5 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="flex flex-col justify-between rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-5">
          <div>
            <h2 className="text-base font-semibold text-[#F5F6F8]">Membership Plans</h2>
            <p className="text-xs text-[#8A93A2]">Active subscribers by tier</p>
          </div>
          <div className="my-auto py-4">
            <PlanDistributionDonut data={data?.planDistribution ?? []} loading={loading} />
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions + Recent Check-Ins */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-5">
          <h2 className="text-base font-semibold text-[#F5F6F8]">Quick Actions</h2>
          <p className="text-xs text-[#8A93A2]">Common front-desk workflows</p>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            <Link
              href="/check-in"
              className="group flex items-center justify-between rounded-xl border border-[#E32935]/35 bg-[#E32935]/10 px-3.5 py-3 transition-colors hover:bg-[#E32935]/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E32935]/20 text-[#E32935]">
                  <ScanLine className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#F5F6F8]">Scan Now</p>
                  <p className="text-xs text-[#A4AAB5]">Check in members via QR</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#A4AAB5] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/qr-generator"
              className="group flex items-center justify-between rounded-xl border border-[#292E38] bg-[#171A21] px-3.5 py-3 transition-colors hover:bg-[#20242D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2BCB83]/15 text-[#2BCB83]">
                  <QrCode className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#F5F6F8]">Generate QR</p>
                  <p className="text-xs text-[#8A93A2]">Issue member access pass</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/members"
              className="group flex items-center justify-between rounded-xl border border-[#292E38] bg-[#171A21] px-3.5 py-3 transition-colors hover:bg-[#20242D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4B91F1]/15 text-[#4B91F1]">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#F5F6F8]">Add Member</p>
                  <p className="text-xs text-[#8A93A2]">New profile &amp; registration</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/plans-payments"
              className="group flex items-center justify-between rounded-xl border border-[#292E38] bg-[#171A21] px-3.5 py-3 transition-colors hover:bg-[#20242D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2B84B]/15 text-[#F2B84B]">
                  <CreditCard className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#F5F6F8]">Record Payment</p>
                  <p className="text-xs text-[#8A93A2]">Over-the-counter collection</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F5F6F8]">Recent Check-Ins</h2>
              <p className="text-xs text-[#8A93A2]">Latest QR and manual desk entries</p>
            </div>
            <Link
              href="/check-in"
              className="text-xs font-medium text-[#E32935] hover:text-[#F13A46]"
            >
              Open Scanner
            </Link>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-[#8A93A2]">Loading check-ins...</p>
          ) : !data?.recentCheckIns.length ? (
            <p className="py-8 text-center text-xs text-[#8A93A2]">
              No check-ins recorded yet today.
            </p>
          ) : (
            <div className="divide-y divide-[#292E38]">
              {data.recentCheckIns.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-xs font-semibold text-[#F5F6F8]">
                      {item.memberName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/members/${item.memberId}`}
                        className="font-medium text-[#F5F6F8] hover:underline"
                      >
                        {item.memberName}
                      </Link>
                      <p className="truncate text-xs text-[#8A93A2]">
                        {item.memberCode} · {item.method} · {formatTime(item.checkedInAt)}
                        {item.denialReason ? ` — ${item.denialReason}` : ""}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={item.outcome} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
