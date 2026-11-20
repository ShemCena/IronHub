"use client";

import React from "react";
import Link from "next/link";
import { QrCode, ScanLine, ShieldAlert, ExternalLink } from "lucide-react";

export default function StaffQrPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 animate-panel-enter">
      <div className="rounded-2xl border border-[#242934] bg-[#111318] p-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E32935]/15 text-[#E32935]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#F5F6F8]">
              Client Self-Service QR Policy
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-[#A4AAB5]">
              For member security, Admins and Staff cannot generate QR codes on behalf of clients.
              Members generate and manage their own personal QR pass in the Member Portal, while
              Staff and Admins scan member QR passes at the front desk.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/check-in"
            className="flex items-center justify-between rounded-xl border border-[#E32935]/35 bg-[#E32935]/10 px-4 py-3 text-xs font-semibold text-[#F5F6F8] hover:bg-[#E32935]/20"
          >
            <span className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-[#E32935]" />
              Open Front-Desk QR Scanner
            </span>
          </Link>
          <Link
            href="/portal/login"
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] px-4 py-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
          >
            <span className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-[#4B91F1]" />
              Open Client QR Portal (/portal)
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-[#8A93A2]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
