"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatDateTime } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string; role: string } | null;
}

type AuditCategory = "ALL" | "PASSWORDS" | "PAYMENTS" | "MEMBERS" | "CHECKIN_QR" | "TEAM_SETTINGS";

const CATEGORY_TABS: { id: AuditCategory; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PASSWORDS", label: "Passwords & Auth" },
  { id: "PAYMENTS", label: "Payments" },
  { id: "MEMBERS", label: "Members" },
  { id: "CHECKIN_QR", label: "Check-Ins & QR" },
  { id: "TEAM_SETTINGS", label: "Accounts & Settings" },
];

const PAGE_SIZE = 8;

function matchesCategory(log: AuditEntry, category: AuditCategory): boolean {
  if (category === "ALL") return true;
  const a = log.action.toUpperCase();
  const e = log.entityType.toUpperCase();
  switch (category) {
    case "PASSWORDS":
      return a.includes("PASSWORD") || a.includes("AUTH_");
    case "PAYMENTS":
      return a.includes("PAYMENT") || a.includes("REFUND") || a.includes("VOID") || e === "PAYMENT";
    case "MEMBERS":
      return (a.includes("MEMBER") && !a.includes("PASSWORD")) || e === "MEMBER";
    case "CHECKIN_QR":
      return a.includes("CHECK_IN") || a.includes("QR") || e === "ATTENDANCERECORD" || e === "QRCREDENTIAL";
    case "TEAM_SETTINGS":
      return (
        a.includes("STAFF") ||
        a.includes("SETTINGS") ||
        a.includes("PLAN") ||
        a.includes("ACCOUNT_PROFILE") ||
        e === "GYMSETTING" ||
        e === "USER" ||
        e === "MEMBERSHIPPLAN"
      );
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [category, setCategory] = useState<AuditCategory>("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const distinctActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs.filter((l) => {
    if (!matchesCategory(l, category)) return false;
    if (actionFilter !== "ALL" && l.action !== actionFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q) ||
        (l.actor?.name ?? "Client Portal").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3 animate-panel-enter">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[#F5F6F8]">Audit Logs</h1>
        <p className="text-[11px] text-[#A4AAB5]">
          Filter immutable activity across password changes, payments, check-ins, members, and settings.
        </p>
      </div>

      {/* Category Filter Pills + Specific Action & Search */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#242934] bg-[#111318] p-1">
          {CATEGORY_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setCategory(t.id);
                setActionFilter("ALL");
                setPage(1);
              }}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                category === t.id
                  ? "bg-[#E32935] text-white"
                  : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by exact action"
            className="h-8 rounded-lg border border-[#242934] bg-[#111318] px-2.5 text-xs text-[#F5F6F8]"
          >
            <option value="ALL">All Actions</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A93A2]" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search actor, action..."
              className="h-8 w-full rounded-lg border border-[#242934] bg-[#111318] pl-8 pr-3 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
        <div className="divide-y divide-[#242934]">
          {loading ? (
            <p className="py-8 text-center text-xs text-[#8A93A2]">Loading audit trail...</p>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-[#8A93A2]">
              <ShieldAlert className="h-5 w-5 text-[#8A93A2]" />
              <p>No audit log entries match your selected filter.</p>
            </div>
          ) : (
            paged.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs"
              >
                <div className="space-y-0.5">
                  <span className="inline-block rounded border border-[#292E38] bg-[#171A21] px-2 py-0.5 font-mono text-[10px] font-medium text-[#F5F6F8]">
                    {log.action}
                  </span>
                  <p className="text-[11px] text-[#8A93A2]">
                    {log.entityType} ({log.entityId}) · Actor: {log.actor?.name ?? "Client Portal"}
                  </p>
                </div>
                <span className="text-[11px] text-[#8A93A2] tabular-nums">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
        {filtered.length > 0 && (
          <div className="border-t border-[#242934] px-3.5 py-2">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="logs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
