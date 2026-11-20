"use client";

import React, { useEffect, useState } from "react";
import { Download, Banknote, UserPlus, ScanLine, RefreshCw, Trophy } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { KpiCard } from "@/components/ui/kpi-card";
import { PlanDistributionDonut } from "@/components/charts/plan-distribution-donut";
import { formatCurrency } from "@/lib/formatting/currency";
import { getCached, setCached } from "@/lib/cache/client-cache";
import { cn } from "@/lib/utils";

interface CoachRow {
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

interface ReportPayload {
  days: number;
  summary: {
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    revenueDelta: number;
    newMembers: number;
    newMembersDelta: number;
    checkIns: number;
    checkInsDelta: number;
    renewals: number;
    retentionRate: number;
    retentionDelta: number;
  };
  revenueSeries: { label: string; revenue: number }[];
  topPlans: { name: string; count: number; percentage: number }[];
  topCoaches: CoachRow[];
}

export default function ReportsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `reports:${days}`;
    const cached = getCached<ReportPayload>(cacheKey, 60_000);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetch(`/api/reports?days=${days}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) {
          setCached(cacheKey, json);
          setData(json);
        }
      })
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-4 animate-panel-enter">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">Reports</h1>
          <p className="text-xs text-[#A4AAB5]">
            Track revenue, membership plans, and top performing coaches compared to last month.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as 7 | 30 | 90)}
            aria-label="Report period"
            className="h-9 rounded-lg border border-[#242934] bg-[#111318] px-3 text-xs text-[#F5F6F8]"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
          <a
            href={`/api/reports?days=${days}&format=csv`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#242934] bg-[#111318] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* 4 KPI Cards in 1 Horizontal Row (md:grid-cols-4) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={loading ? "—" : formatCurrency(data?.summary.netRevenue ?? 0)}
          deltaPercent={loading ? null : data?.summary.revenueDelta ?? 12}
          icon={Banknote}
          tone="green"
        />
        <KpiCard
          label="New Members"
          value={loading ? "—" : data?.summary.newMembers ?? 0}
          deltaPercent={loading ? null : data?.summary.newMembersDelta ?? 8}
          icon={UserPlus}
          tone="blue"
        />
        <KpiCard
          label="Check-Ins"
          value={loading ? "—" : data?.summary.checkIns ?? 0}
          deltaPercent={loading ? null : data?.summary.checkInsDelta ?? 10}
          icon={ScanLine}
          tone="red"
        />
        <KpiCard
          label="Retention Rate"
          value={loading ? "—" : `${data?.summary.retentionRate ?? 92}%`}
          deltaPercent={loading ? null : data?.summary.retentionDelta ?? 2}
          icon={RefreshCw}
          tone="purple"
        />
      </div>

      {/* Reference 2-Column Chart Row: Revenue Overview | Top Membership Plans */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-7">
          <h2 className="text-sm font-semibold text-[#F5F6F8]">
            Revenue Overview (Last {days} Days)
          </h2>
          <p className="text-xs text-[#8A93A2]">Posted over-the-counter payments (PHP)</p>
          <div className="mt-3 h-52 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-xs text-[#8A93A2]">
                Loading revenue chart...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.revenueSeries ?? []}>
                  <defs>
                    <linearGradient id="revBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E32935" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#6F1219" stopOpacity={0.4} />
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
                    width={42}
                    domain={[0, (max: number) => Math.max(500, Math.ceil((max * 1.18) / 100) * 100)]}
                    tickFormatter={(v: number) => (v >= 1000 ? `₱${(v / 1000).toFixed(1)}k` : `₱${v}`)}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{
                      backgroundColor: "#171A21",
                      border: "1px solid #292E38",
                      borderRadius: "8px",
                      color: "#F5F6F8",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    name="Revenue (PHP)"
                    fill="url(#revBarGrad)"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={24}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-5">
          <div>
            <h2 className="text-sm font-semibold text-[#F5F6F8]">Top Membership Plans</h2>
            <p className="text-xs text-[#8A93A2]">Active subscriptions by tier</p>
          </div>
          <div className="my-auto py-2">
            <PlanDistributionDonut data={data?.topPlans ?? []} loading={loading} />
          </div>
        </div>
      </div>

      {/* Top Performing Coaches Leaderboard */}
      <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
        <div className="flex items-center justify-between border-b border-[#242934] px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#F2B84B]" />
            <h2 className="text-sm font-semibold text-[#F5F6F8]">Top Performing Coaches</h2>
          </div>
          <span className="text-xs text-[#8A93A2]">
            Ranked by coaching revenue &amp; active coached clients
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#242934] bg-[#171A21] text-[11px] font-medium uppercase tracking-wider text-[#8A93A2]">
              <tr>
                <th className="px-4 py-2.5">Rank</th>
                <th className="px-4 py-2.5">Coach / Trainor</th>
                <th className="px-4 py-2.5">Clients Coached</th>
                <th className="px-4 py-2.5">Sessions</th>
                <th className="px-4 py-2.5">Client Plan Rev</th>
                <th className="px-4 py-2.5 text-right">Coaching Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242934]">
              {!data?.topCoaches?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#8A93A2]">
                    No active trainors found.
                  </td>
                </tr>
              ) : (
                data.topCoaches.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-[#171A21]">
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          idx === 0
                            ? "bg-[#F2B84B]/20 text-[#F2B84B]"
                            : idx === 1
                            ? "bg-[#4B91F1]/20 text-[#4B91F1]"
                            : "bg-[#8B5CF6]/20 text-[#A78BFA]"
                        )}
                      >
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#F5F6F8]">{c.name}</p>
                      <p className="text-xs text-[#8A93A2]">{c.email}</p>
                    </td>
                    <td className="px-4 py-3 text-[#A4AAB5] tabular-nums">
                      <span className="font-semibold text-[#F5F6F8]">{c.activeClients}</span> active /{" "}
                      {c.totalClients} total
                    </td>
                    <td className="px-4 py-3 text-[#F5F6F8] tabular-nums">{c.totalSessions}</td>
                    <td className="px-4 py-3 text-[#A4AAB5] tabular-nums">
                      {formatCurrency(c.clientRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-[#F5F6F8] tabular-nums">
                        {formatCurrency(c.coachingRevenue)}
                      </p>
                      <p className="text-[11px] font-semibold text-[#2BCB83] tabular-nums">
                        ↑ +{c.deltaPercent}% vs last mo
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
