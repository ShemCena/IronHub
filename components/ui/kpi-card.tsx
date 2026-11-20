import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AccentTone = "blue" | "green" | "purple" | "red" | "amber" | "neutral";

const TONE_CLASSES: Record<AccentTone, string> = {
  blue: "bg-[#4B91F1]/16 text-[#4B91F1] ring-1 ring-[#4B91F1]/30",
  green: "bg-[#2BCB83]/16 text-[#2BCB83] ring-1 ring-[#2BCB83]/30",
  purple: "bg-[#8B5CF6]/16 text-[#A78BFA] ring-1 ring-[#8B5CF6]/30",
  red: "bg-[#E32935]/16 text-[#E32935] ring-1 ring-[#E32935]/30",
  amber: "bg-[#F2B84B]/16 text-[#F2B84B] ring-1 ring-[#F2B84B]/30",
  neutral: "bg-[#20242D] text-[#A4AAB5] ring-1 ring-[#292E38]",
};

export function KpiCard({
  label,
  value,
  helper,
  deltaPercent,
  icon: Icon,
  tone = "blue",
  href,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  deltaPercent?: number | null;
  icon: React.ComponentType<{ className?: string }>;
  tone?: AccentTone;
  href?: string;
  valueClassName?: string;
}) {
  const hasDelta = typeof deltaPercent === "number" && Number.isFinite(deltaPercent);
  const isPositive = (deltaPercent ?? 0) >= 0;

  const content = (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          TONE_CLASSES[tone]
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium text-[#A4AAB5]">{label}</p>
        <p
          className={cn(
            "mt-0.5 truncate text-base font-bold leading-tight tracking-tight text-[#F5F6F8] tabular-nums",
            valueClassName
          )}
        >
          {value}
        </p>
        <div className="mt-0.5 flex items-center gap-1 truncate text-[10px]">
          {hasDelta && (
            <span
              className={cn(
                "font-semibold tabular-nums",
                isPositive ? "text-[#2BCB83]" : "text-[#F05252]"
              )}
            >
              {isPositive ? `↑ +${deltaPercent}%` : `↓ ${deltaPercent}%`} vs last mo
            </span>
          )}
          {!hasDelta && helper && (
            <span className="truncate text-[#2BCB83]">{helper}</span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="card-interactive block rounded-xl border border-[#242934] bg-[#111318]/95 px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="card-interactive rounded-xl border border-[#242934] bg-[#111318]/95 px-3 py-2.5">
      {content}
    </div>
  );
}
