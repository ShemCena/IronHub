"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PaginationBar({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "records",
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  itemLabel?: string;
}) {
  const safeTotalPages = Math.max(1, totalPages);
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  const pages: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(safeTotalPages, startPage + 4);
  for (let p = startPage; p <= endPage; p++) {
    pages.push(p);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#242934] px-3.5 py-2 text-[11px] text-[#8A93A2]">
      <span className="tabular-nums">
        Showing {start}–{end} of {totalItems} {itemLabel}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#242934] bg-[#171A21] text-[#A4AAB5] hover:bg-[#20242D] hover:text-white disabled:opacity-35"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cn(
              "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tabular-nums transition-colors",
              p === page
                ? "bg-[#E32935] text-white"
                : "border border-[#242934] bg-[#171A21] text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= safeTotalPages}
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#242934] bg-[#171A21] text-[#A4AAB5] hover:bg-[#20242D] hover:text-white disabled:opacity-35"
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
