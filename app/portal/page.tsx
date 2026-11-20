"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  QrCode,
  RefreshCw,
  Download,
  Printer,
  Copy,
  Check,
  LogOut,
  CheckCircle2,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatDateTime } from "@/lib/formatting/currency";

interface PortalData {
  member: {
    id: string;
    memberCode: string;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    planName: string;
    expiryDate: string | null;
  };
  credential: {
    id: string;
    tokenLast4: string;
    issuedAt: string;
    hasRenderableToken: boolean;
  } | null;
  qrDataUrl: string | null;
  tokenPreview: string | null;
  recentVisits: { id: string; method: string; checkedInAt: string }[];
}

export default function MemberPortalPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/qr");
      if (res.status === 401) {
        router.push("/portal/login");
        return;
      }
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  async function handleGenerateQr() {
    setGenerating(true);
    setNotice(null);
    try {
      const res = await fetch("/api/portal/qr", { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                credential: json.credential,
                qrDataUrl: json.qrDataUrl,
                tokenPreview: json.tokenPreview,
              }
            : prev
        );
        setNotice("Your new personal QR pass is active. Any previous QR code has been revoked.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/portal/logout", { method: "POST" });
    router.push("/portal/login");
  }

  function handleDownload() {
    if (!data?.qrDataUrl) return;
    const a = document.createElement("a");
    a.href = data.qrDataUrl;
    a.download = `${data.member.memberCode}-ironhub-pass.png`;
    a.click();
  }

  function handleCopyToken() {
    if (!data?.tokenPreview) return;
    navigator.clipboard.writeText(data.tokenPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090A0D] text-xs text-[#8A93A2]">
        Loading your Member Pass...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0D] text-[#F5F6F8]">
      <header className="border-b border-[#1F232C] bg-[#0D0F14] px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <BrandMark />
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#A4AAB5]">
              {data.member.name} ({data.member.memberCode})
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-2.5 py-1.5 text-xs text-[#A4AAB5] hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-3.5 py-2.5 text-xs text-[#2BCB83] print:hidden">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
          {/* Left: Member Summary & Self-Service Controls */}
          <div className="space-y-4 rounded-2xl border border-[#242934] bg-[#111318] p-5 print:hidden md:col-span-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#8A93A2]">Member Profile</p>
                <h1 className="text-lg font-bold text-[#F5F6F8]">{data.member.name}</h1>
                <p className="font-mono text-xs text-[#A4AAB5]">{data.member.memberCode}</p>
              </div>
              <StatusBadge status={data.member.status} />
            </div>

            <div className="space-y-2 rounded-xl border border-[#242934] bg-[#171A21] p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8A93A2]">Plan</span>
                <span className="font-semibold text-[#F5F6F8]">{data.member.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A93A2]">Valid Until</span>
                <span className="text-[#F5F6F8] tabular-nums">
                  {data.member.expiryDate ? formatDate(data.member.expiryDate) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8A93A2]">Pass ID</span>
                <span className="font-mono text-[#F5F6F8]">
                  {data.credential ? `••••-${data.credential.tokenLast4}` : "Not issued"}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateQr}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#E32935] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#F13A46] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>
                {generating
                  ? "Generating..."
                  : data.qrDataUrl
                  ? "Regenerate My QR Code"
                  : "Generate My QR Code"}
              </span>
            </button>

            <p className="text-[11px] leading-relaxed text-[#8A93A2]">
              Only you can generate your QR pass. Present this QR code at the front desk scanner
              when checking into IronHub.
            </p>
          </div>

          {/* Right: High-Contrast White QR Card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[#242934] bg-[#111318] p-5 md:col-span-7">
            {!data.qrDataUrl ? (
              <div className="py-10 text-center">
                <QrCode className="mx-auto h-10 w-10 text-[#8A93A2]" />
                <p className="mt-3 text-sm font-medium text-[#F5F6F8]">
                  Ready to Issue Your Pass
                </p>
                <p className="mt-1 text-xs text-[#8A93A2]">
                  Click &ldquo;Generate My QR Code&rdquo; to create your personal check-in pass.
                </p>
              </div>
            ) : (
              <div className="w-full max-w-[300px] space-y-3.5">
                <div className="rounded-2xl bg-white p-5 text-center text-[#090A0D] shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#525866]">
                      IRONHUB MEMBER PASS
                    </span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      ACTIVE
                    </span>
                  </div>
                  <p className="mt-3 text-base font-bold text-[#090A0D]">{data.member.name}</p>
                  <p className="text-xs text-[#525866]">
                    {data.member.memberCode} · {data.member.planName}
                  </p>
                  <div className="my-3 flex justify-center bg-white p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.qrDataUrl}
                      alt="Member QR Pass"
                      width={216}
                      height={216}
                      className="h-52 w-52"
                    />
                  </div>
                  <p className="border-t border-neutral-200 pt-2.5 font-mono text-[10px] text-[#525866]">
                    ID ••••-{data.credential?.tokenLast4} ·{" "}
                    {data.credential ? formatDateTime(data.credential.issuedAt) : ""}
                  </p>
                </div>

                <div className="flex gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#A4AAB5] hover:text-white"
                    title="Copy token to test desk scanner"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-[#2BCB83]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span>{copied ? "Copied" : "Token"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
