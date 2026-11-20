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
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency, formatTime } from "@/lib/formatting/currency";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface DashboardPayload {
  gymName: string;
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

const PLAN_COLORS = ["#E32935", "#4B91F1", "#2BCB83", "#F2B84B"];

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

  return (
    <div className="space-y-6 animate-panel-enter">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-3xl font-bold tracking-tight text-[#F5F6F8]"
              style={{ fontFamily: "var(--font-barlow), sans-serif" }}
            >
              OPERATIONS DASHBOARD
            </h1>
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
          <p className="mt-1 text-sm text-[#A4AAB5]">
            Live membership, attendance, and over-the-counter collection summary.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[#292E38] bg-[#111318] p-1">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
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
        <Link
          href="/members"
          className="rounded-xl border border-[#292E38] bg-[#111318] p-5 transition-colors hover:border-[#363D4A] hover:bg-[#171A21]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4AAB5]">Total Members</span>
            <Users className="h-4 w-4 text-[#4B91F1]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#F5F6F8] tabular-nums">
            {loading ? "—" : data?.kpis.totalMembers ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">Non-archived profiles</p>
        </Link>

        <Link
          href="/members?status=ACTIVE"
          className="rounded-xl border border-[#292E38] bg-[#111318] p-5 transition-colors hover:border-[#363D4A] hover:bg-[#171A21]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4AAB5]">Active Members</span>
            <UserCheck className="h-4 w-4 text-[#2BCB83]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#F5F6F8] tabular-nums">
            {loading ? "—" : data?.kpis.activeMembers ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">
            {loading ? "" : `${data?.kpis.expiringSoonCount ?? 0} expiring in 7 days`}
          </p>
        </Link>

        <Link
          href="/check-in"
          className="rounded-xl border border-[#292E38] bg-[#111318] p-5 transition-colors hover:border-[#363D4A] hover:bg-[#171A21]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A4AAB5]">Check-Ins Today</span>
            <ScanLine className="h-4 w-4 text-[#2BCB83]" />
          </div>
          <p className="mt-3 text-3xl font-bold text-[#F5F6F8] tabular-nums">
            {loading ? "—" : data?.kpis.checkInsToday ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">Approved QR & manual entries</p>
        </Link>

        {data?.kpis.revenueToday !== null ? (
          <Link
            href="/plans-payments"
            className="rounded-xl border border-[#292E38] bg-[#111318] p-5 transition-colors hover:border-[#363D4A] hover:bg-[#171A21]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A4AAB5]">Revenue Today</span>
              <Banknote className="h-4 w-4 text-[#E32935]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#F5F6F8] tabular-nums">
              {loading ? "—" : formatCurrency(data?.kpis.revenueToday ?? 0)}
            </p>
            <p className="mt-1 text-xs text-[#747C89]">Over-the-counter posted total</p>
          </Link>
        ) : (
          <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#A4AAB5]">Expiring Soon</span>
              <Users className="h-4 w-4 text-[#F2B84B]" />
            </div>
            <p className="mt-3 text-3xl font-bold text-[#F5F6F8] tabular-nums">
              {loading ? "—" : data?.kpis.expiringSoonCount ?? 0}
            </p>
            <p className="mt-1 text-xs text-[#747C89]">Memberships ending within 7 days</p>
          </div>
        )}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-[#F5F6F8]">
                Membership Activity ({days} Days)
              </h2>
              <p className="text-xs text-[#747C89]">New registrations vs. renewals</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#A4AAB5]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#4B91F1]" />
                New Members
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#E32935]" />
                Renewals
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-[#747C89]">
                Loading activity chart...
              </div>
            ) : !data?.membershipTrend.length ? (
              <div className="flex h-full items-center justify-center text-xs text-[#747C89]">
                No membership activity in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.membershipTrend}>
                  <CartesianGrid stroke="#292E38" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#747C89"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#747C89"
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
                  <Line
                    type="monotone"
                    dataKey="newMembers"
                    name="New Members"
                    stroke="#4B91F1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                  <Line
                    type="monotone"
                    dataKey="renewals"
                    name="Renewals"
                    stroke="#E32935"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    isAnimationActive={true}
                    animationDuration={350}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <h2 className="text-base font-semibold text-[#F5F6F8]">Active Plan Mix</h2>
          <p className="text-xs text-[#747C89]">Current active memberships by tier</p>

          <div className="mt-4 h-44 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-[#747C89]">
                Loading...
              </div>
            ) : !data?.planDistribution.length ? (
              <div className="flex h-full items-center justify-center text-xs text-[#747C89]">
                No active plans yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.planDistribution}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    isAnimationActive={true}
                    animationDuration={400}
                  >
                    {data.planDistribution.map((_, idx) => (
                      <Cell key={idx} fill={PLAN_COLORS[idx % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171A21",
                      border: "1px solid #292E38",
                      borderRadius: "8px",
                      color: "#F5F6F8",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {data?.planDistribution.map((plan, idx) => (
              <div key={plan.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-[#A4AAB5]">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                  />
                  {plan.name}
                </span>
                <span className="font-medium text-[#F5F6F8] tabular-nums">
                  {plan.count} ({plan.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Actions + Recent Check-Ins */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <h2 className="text-base font-semibold text-[#F5F6F8]">Quick Actions</h2>
          <p className="text-xs text-[#747C89]">Common front-desk workflows</p>

          <div className="mt-4 grid grid-cols-1 gap-2.5">
            <Link
              href="/check-in"
              className="flex items-center gap-3 rounded-lg border border-[#E32935]/40 bg-[#E32935]/12 px-4 py-3 text-sm font-medium text-[#F5F6F8] transition-colors hover:bg-[#E32935]/20"
            >
              <ScanLine className="h-4 w-4 text-[#E32935]" />
              <span>Scan Member QR Check-In</span>
            </Link>
            <Link
              href="/members?new=1"
              className="flex items-center gap-3 rounded-lg border border-[#292E38] bg-[#171A21] px-4 py-3 text-sm font-medium text-[#F5F6F8] transition-colors hover:bg-[#20242D]"
            >
              <UserPlus className="h-4 w-4 text-[#4B91F1]" />
              <span>Register New Member</span>
            </Link>
            <Link
              href="/qr-generator"
              className="flex items-center gap-3 rounded-lg border border-[#292E38] bg-[#171A21] px-4 py-3 text-sm font-medium text-[#F5F6F8] transition-colors hover:bg-[#20242D]"
            >
              <QrCode className="h-4 w-4 text-[#2BCB83]" />
              <span>Issue Member QR Credential</span>
            </Link>
            <Link
              href="/plans-payments?record=1"
              className="flex items-center gap-3 rounded-lg border border-[#292E38] bg-[#171A21] px-4 py-3 text-sm font-medium text-[#F5F6F8] transition-colors hover:bg-[#20242D]"
            >
              <CreditCard className="h-4 w-4 text-[#F2B84B]" />
              <span>Record Over-the-Counter Payment</span>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#F5F6F8]">Recent Check-Ins</h2>
              <p className="text-xs text-[#747C89]">Latest QR and manual desk entries</p>
            </div>
            <Link
              href="/check-in"
              className="text-xs font-medium text-[#E32935] hover:text-[#F13A46]"
            >
              Open Scanner
            </Link>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-[#747C89]">Loading check-ins...</p>
          ) : !data?.recentCheckIns.length ? (
            <p className="py-8 text-center text-xs text-[#747C89]">
              No check-ins recorded yet today.
            </p>
          ) : (
            <div className="divide-y divide-[#292E38]">
              {data.recentCheckIns.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/members/${item.memberId}`}
                      className="font-medium text-[#F5F6F8] hover:underline"
                    >
                      {item.memberName}
                    </Link>
                    <p className="text-xs text-[#747C89]">
                      {item.memberCode} · {item.method} · {formatTime(item.checkedInAt)}
                      {item.denialReason ? ` — ${item.denialReason}` : ""}
                    </p>
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
