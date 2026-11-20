import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Ban, Archive, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusVariant =
  | "ACTIVE"
  | "EXPIRED"
  | "SUSPENDED"
  | "ARCHIVED"
  | "PAID"
  | "PENDING"
  | "FAILED"
  | "REFUNDED"
  | "VOIDED"
  | "APPROVED"
  | "DENIED";

const STATUS_MAP: Record<
  StatusVariant,
  { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-[#2BCB83]/12 text-[#2BCB83] border-[#2BCB83]/25",
    Icon: CheckCircle2,
  },
  PAID: {
    label: "Paid",
    className: "bg-[#2BCB83]/12 text-[#2BCB83] border-[#2BCB83]/25",
    Icon: CheckCircle2,
  },
  APPROVED: {
    label: "Approved",
    className: "bg-[#2BCB83]/12 text-[#2BCB83] border-[#2BCB83]/25",
    Icon: CheckCircle2,
  },
  PENDING: {
    label: "Pending",
    className: "bg-[#F2B84B]/12 text-[#F2B84B] border-[#F2B84B]/25",
    Icon: Clock,
  },
  SUSPENDED: {
    label: "Suspended",
    className: "bg-[#F2B84B]/12 text-[#F2B84B] border-[#F2B84B]/25",
    Icon: AlertTriangle,
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-[#4B91F1]/12 text-[#4B91F1] border-[#4B91F1]/25",
    Icon: AlertTriangle,
  },
  EXPIRED: {
    label: "Expired",
    className: "bg-[#F05252]/12 text-[#F05252] border-[#F05252]/25",
    Icon: XCircle,
  },
  FAILED: {
    label: "Failed",
    className: "bg-[#F05252]/12 text-[#F05252] border-[#F05252]/25",
    Icon: XCircle,
  },
  DENIED: {
    label: "Denied",
    className: "bg-[#F05252]/12 text-[#F05252] border-[#F05252]/25",
    Icon: XCircle,
  },
  VOIDED: {
    label: "Voided",
    className: "bg-[#747C89]/15 text-[#A4AAB5] border-[#292E38]",
    Icon: Ban,
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-[#747C89]/15 text-[#A4AAB5] border-[#292E38]",
    Icon: Archive,
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const config = STATUS_MAP[status as StatusVariant] ?? {
    label: status,
    className: "bg-[#20242D] text-[#A4AAB5] border-[#292E38]",
    Icon: Clock,
  };
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
