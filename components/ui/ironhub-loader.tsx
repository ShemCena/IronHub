"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Signature IronHub 5-bar kinetic equalizer mark inspired by the IronHub logo.
 */
export function IronHubPulseMark({
  label,
  size = "md",
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const barHeights =
    size === "sm"
      ? ["h-3", "h-4.5", "h-6", "h-4.5", "h-3"]
      : size === "lg"
      ? ["h-5", "h-8", "h-11", "h-8", "h-5"]
      : ["h-4", "h-6", "h-8", "h-6", "h-4"];

  const barWidth = size === "sm" ? "w-1" : size === "lg" ? "w-1.5" : "w-1";

  return (
    <div
      className={cn("inline-flex flex-col items-center justify-center gap-2.5", className)}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-end gap-1">
        {barHeights.map((h, i) => (
          <span
            key={i}
            className={cn(
              "ih-bar rounded-full",
              barWidth,
              h,
              i === 2 ? "bg-[#E32935] shadow-[0_0_12px_rgba(227,41,53,0.55)]" : "bg-[#E32935]/80"
            )}
            style={{ animationDelay: `${i * 110}ms` }}
          />
        ))}
      </div>
      {label && (
        <span className="text-[11px] font-medium tracking-wide text-[#A4AAB5]">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Crisp 2px crimson telemetry progress sweep along the top border of a card.
 */
export function IronHubTelemetryBar({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative h-[2px] w-full overflow-hidden bg-[#1F232C]", className)}
      aria-hidden="true"
    >
      <div className="ih-telemetry-runner h-full w-2/5 bg-gradient-to-r from-transparent via-[#E32935] to-transparent" />
    </div>
  );
}

/**
 * Inline chart / widget loader matching IronHub dark telemetry cards.
 */
export function InlineChartLoader({
  label = "Syncing telemetry...",
  heightClass = "h-48",
}: {
  label?: string;
  heightClass?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-lg border border-[#242934]/60 bg-[#0D0F14]/65",
        heightClass
      )}
    >
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, #242934 1px, transparent 1px), linear-gradient(to bottom, #242934 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <IronHubPulseMark label={label} size="md" className="relative z-10" />
    </div>
  );
}

/**
 * KPI card skeleton matching KpiCard dimensions (zero CLS).
 */
export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3.5 sm:grid-cols-2",
        count === 3 ? "md:grid-cols-3" : "md:grid-cols-4"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative overflow-hidden rounded-xl border border-[#242934] bg-[#111318] px-4 py-3.5"
        >
          <div className="flex items-center gap-3.5">
            <div className="ih-skeleton h-10 w-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="ih-skeleton h-2.5 w-20 rounded" />
              <div className="ih-skeleton h-5 w-24 rounded" />
              <div className="ih-skeleton h-2 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full Dashboard skeleton matching Hero + 4 KPIs + 3-column analytics + Coaches strip.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-panel-enter" role="status" aria-label="Loading workspace">
      {/* Hero Banner Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-[#242934] bg-[#111318]">
        <IronHubTelemetryBar />
        <div className="flex min-h-[144px] flex-col justify-between gap-3 p-5 md:flex-row md:items-center md:px-6">
          <div className="space-y-2.5">
            <div className="ih-skeleton h-6 w-44 rounded-md" />
            <div className="ih-skeleton h-6 w-28 rounded-md" />
            <div className="ih-skeleton h-3 w-64 rounded" />
          </div>
          <div className="flex flex-col items-start gap-2 md:items-end">
            <div className="ih-skeleton h-3 w-28 rounded" />
            <div className="ih-skeleton h-7 w-32 rounded-md" />
            <div className="ih-skeleton h-5 w-36 rounded-lg" />
          </div>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <KpiRowSkeleton count={4} />

      {/* 3-Column Analytics Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="ih-skeleton h-4 w-36 rounded" />
            <div className="ih-skeleton h-3 w-24 rounded" />
          </div>
          <InlineChartLoader label="Loading metrics..." heightClass="h-48" />
        </div>

        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-4">
          <div className="mb-3 ih-skeleton h-4 w-32 rounded" />
          <div className="flex h-48 items-center justify-center gap-5">
            <div className="ih-skeleton h-32 w-32 shrink-0 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="ih-skeleton h-3 w-full rounded" />
              <div className="ih-skeleton h-3 w-4/5 rounded" />
              <div className="ih-skeleton h-3 w-3/4 rounded" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-3">
          <div className="mb-3 ih-skeleton h-4 w-28 rounded" />
          <div className="space-y-2.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-[#242934] bg-[#171A21]/60 p-3"
              >
                <div className="ih-skeleton h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <div className="ih-skeleton h-3 w-20 rounded" />
                  <div className="ih-skeleton h-2.5 w-24 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Table / List rows skeleton for Members, Team, Audit Logs, and Payments.
 */
export function TableRowsSkeleton({
  rows = 6,
  showAvatar = true,
}: {
  rows?: number;
  showAvatar?: boolean;
}) {
  return (
    <div className="relative overflow-hidden" role="status" aria-label="Loading records">
      <IronHubTelemetryBar />
      <div className="divide-y divide-[#242934]">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 px-4 py-3.5"
            style={{ opacity: Math.max(0.4, 1 - i * 0.1) }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {showAvatar && <div className="ih-skeleton h-8 w-8 shrink-0 rounded-full" />}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="ih-skeleton h-3.5 w-40 max-w-full rounded" />
                <div className="ih-skeleton h-2.5 w-56 max-w-full rounded" />
              </div>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <div className="ih-skeleton h-5 w-16 rounded-full" />
              <div className="ih-skeleton h-3.5 w-20 rounded" />
            </div>
            <div className="ih-skeleton h-7 w-16 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Settings 2-column skeleton (Admin Gym Info / Trainor Profile + Account Security).
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-4 animate-panel-enter" role="status" aria-label="Loading settings">
      <div className="space-y-2">
        <div className="ih-skeleton h-6 w-28 rounded" />
        <div className="ih-skeleton h-3 w-72 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-xl border border-[#242934] bg-[#111318] lg:col-span-7">
          <IronHubTelemetryBar />
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-[#242934] pb-3">
              <div className="space-y-1.5">
                <div className="ih-skeleton h-4 w-36 rounded" />
                <div className="ih-skeleton h-2.5 w-52 rounded" />
              </div>
              <div className="ih-skeleton h-6 w-20 rounded" />
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5">
                  <div className="ih-skeleton h-3 w-20 rounded" />
                  <div className="ih-skeleton h-9 w-full rounded-lg" />
                </div>
              ))}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="ih-skeleton h-3 w-20 rounded" />
                <div className="ih-skeleton h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-[#242934] bg-[#111318] lg:col-span-5">
          <IronHubTelemetryBar />
          <div className="space-y-4 p-5">
            <div className="space-y-1.5 border-b border-[#242934] pb-3">
              <div className="ih-skeleton h-4 w-36 rounded" />
              <div className="ih-skeleton h-2.5 w-48 rounded" />
            </div>
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <div className="ih-skeleton h-3 w-28 rounded" />
                <div className="ih-skeleton h-9 w-full rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <div className="ih-skeleton h-3 w-40 rounded" />
                <div className="ih-skeleton h-9 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-screen Client Portal boot skeleton matching Sidebar + Topbar + Overview.
 */
export function PortalBootSkeleton() {
  return (
    <div className="flex min-h-screen bg-[#090A0D] text-[#F5F6F8]">
      {/* Sidebar skeleton */}
      <aside className="hidden h-screen w-[216px] shrink-0 flex-col border-r border-[#1F232C] bg-[#0D0F14] lg:flex">
        <div className="flex h-15 items-center px-4">
          <div className="ih-skeleton h-6 w-28 rounded" />
        </div>
        <div className="flex-1 space-y-2 px-3 py-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="ih-skeleton h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="p-3">
          <div className="ih-skeleton h-[142px] w-full rounded-xl" />
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-15 items-center justify-between border-b border-[#1F232C] bg-[#090A0D] px-4 md:px-6">
          <div className="ih-skeleton h-3.5 w-44 rounded" />
          <div className="ih-skeleton h-9 w-36 rounded-lg" />
        </header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 px-4 py-4 md:px-6 md:py-5">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
}
