"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarCheck,
  ScanLine,
  Banknote,
  QrCode,
  UserPlus,
  CreditCard,
  AlertCircle,
  ChevronRight,
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
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

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

  const timeZone = data?.timeZone ?? "Asia/Manila";
  const firstName = data?.coachName?.split(" ")[0] ?? "Coach";

  const dateLabel = now
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone,
      }).format(now)
    : "";

  const timeLabel = now
    ? new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone,
      }).format(now)
    : "";

  return (
    <div className="space-y-4">
      {/* Compressed Athletic Hero Banner */}
      <section className="animate-panel-enter relative min-h-[164px] overflow-hidden rounded-2xl border border-[#242934] bg-[#0D0F14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-athlete.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-80"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090A0D] via-[#090A0D]/75 to-[#090A0D]/40"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090A0D] via-transparent to-transparent"
          aria-hidden="true"
        />

        <div className="relative flex min-h-[164px] flex-col justify-between gap-4 p-5 md:flex-row md:items-center md:px-6">
          <div className="max-w-md">
            <h1 className="text-2xl font-bold leading-[1.1] tracking-tight text-white sm:text-3xl">
              Welcome back,
              <span className="mt-0.5 block italic text-[#E32935]">{firstName}!</span>
            </h1>
            <p className="mt-1.5 text-xs text-[#A4AAB5]">
              Here&apos;s what&apos;s happening at {data?.gymName ?? "your gym"} today.
            </p>
          </div>

          <div className="flex flex-col items-start gap-1.5 md:items-end">
            {dateLabel && (
              <p className="text-[11px] font-medium text-[#A4AAB5]">{dateLabel}</p>
            )}
            {timeLabel && (
              <p className="text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">
                {timeLabel}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {data && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-medium",
                    data.gymStatus.isOpen ? "text-[#2BCB83]" : "text-[#F05252]"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      data.gymStatus.isOpen ? "bg-[#2BCB83]" : "bg-[#F05252]"
                    )}
                    aria-hidden="true"
                  />
                  {data.gymStatus.label}
                </span>
              )}

              <div className="flex items-center gap-1 rounded-lg border border-[#242934] bg-[#0D0F14]/85 p-0.5 backdrop-blur-sm">
                {([7, 30, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                      days === d
                        ? "bg-[#E32935] text-white"
                        : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                    )}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-[#F05252]/30 bg-[#F05252]/10 p-3 text-xs text-[#F05252]"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compressed KPI Row */}
      <div className="animate-stagger-1 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <KpiCard
          label="Total Members"
          value={loading ? "—" : data?.kpis.totalMembers ?? 0}
          helper="Registered profiles"
          icon={Users}
          tone="blue"
          href="/members"
        />
        <KpiCard
          label="Active Today"
          value={loading ? "—" : data?.kpis.activeMembers ?? 0}
          helper={
            loading ? "Checking..." : `${data?.kpis.expiringSoonCount ?? 0} expiring soon`
          }
          icon={CalendarCheck}
          tone="green"
          href="/members?status=ACTIVE"
        />
        {data?.kpis.revenueToday !== null ? (
          <KpiCard
            label="Revenue Today"
            value={loading ? "—" : formatCurrency(data?.kpis.revenueToday ?? 0)}
            helper="Posted OTC today"
            icon={Banknote}
            tone="purple"
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
          label="Check-Ins"
          value={loading ? "—" : data?.kpis.checkInsToday ?? 0}
          helper="Approved entries today"
          icon={ScanLine}
          tone="green"
          href="/check-in"
        />
      </div>

      {/* Compressed 3-Column Row */}
      <div className="animate-stagger-2 grid grid-cols-1 gap-3.5 xl:grid-cols-12">
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 xl:col-span-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-[#F5F6F8]">Membership Overview</h2>
            <div className="flex items-center gap-3 text-[11px] text-[#A4AAB5]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#4B91F1]" />
                New Members
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E32935]" />
                Renewals
              </span>
            </div>
          </div>

          <div className="h-48 w-full">
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
                      <stop offset="0%" stopColor="#E32935" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#E32935" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#20242D" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#8A93A2"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#8A93A2"
                    fontSize={11}
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
                    strokeWidth={2}
                    fill="url(#newMembersFill)"
                    dot={{ r: 2.5, strokeWidth: 2, fill: "#111318" }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="renewals"
                    name="Renewals"
                    stroke="#E32935"
                    strokeWidth={2}
                    fill="url(#renewalsFill)"
                    dot={{ r: 2.5, strokeWidth: 2, fill: "#111318" }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Membership Plans Donut */}
        <div className="flex flex-col justify-between rounded-xl border border-[#242934] bg-[#111318] p-4 xl:col-span-4">
          <h2 className="text-sm font-semibold text-[#F5F6F8]">Membership Plans</h2>
          <div className="my-auto py-2">
            <PlanDistributionDonut data={data?.planDistribution ?? []} loading={loading} />
          </div>
        </div>

        {/* Role-Scoped Quick Actions */}
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 xl:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-[#F5F6F8]">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/check-in"
              className="group flex items-center justify-between rounded-xl border border-[#E32935]/30 bg-[#171A21] p-2.5 transition-colors hover:border-[#E32935]/60 hover:bg-[#1D2029]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E32935]/18 text-[#E32935]">
                  <ScanLine className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#F5F6F8]">Scan Client QR</p>
                  <p className="text-[10px] text-[#8A93A2]">Check-In Member Pass</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
            </Link>

            <Link
              href="/members"
              className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] p-2.5 transition-colors hover:border-[#363D4A] hover:bg-[#1D2029]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/18 text-[#A78BFA]">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#F5F6F8]">Add Member</p>
                  <p className="text-[10px] text-[#8A93A2]">New Registration</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
            </Link>

            {data?.kpis.revenueToday !== null && (
              <Link
                href="/plans-payments"
                className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] p-2.5 transition-colors hover:border-[#363D4A] hover:bg-[#1D2029]"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2BCB83]/18 text-[#2BCB83]">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#F5F6F8]">Record Payment</p>
                    <p className="text-[10px] text-[#8A93A2]">Over-the-Counter</p>
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}

            <Link
              href="/portal/login"
              target="_blank"
              className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] p-2.5 transition-colors hover:border-[#363D4A] hover:bg-[#1D2029]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4B91F1]/18 text-[#4B91F1]">
                  <QrCode className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#F5F6F8]">Client QR Portal</p>
                  <p className="text-[10px] text-[#8A93A2]">Self-Service Pass</p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Compressed Recent Check-Ins */}
      <div className="animate-stagger-3 rounded-xl border border-[#242934] bg-[#111318] p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#F5F6F8]">Recent Check-Ins</h2>
            <p className="text-[11px] text-[#8A93A2]">Latest scanned client QR and manual entries</p>
          </div>
          <Link
            href="/check-in"
            className="text-xs font-medium text-[#E32935] hover:text-[#F13A46]"
          >
            Open Scanner
          </Link>
        </div>

        {loading ? (
          <p className="py-6 text-center text-xs text-[#8A93A2]">Loading check-ins...</p>
        ) : !data?.recentCheckIns.length ? (
          <p className="py-6 text-center text-xs text-[#8A93A2]">
            No check-ins recorded yet today.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {data.recentCheckIns.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 rounded-lg border border-[#242934] bg-[#171A21]/60 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#292E38] bg-[#111318] text-[11px] font-semibold text-[#F5F6F8]">
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
                    <p className="truncate text-[11px] text-[#8A93A2]">
                      {item.memberCode} · {item.method} · {formatTime(item.checkedInAt)}
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
  );
}
