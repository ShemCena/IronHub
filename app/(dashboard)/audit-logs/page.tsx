"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Search, ShieldAlert } from "lucide-react";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { formatDateTime } from "@/lib/formatting/currency";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string; role: string } | null;
}

const PAGE_SIZE = 8;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
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

  const filtered = query.trim()
    ? logs.filter((l) => {
        const q = query.toLowerCase();
        return (
          l.action.toLowerCase().includes(q) ||
          l.entityType.toLowerCase().includes(q) ||
          (l.actor?.name ?? "Client Portal").toLowerCase().includes(q)
        );
      })
    : logs;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-3 animate-panel-enter">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#F5F6F8]">Audit Logs</h1>
          <p className="text-[11px] text-[#A4AAB5]">
            Immutable activity trail across payments, check-ins, accounts, and gym settings.
          </p>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A93A2]" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filter action, entity, actor..."
            className="h-8 w-full rounded-lg border border-[#242934] bg-[#111318] pl-8 pr-3 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
        <div className="divide-y divide-[#242934]">
          {loading ? (
            <p className="py-8 text-center text-xs text-[#8A93A2]">Loading audit trail...</p>
          ) : paged.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-[#8A93A2]">
              <ShieldAlert className="h-5 w-5 text-[#8A93A2]" />
              <p>No audit log entries match your filter.</p>
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
