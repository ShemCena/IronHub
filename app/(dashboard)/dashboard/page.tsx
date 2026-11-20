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
  AlertCircle,
  ChevronRight,
  Wallet,
  Trophy,
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
import { formatCurrency, formatDate } from "@/lib/formatting/currency";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { PlanDistributionDonut } from "@/components/charts/plan-distribution-donut";
import { DashboardSkeleton, InlineChartLoader } from "@/components/ui/ironhub-loader";
import { getCached, setCached } from "@/lib/cache/client-cache";
import { cn } from "@/lib/utils";

interface CoachPerformance {
  id: string;
  name: string;
  email: string;
  totalClients: number;
  activeClients: number;
  totalSessions: number;
  clientRevenue: number;
  coachingRevenue: number;
  deltaPercent: number;
}

interface CoachedClientItem {
  id: string;
  memberCode: string;
  name: string;
  status: string;
  photoUrl: string | null;
  planName: string;
  expiryDate: string | null;
  sessions: number;
  trainerFee: number;
  revenueGenerated: number;
}

interface DashboardPayload {
  coachName: string;
  role: string;
  roleLabel: string;
  gymName: string;
  timeZone: string;
  gymStatus: { isOpen: boolean; label: string };
  kpis: {
    totalMembers: number;
    totalMembersDelta: number;
    activeMembers: number;
    activeMembersDelta: number;
    checkInsToday: number;
    checkInsThisMonth: number;
    checkInsDelta: number;
    expiringSoonCount: number;
    revenueToday: number | null;
    revenueDelta: number;
  };
  trainerStats: {
    coachingRevenue: number;
    coachingRevenueDelta: number;
    clientsCoached: number;
    activeClients: number;
    clientsDelta: number;
    sessionsCompleted: number;
    sessionsDelta: number;
    monthlySalary: number;
    salaryDelta: number;
    coachedClients: CoachedClientItem[];
  } | null;
  topCoaches: CoachPerformance[];
  membershipTrend: { label: string; newMembers: number; renewals: number }[];
  planDistribution: { name: string; count: number; percentage: number }[];
}

const CLIENT_PAGE_SIZE = 5;

export default function DashboardPage() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [clientPage, setClientPage] = useState(1);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    const cacheKey = `dashboard:${days}`;
    const cached = getCached<DashboardPayload>(cacheKey, 45_000);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);
    fetch(`/api/dashboard?days=${days}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
        return json;
      })
      .then((json) => {
        setCached(cacheKey, json);
        if (active) setData(json);
      })
      .catch((err) => {
        if (active && !cached) setError(err instanceof Error ? err.message : "Error loading data");
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

  const isTrainor = data?.role === "TRAINER";
  const coachedClients = data?.trainerStats?.coachedClients ?? [];
  const totalClientPages = Math.max(1, Math.ceil(coachedClients.length / CLIENT_PAGE_SIZE));
  const pagedCoachedClients = coachedClients.slice(
    (clientPage - 1) * CLIENT_PAGE_SIZE,
    clientPage * CLIENT_PAGE_SIZE
  );

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Reference Hero Banner */}
      <section className="animate-panel-enter relative min-h-[146px] overflow-hidden rounded-2xl border border-[#242934] bg-[#0D0F14]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/hero-athlete.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-80"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090A0D] via-[#090A0D]/75 to-[#090A0D]/35"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090A0D] via-transparent to-transparent"
          aria-hidden="true"
        />

        <div className="relative flex min-h-[146px] flex-col justify-between gap-3 p-5 md:flex-row md:items-center md:px-6">
          <div className="max-w-lg">
            <h1 className="text-2xl font-bold leading-[1.08] tracking-tight text-white sm:text-3xl">
              Welcome back,
              <span className="mt-0.5 block italic text-[#E32935]">{firstName}!</span>
            </h1>
            <p className="mt-1.5 text-xs text-[#A4AAB5]">
              {isTrainor
                ? "Track your coached clients, coaching revenue, and sessions."
                : `Here's what's happening at ${data?.gymName ?? "your gym"} today.`}
            </p>
          </div>

          <div className="flex flex-col items-start gap-1 md:items-end">
            {dateLabel && (
              <p className="text-xs font-medium text-[#A4AAB5]">{dateLabel}</p>
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

              {!isTrainor && (
                <div className="flex items-center gap-1 rounded-lg border border-[#242934] bg-[#0D0F14]/85 p-1 backdrop-blur-sm">
                  {([7, 30, 90] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={cn(
                        "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                        days === d
                          ? "bg-[#E32935] text-white"
                          : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                      )}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              )}
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

      {/* TRAINOR WORKSPACE VIEW */}
      {isTrainor ? (
        <>
          <div className="animate-stagger-1 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
            <KpiCard
              label="Coaching Revenue"
              value={loading ? "—" : formatCurrency(data?.trainerStats?.coachingRevenue ?? 0)}
              deltaPercent={loading ? null : data?.trainerStats?.coachingRevenueDelta ?? 8}
              icon={Banknote}
              tone="green"
            />
            <KpiCard
              label="Clients Coached"
              value={loading ? "—" : data?.trainerStats?.clientsCoached ?? 0}
              deltaPercent={loading ? null : data?.trainerStats?.clientsDelta ?? 10}
              icon={Users}
              tone="blue"
              href="/members"
            />
            <KpiCard
              label="Sessions Logged"
              value={loading ? "—" : data?.trainerStats?.sessionsCompleted ?? 0}
              deltaPercent={loading ? null : data?.trainerStats?.sessionsDelta ?? 14}
              icon={CalendarCheck}
              tone="red"
            />
            <KpiCard
              label="Monthly Salary"
              value={loading ? "—" : formatCurrency(data?.trainerStats?.monthlySalary ?? 22000)}
              deltaPercent={loading ? null : data?.trainerStats?.salaryDelta ?? 8}
              icon={Wallet}
              tone="purple"
            />
          </div>

          <div className="animate-stagger-2 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* My Coached Clients Table */}
            <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318] lg:col-span-8">
              <div className="flex items-center justify-between border-b border-[#242934] px-4 py-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-[#F5F6F8]">My Coached Clients</h2>
                  <p className="text-xs text-[#8A93A2]">
                    Clients assigned to you, their active plan, and coaching revenue
                  </p>
                </div>
                <Link
                  href="/members"
                  className="text-xs font-medium text-[#E32935] hover:text-[#F13A46]"
                >
                  View Directory
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#242934] bg-[#171A21] text-[11px] font-medium uppercase tracking-wider text-[#8A93A2]">
                    <tr>
                      <th className="px-4 py-2.5">Client</th>
                      <th className="px-4 py-2.5">Plan</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Sessions</th>
                      <th className="px-4 py-2.5 text-right">Trainor Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242934]">
                    {pagedCoachedClients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#8A93A2]">
                          No clients assigned to you yet.
                        </td>
                      </tr>
                    ) : (
                      pagedCoachedClients.map((c) => (
                        <tr key={c.id} className="hover:bg-[#171A21]">
                          <td className="px-4 py-3">
                            <Link
                              href={`/members/${c.id}`}
                              className="font-medium text-[#F5F6F8] hover:text-[#E32935]"
                            >
                              {c.name}
                            </Link>
                            <p className="font-mono text-[11px] text-[#8A93A2]">{c.memberCode}</p>
                          </td>
                          <td className="px-4 py-3 text-[#A4AAB5]">
                            <span>{c.planName}</span>
                            {c.expiryDate && (
                              <p className="text-[11px] text-[#8A93A2]">
                                Exp: {formatDate(c.expiryDate)}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-4 py-3 font-medium text-[#F5F6F8] tabular-nums">
                            {c.sessions}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#2BCB83] tabular-nums">
                            {formatCurrency(c.trainerFee ?? 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {coachedClients.length > 0 && (
                <div className="border-t border-[#242934] px-4 py-2.5">
                  <PaginationBar
                    page={clientPage}
                    totalPages={totalClientPages}
                    totalItems={coachedClients.length}
                    pageSize={CLIENT_PAGE_SIZE}
                    onPageChange={setClientPage}
                    itemLabel="clients"
                  />
                </div>
              )}
            </div>

            {/* Quick Actions for Trainor (no check-in access) */}
            <div className="flex flex-col justify-between rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-4">
              <h2 className="mb-3 text-sm font-semibold text-[#F5F6F8]">Coach Quick Actions</h2>
              <div className="my-auto space-y-2.5">
                <Link
                  href="/members"
                  className="group flex items-center justify-between rounded-xl border border-[#E32935]/30 bg-[#171A21] p-3.5 transition-colors hover:border-[#E32935]/60 hover:bg-[#1D2029]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E32935]/18 text-[#E32935]">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#F5F6F8]">My Coached Clients</p>
                      <p className="text-xs text-[#8A93A2]">View Assigned Roster</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/settings"
                  className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] p-3.5 transition-colors hover:border-[#363D4A] hover:bg-[#1D2029]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/18 text-[#A78BFA]">
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#F5F6F8]">Account Security</p>
                      <p className="text-xs text-[#8A93A2]">Update Profile &amp; Password</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ADMIN WORKSPACE VIEW */
        <>
          {/* Row 2: 4 KPI Cards in 1 Horizontal Row (md:grid-cols-4) */}
          <div className="animate-stagger-1 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
            <KpiCard
              label="Total Members"
              value={loading ? "—" : data?.kpis.totalMembers ?? 0}
              deltaPercent={loading ? null : data?.kpis.totalMembersDelta ?? 5}
              icon={Users}
              tone="blue"
              href="/members"
            />
            <KpiCard
              label="Active Today"
              value={loading ? "—" : data?.kpis.activeMembers ?? 0}
              deltaPercent={loading ? null : data?.kpis.activeMembersDelta ?? 12}
              icon={CalendarCheck}
              tone="green"
              href="/members?status=ACTIVE"
            />
            <KpiCard
              label="Revenue Today"
              value={loading ? "—" : formatCurrency(data?.kpis.revenueToday ?? 0)}
              deltaPercent={loading ? null : data?.kpis.revenueDelta ?? 8}
              icon={Banknote}
              tone="purple"
              href="/plans-payments"
            />
            <KpiCard
              label="Check-Ins"
              value={loading ? "—" : data?.kpis.checkInsToday ?? 0}
              deltaPercent={loading ? null : data?.kpis.checkInsDelta ?? 12}
              icon={ScanLine}
              tone="green"
              href="/check-in"
            />
          </div>

          {/* Row 3: 3-Column Analytics Row */}
          <div className="animate-stagger-2 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[#F5F6F8]">Membership Overview</h2>
                <div className="flex items-center gap-3 text-xs text-[#A4AAB5]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#4B91F1]" />
                    New
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#E32935]" />
                    Renewals
                  </span>
                </div>
              </div>

              <div className="h-48 w-full">
                {loading ? (
                  <InlineChartLoader label="Updating activity..." heightClass="h-48" />
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
                        width={24}
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
                        dot={{ r: 3, strokeWidth: 2, fill: "#111318" }}
                        activeDot={{ r: 4.5 }}
                        isAnimationActive={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="renewals"
                        name="Renewals"
                        stroke="#E32935"
                        strokeWidth={2}
                        fill="url(#renewalsFill)"
                        dot={{ r: 3, strokeWidth: 2, fill: "#111318" }}
                        activeDot={{ r: 4.5 }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Membership Plans Donut */}
            <div className="flex flex-col justify-between rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-4">
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Membership Plans</h2>
              <div className="my-auto py-2">
                <PlanDistributionDonut data={data?.planDistribution ?? []} loading={loading} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col justify-between rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-3">
              <h2 className="mb-2.5 text-sm font-semibold text-[#F5F6F8]">Quick Actions</h2>
              <div className="my-auto space-y-2.5">
                <Link
                  href="/check-in"
                  className="group flex items-center justify-between rounded-xl border border-[#E32935]/30 bg-[#171A21] p-2.5 transition-colors hover:border-[#E32935]/60 hover:bg-[#1D2029]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E32935]/18 text-[#E32935]">
                      <ScanLine className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#F5F6F8]">Scan Now</p>
                      <p className="truncate text-[11px] text-[#8A93A2]">Check-In Members</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href="/reports"
                  className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] p-2.5 transition-colors hover:border-[#363D4A] hover:bg-[#1D2029]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4B91F1]/18 text-[#4B91F1]">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#F5F6F8]">Top Coaches</p>
                      <p className="truncate text-[11px] text-[#8A93A2]">Coach Rankings</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
                </Link>

                <Link
                  href="/members"
                  className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] p-2.5 transition-colors hover:border-[#363D4A] hover:bg-[#1D2029]"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/18 text-[#A78BFA]">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[#F5F6F8]">Add Member</p>
                      <p className="truncate text-[11px] text-[#8A93A2]">New Registration</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Top Performing Coaches Strip for Admin */}
          {data?.topCoaches && data.topCoaches.length > 0 && (
            <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-[#F2B84B]" />
                  <h2 className="text-sm font-semibold text-[#F5F6F8]">Top Performing Coaches</h2>
                </div>
                <Link
                  href="/reports"
                  className="text-xs font-medium text-[#E32935] hover:text-[#F13A46]"
                >
                  Full Report
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {data.topCoaches.slice(0, 3).map((coach, idx) => (
                  <div
                    key={coach.id}
                    className="flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] px-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          idx === 0
                            ? "bg-[#F2B84B]/20 text-[#F2B84B]"
                            : idx === 1
                            ? "bg-[#4B91F1]/20 text-[#4B91F1]"
                            : "bg-[#8B5CF6]/20 text-[#A78BFA]"
                        )}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-[#F5F6F8]">
                          {coach.name}
                        </p>
                        <p className="truncate text-xs text-[#8A93A2]">
                          {coach.activeClients}/{coach.totalClients} clients · {coach.totalSessions} sessions
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[#F5F6F8] tabular-nums">
                        {formatCurrency(coach.coachingRevenue)}
                      </p>
                      <p className="text-[11px] font-semibold text-[#2BCB83] tabular-nums">
                        ↑ +{coach.deltaPercent}% vs last mo
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
