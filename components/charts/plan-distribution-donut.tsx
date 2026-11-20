"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

export interface PlanSlice {
  name: string;
  count: number;
  percentage: number;
}

const FIXED_TIER_COLORS: Record<string, string> = {
  Premium: "#E32935",
  Standard: "#4B91F1",
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
      <div className="flex h-44 items-center justify-center text-xs text-[#8A93A2]">
        Loading plan mix...
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
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative flex h-[164px] w-[164px] shrink-0 items-center justify-center">
        <PieChart width={164} height={164}>
          <Pie
            data={sorted}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={74}
            paddingAngle={4}
            cornerRadius={5}
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
          <span className="text-2xl font-bold text-[#F5F6F8] tabular-nums">
            {top.percentage}%
          </span>
          <span className="text-[11px] font-medium text-[#A4AAB5]">{top.name}</span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5">
        {sorted.map((plan, idx) => (
          <div key={plan.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-[#A4AAB5]">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: getPlanTierColor(plan.name, idx) }}
                aria-hidden="true"
              />
              <span>{plan.name}</span>
            </span>
            <span className="font-medium text-[#F5F6F8] tabular-nums">
              {plan.count} <span className="text-[#8A93A2]">({plan.percentage}%)</span>
            </span>
          </div>
        ))}
      </div>

      <span className="sr-only">
        {sorted.map((p) => `${p.name}: ${p.count} (${p.percentage}%)`).join(", ")}
      </span>
    </div>
  );
}
