import React from "react";

export function BrandMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="2" y="9" width="2.5" height="6" rx="1" fill="#F5F6F8" />
        <rect x="6" y="6" width="2.5" height="12" rx="1" fill="#F5F6F8" />
        <rect x="10.75" y="3" width="2.5" height="18" rx="1" fill="#E32935" />
        <rect x="15.5" y="6" width="2.5" height="12" rx="1" fill="#F5F6F8" />
        <rect x="19.5" y="9" width="2.5" height="6" rx="1" fill="#F5F6F8" />
      </svg>
      {!collapsed && (
        <div className="leading-none">
          <span
            className="block text-xl font-bold tracking-wider text-[#F5F6F8]"
            style={{ fontFamily: "var(--font-barlow), sans-serif" }}
          >
            IRONHUB
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A93A2]">
            Fitness Management
          </span>
        </div>
      )}
    </div>
  );
}
