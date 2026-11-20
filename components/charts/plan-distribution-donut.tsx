"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { IronHubPulseMark } from "@/components/ui/ironhub-loader";

export interface PlanSlice {
  name: string;
  count: number;
  percentage: number;
}

const FIXED_TIER_COLORS: Record<string, string> = {
  Premium: "#4B91F1",
  Standard: "#8B5CF6",
  Basic: "#8A93A2",
};

const FALLBACK_COLORS = ["#E32935", "#4B91F1", "#2BCB83", "#F2B84B", "#8A93A2"];

export function getPlanTierColor(name: string, index = 0): string {
  return FIXED_TIER_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function PlanDistributionDonut({
  data,
  loading = false,
}: {
  data: PlanSlice[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-44 items-center justify-center">
        <IronHubPulseMark label="Syncing plan mix..." size="sm" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-[#8A93A2]">
        No active plans yet.
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top = sorted[0];

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="relative flex h-[142px] w-[142px] shrink-0 items-center justify-center">
        <PieChart width={142} height={142}>
          <Pie
            data={sorted}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={44}
            outerRadius={64}
            paddingAngle={3}
            cornerRadius={4}
            stroke="none"
            isAnimationActive={false}
          >
            {sorted.map((entry, idx) => (
              <Cell key={entry.name} fill={getPlanTierColor(entry.name, idx)} />
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold text-[#F5F6F8] tabular-nums">
            {top.percentage}%
          </span>
          <span className="text-[11px] font-medium text-[#A4AAB5]">{top.name}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-2.5">
        {sorted.map((plan, idx) => (
          <div key={plan.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-[#A4AAB5]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getPlanTierColor(plan.name, idx) }}
                aria-hidden="true"
              />
              <span className="truncate">{plan.name}</span>
            </span>
            <span className="shrink-0 font-semibold text-[#F5F6F8] tabular-nums">
              {plan.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
