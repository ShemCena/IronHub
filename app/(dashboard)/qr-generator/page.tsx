"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QrCode, Download, Printer, RefreshCw, Ban, Copy, Check } from "lucide-react";
import { formatDateTime } from "@/lib/formatting/currency";

interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  currentPlan: string | null;
  hasActiveQr: boolean;
}

interface GeneratedQrPayload {
  credential: {
    id: string;
    tokenLast4: string;
    issuedAt: string;
  };
  member: {
    id: string;
    memberCode: string;
    name: string;
    plan: string;
  };
  qrDataUrl: string;
  tokenPreview: string;
}

export default function QrGeneratorPage() {
  const searchParams = useSearchParams();
  const initialMemberId = searchParams.get("memberId") ?? "";

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedId, setSelectedId] = useState(initialMemberId);
  const [generated, setGenerated] = useState<GeneratedQrPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/members?pageSize=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(data.members);
          if (!selectedId && data.members.length > 0) {
            setSelectedId(data.members[0].id);
          }
        }
      })
      .catch(() => {});
  }, [selectedId]);

  const selectedMember = members.find((m) => m.id === selectedId);

  async function handleGenerate() {
    if (!selectedId) return;
    if (selectedMember?.hasActiveQr) {
      const ok = window.confirm(
        "Regenerating will immediately revoke this member's previous QR credential. Continue?"
      );
      if (!ok) return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to generate QR credential.");
        return;
      }
      setGenerated(data);
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedId ? { ...m, hasActiveQr: true } : m))
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!selectedId) return;
    const ok = window.confirm("Revoke active QR credential for this member?");
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch("/api/qr/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedId }),
      });
      if (res.ok) {
        setGenerated(null);
        setMembers((prev) =>
          prev.map((m) => (m.id === selectedId ? { ...m, hasActiveQr: false } : m))
        );
        setMessage("Active QR credential revoked.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!generated) return;
    const link = document.createElement("a");
    link.href = generated.qrDataUrl;
    link.download = `${generated.member.memberCode}-qr.png`;
    link.click();
  }

  function handleCopyToken() {
    if (!generated) return;
    navigator.clipboard.writeText(generated.tokenPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-6 animate-panel-enter">
      <div>
        <h1
          className="text-3xl font-bold tracking-tight text-[#F5F6F8]"
          style={{ fontFamily: "var(--font-barlow), sans-serif" }}
        >
          QR CREDENTIALS
        </h1>
        <p className="mt-1 text-sm text-[#A4AAB5]">
          Issue opaque, revocable member QR passes rendered in high-contrast black-on-white.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#A4AAB5]">
              Select Member
            </label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setGenerated(null);
                setMessage(null);
              }}
              className="h-11 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus:border-[#E32935] focus:outline-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>

          {selectedMember && (
            <div className="rounded-lg border border-[#292E38] bg-[#171A21] p-4 text-sm">
              <p className="font-medium text-[#F5F6F8]">
                {selectedMember.firstName} {selectedMember.lastName}
              </p>
              <p className="mt-0.5 text-xs text-[#747C89]">
                {selectedMember.memberCode} · {selectedMember.currentPlan ?? "No Plan"}
              </p>
              <p className="mt-2 text-xs text-[#A4AAB5]">
                Credential Status:{" "}
                <span className="font-medium text-[#F5F6F8]">
                  {selectedMember.hasActiveQr ? "Active credential issued" : "No active QR"}
                </span>
              </p>
            </div>
          )}

          {message && (
            <p className="rounded-lg border border-[#292E38] bg-[#171A21] p-3 text-xs text-[#A4AAB5]">
              {message}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              disabled={loading || !selectedId}
              onClick={handleGenerate}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>
                {selectedMember?.hasActiveQr ? "Regenerate QR" : "Generate QR"}
              </span>
            </button>

            {selectedMember?.hasActiveQr && (
              <button
                type="button"
                disabled={loading}
                onClick={handleRevoke}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#F05252]/40 bg-[#F05252]/10 px-3.5 text-xs font-medium text-[#F05252] hover:bg-[#F05252]/20"
              >
                <Ban className="h-4 w-4" />
                <span>Revoke</span>
              </button>
            )}
          </div>
        </div>

        {/* High-contrast white QR Card */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#292E38] bg-[#111318] p-6 lg:col-span-7">
          {!generated ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <QrCode className="h-12 w-12 text-[#747C89]" />
              <p className="text-sm font-medium text-[#F5F6F8]">
                No QR Credential Rendered
              </p>
              <p className="max-w-sm text-xs text-[#747C89]">
                Select a member and click Generate QR. For security, raw tokens are never stored
                and are only displayed at generation time.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-sm space-y-4">
              <div className="rounded-2xl bg-white p-6 text-center text-[#090A0D]">
                <p className="text-xs font-bold uppercase tracking-widest text-[#747C89]">
                  IRONHUB MEMBER PASS
                </p>
                <p className="mt-1 text-lg font-bold">{generated.member.name}</p>
                <p className="text-xs text-[#747C89]">
                  {generated.member.memberCode} · {generated.member.plan}
                </p>

                <div className="my-4 flex justify-center">
                  {/* Pure black-on-white QR without overlaid logos for maximum scan reliability */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generated.qrDataUrl}
                    alt={`QR Pass for ${generated.member.name}`}
                    width={240}
                    height={240}
                    className="h-60 w-60"
                  />
                </div>

                <p className="font-mono text-[11px] text-[#747C89]">
                  ID ••••-{generated.credential.tokenLast4} · Issued{" "}
                  {formatDateTime(generated.credential.issuedAt)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print Pass</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs font-medium text-[#A4AAB5] hover:text-white"
                  title="Copy opaque token for scanner testing"
                >
                  {copied ? <Check className="h-4 w-4 text-[#2BCB83]" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "Copied" : "Token"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
