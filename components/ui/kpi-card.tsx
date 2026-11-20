import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AccentTone = "blue" | "green" | "red" | "amber" | "neutral";

const TONE_CLASSES: Record<AccentTone, string> = {
  blue: "bg-[#4B91F1]/14 text-[#4B91F1] ring-1 ring-[#4B91F1]/25",
  green: "bg-[#2BCB83]/14 text-[#2BCB83] ring-1 ring-[#2BCB83]/25",
  red: "bg-[#E32935]/14 text-[#E32935] ring-1 ring-[#E32935]/25",
  amber: "bg-[#F2B84B]/14 text-[#F2B84B] ring-1 ring-[#F2B84B]/25",
  neutral: "bg-[#20242D] text-[#A4AAB5] ring-1 ring-[#292E38]",
};

export function KpiCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "blue",
  href,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  helper?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: AccentTone;
  href?: string;
  valueClassName?: string;
}) {
  const content = (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
          TONE_CLASSES[tone]
        )}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#A4AAB5]">{label}</p>
        <p
          className={cn(
            "mt-0.5 truncate text-2xl font-bold tracking-tight text-[#F5F6F8] tabular-nums",
            valueClassName
          )}
        >
          {value}
        </p>
        {helper && <p className="mt-0.5 truncate text-[11px] text-[#8A93A2]">{helper}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-[#292E38] bg-[#111318] p-5 transition-colors hover:border-[#363D4A] hover:bg-[#171A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
      {content}
    </div>
  );
}
