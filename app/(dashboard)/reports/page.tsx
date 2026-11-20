"use client";

import React, { useEffect, useState } from "react";
import { Download, Banknote, UserPlus, ScanLine, RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";

interface ReportPayload {
  days: number;
  summary: {
    grossRevenue: number;
    refundedAmount: number;
    netRevenue: number;
    newMembers: number;
    checkIns: number;
    renewals: number;
    retentionRate: number;
  };
  revenueSeries: { label: string; revenue: number }[];
  paymentMethodBreakdown: { method: string; total: number }[];
  topPlans: { name: string; count: number; percentage: number }[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card Terminal",
  EWALLET: "E-Wallet (GCash / Maya)",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

export default function ReportsPage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports?days=${days}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const totalMethodAmount =
    data?.paymentMethodBreakdown.reduce((acc, item) => acc + item.total, 0) ?? 0;

  return (
    <div className="space-y-4 animate-panel-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F6F8]">
            Reports
          </h1>
          <p className="mt-0.5 text-xs text-[#A4AAB5]">
            Reconciled revenue, membership growth, and check-in activity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[#292E38] bg-[#111318] p-1">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]",
                  days === d
                    ? "bg-[#E32935] text-white"
                    : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                )}
              >
                Last {d} Days
              </button>
            ))}
          </div>
          <a
            href={`/api/reports?days=${days}&format=csv`}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#292E38] bg-[#111318] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={loading ? "—" : formatCurrency(data?.summary.netRevenue ?? 0)}
          helper={`Gross ${formatCurrency(data?.summary.grossRevenue ?? 0)}`}
          icon={Banknote}
          tone="green"
        />
        <KpiCard
          label="New Members"
          value={loading ? "—" : data?.summary.newMembers ?? 0}
          helper={`Last ${days} days`}
          icon={UserPlus}
          tone="blue"
        />
        <KpiCard
          label="Approved Check-Ins"
          value={loading ? "—" : data?.summary.checkIns ?? 0}
          helper="QR + manual entries"
          icon={ScanLine}
          tone="amber"
        />
        <KpiCard
          label="Retention Share"
          value={loading ? "—" : `${data?.summary.retentionRate ?? 0}%`}
          helper={`${data?.summary.renewals ?? 0} renewals recorded`}
          icon={RefreshCw}
          tone="red"
        />
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
        <h2 className="text-base font-semibold text-[#F5F6F8]">
          Revenue Overview (Last {days} Days)
        </h2>
        <p className="text-xs text-[#8A93A2]">Posted over-the-counter payments (PHP)</p>
        <div className="mt-4 h-72 w-full">
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
                <CartesianGrid stroke="#232833" strokeDasharray="3 3" vertical={false} />
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
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <h2 className="mb-1 text-base font-semibold text-[#F5F6F8]">
            Payment Method Breakdown
          </h2>
          <p className="mb-4 text-xs text-[#8A93A2]">Over-the-counter collection channels</p>
          <div className="space-y-3.5">
            {data?.paymentMethodBreakdown.length ? (
              data.paymentMethodBreakdown.map((item) => {
                const share =
                  totalMethodAmount > 0 ? Math.round((item.total / totalMethodAmount) * 100) : 0;
                return (
                  <div key={item.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#F5F6F8]">
                        {METHOD_LABELS[item.method] ?? item.method}
                      </span>
                      <span className="text-[#A4AAB5] tabular-nums">
                        {formatCurrency(item.total)}{" "}
                        <span className="text-[#8A93A2]">({share}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#20242D]">
                      <div
                        className="h-full rounded-full bg-[#4B91F1]"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-[#8A93A2]">No payments in selected period.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <h2 className="mb-1 text-base font-semibold text-[#F5F6F8]">
            Top Membership Plans
          </h2>
          <p className="mb-4 text-xs text-[#8A93A2]">Active subscriptions by tier</p>
          <PlanDistributionDonut data={data?.topPlans ?? []} loading={loading} />
        </div>
      </div>
    </div>
  );
}
