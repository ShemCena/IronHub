"use client";

import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
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

  return (
    <div className="space-y-6 animate-panel-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-[#F5F6F8]"
            style={{ fontFamily: "var(--font-barlow), sans-serif" }}
          >
            REPORTS
          </h1>
          <p className="mt-1 text-sm text-[#A4AAB5]">
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
                  "rounded-md px-3 py-1.5 text-xs font-medium",
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
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#292E38] bg-[#111318] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <span className="text-xs text-[#A4AAB5]">Net Collected Revenue</span>
          <p className="mt-2 text-2xl font-bold text-[#F5F6F8] tabular-nums">
            {loading ? "—" : formatCurrency(data?.summary.netRevenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">
            Gross {formatCurrency(data?.summary.grossRevenue ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <span className="text-xs text-[#A4AAB5]">New Members</span>
          <p className="mt-2 text-2xl font-bold text-[#F5F6F8] tabular-nums">
            {loading ? "—" : data?.summary.newMembers ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">In selected {days}-day window</p>
        </div>
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <span className="text-xs text-[#A4AAB5]">Approved Check-Ins</span>
          <p className="mt-2 text-2xl font-bold text-[#F5F6F8] tabular-nums">
            {loading ? "—" : data?.summary.checkIns ?? 0}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">QR + manual desk entries</p>
        </div>
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <span className="text-xs text-[#A4AAB5]">Renewal Share</span>
          <p className="mt-2 text-2xl font-bold text-[#2BCB83] tabular-nums">
            {loading ? "—" : `${data?.summary.retentionRate ?? 0}%`}
          </p>
          <p className="mt-1 text-xs text-[#747C89]">
            {data?.summary.renewals ?? 0} renewals recorded
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
        <h2 className="text-base font-semibold text-[#F5F6F8]">
          Revenue Overview (Last {days} Days)
        </h2>
        <p className="text-xs text-[#747C89]">Posted over-the-counter payments (PHP)</p>
        <div className="mt-4 h-72 w-full">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-[#747C89]">
              Loading revenue chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueSeries ?? []}>
                <CartesianGrid stroke="#292E38" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" stroke="#747C89" fontSize={11} tickLine={false} />
                <YAxis stroke="#747C89" fontSize={11} tickLine={false} />
                <Tooltip
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
                  fill="#E32935"
                  radius={[4, 4, 0, 0]}
                  animationDuration={350}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <h2 className="mb-3 text-base font-semibold text-[#F5F6F8]">
            Payment Method Breakdown
          </h2>
          <div className="space-y-2.5">
            {data?.paymentMethodBreakdown.length ? (
              data.paymentMethodBreakdown.map((item) => (
                <div key={item.method} className="flex items-center justify-between text-sm">
                  <span className="text-[#A4AAB5]">{item.method}</span>
                  <span className="font-medium text-[#F5F6F8] tabular-nums">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#747C89]">No payments in selected period.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
          <h2 className="mb-3 text-base font-semibold text-[#F5F6F8]">
            Active Membership Distribution
          </h2>
          <div className="space-y-2.5">
            {data?.topPlans.length ? (
              data.topPlans.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F5F6F8]">{p.name}</span>
                    <span className="text-[#A4AAB5] tabular-nums">
                      {p.count} ({p.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#20242D]">
                    <div
                      className="h-full bg-[#E32935]"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#747C89]">No active plans found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
