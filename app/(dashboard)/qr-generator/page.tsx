"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QrCode, Download, Printer, RefreshCw, Ban, Copy, Check, CheckCircle2, Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/formatting/currency";

interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  status: string;
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
  const [filterText, setFilterText] = useState("");
  const [selectedId, setSelectedId] = useState(initialMemberId);
  const [generated, setGenerated] = useState<GeneratedQrPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "info"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"REGENERATE" | "REVOKE" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/members?pageSize=50")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.members) {
          setMembers(data.members);
          setSelectedId((prev) => prev || data.members[0]?.id || "");
        }
      })
      .catch(() => {});
  }, []);

  const filteredMembers = members.filter((m) => {
    const q = filterText.trim().toLowerCase();
    if (!q) return true;
    return (
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q)
    );
  });

  const selectedMember = members.find((m) => m.id === selectedId);

  async function executeGenerate() {
    if (!selectedId) return;
    setConfirmAction(null);
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/qr/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice({ type: "info", text: data.error ?? "Failed to generate QR credential." });
        return;
      }
      setGenerated(data);
      setMembers((prev) =>
        prev.map((m) => (m.id === selectedId ? { ...m, hasActiveQr: true } : m))
      );
      setNotice({ type: "success", text: "New QR credential issued and prior tokens revoked." });
    } finally {
      setLoading(false);
    }
  }

  async function executeRevoke() {
    if (!selectedId) return;
    setConfirmAction(null);
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
        setNotice({ type: "info", text: "Active QR credential revoked." });
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
      <div className="print:hidden">
        <h1 className="text-3xl font-semibold tracking-tight text-[#F5F6F8]">
          QR Credentials
        </h1>
        <p className="mt-1 text-sm text-[#A4AAB5]">
          Issue opaque, revocable member QR passes rendered in high-contrast black-on-white.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-[#292E38] bg-[#111318] p-5 print:hidden lg:col-span-5">
          <div>
            <label htmlFor="qr-member-filter" className="mb-1.5 block text-xs font-medium text-[#A4AAB5]">
              Find Member
            </label>
            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A2]" />
              <input
                id="qr-member-filter"
                type="search"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter by name or code..."
                className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] pl-9 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
              />
            </div>

            <label htmlFor="qr-member-select" className="mb-1.5 block text-xs font-medium text-[#A4AAB5]">
              Select Member
            </label>
            <select
              id="qr-member-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setGenerated(null);
                setNotice(null);
              }}
              className="h-11 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
            >
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>

          {selectedMember && (
            <div className="rounded-xl border border-[#292E38] bg-[#171A21] p-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#292E38] bg-[#111318] text-xs font-semibold text-[#F5F6F8]">
                    {`${selectedMember.firstName[0] ?? ""}${selectedMember.lastName[0] ?? ""}`.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[#F5F6F8]">
                      {selectedMember.firstName} {selectedMember.lastName}
                    </p>
                    <p className="text-xs text-[#8A93A2]">
                      {selectedMember.memberCode} · {selectedMember.currentPlan ?? "No Plan"}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selectedMember.status} />
              </div>
              <p className="mt-3 border-t border-[#292E38] pt-2.5 text-xs text-[#A4AAB5]">
                Credential Status:{" "}
                <span className="font-medium text-[#F5F6F8]">
                  {selectedMember.hasActiveQr ? "Active QR on file" : "No active QR"}
                </span>
              </p>
            </div>
          )}

          {notice && (
            <div
              className={
                notice.type === "success"
                  ? "flex items-center gap-2 rounded-lg border border-[#2BCB83]/30 bg-[#2BCB83]/10 p-3 text-xs text-[#2BCB83]"
                  : "rounded-lg border border-[#292E38] bg-[#171A21] p-3 text-xs text-[#A4AAB5]"
              }
            >
              {notice.type === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>{notice.text}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              disabled={loading || !selectedId}
              onClick={() =>
                selectedMember?.hasActiveQr ? setConfirmAction("REGENERATE") : executeGenerate()
              }
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{selectedMember?.hasActiveQr ? "Regenerate QR" : "Generate QR"}</span>
            </button>

            {selectedMember?.hasActiveQr && (
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmAction("REVOKE")}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#F05252]/40 bg-[#F05252]/10 px-3.5 text-xs font-medium text-[#F05252] hover:bg-[#F05252]/20"
              >
                <Ban className="h-4 w-4" />
                <span>Revoke</span>
              </button>
            )}
          </div>
        </div>

        {/* High-contrast white QR Card */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#292E38] bg-[#111318] p-6 print:border-0 print:bg-white print:p-0 lg:col-span-7">
          {!generated ? (
            <div className="w-full max-w-[320px] rounded-2xl border border-dashed border-[#363D4A] bg-[#090A0D]/70 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[#292E38] bg-[#111318] text-[#8A93A2]">
                <QrCode className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm font-medium text-[#F5F6F8]">
                Member QR Pass Preview
              </p>
              <p className="mt-1 text-xs text-[#8A93A2]">
                Raw tokens are hashed on the server and only displayed at generation time.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-[340px] space-y-4">
              <div className="rounded-2xl bg-white p-6 text-center text-[#090A0D] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#525866]">
                    IRONHUB PASS
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    ACTIVE
                  </span>
                </div>

                <p className="mt-4 text-lg font-bold text-[#090A0D]">{generated.member.name}</p>
                <p className="text-xs text-[#525866]">
                  {generated.member.memberCode} · {generated.member.plan}
                </p>

                <div className="my-4 flex justify-center bg-white p-2">
                  {/* Pure black-on-white QR without overlaid logos for scan reliability */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={generated.qrDataUrl}
                    alt={`QR Pass for ${generated.member.name}`}
                    width={240}
                    height={240}
                    className="h-56 w-56"
                  />
                </div>

                <div className="border-t border-neutral-200 pt-3">
                  <p className="font-mono text-[11px] text-[#525866]">
                    ID ••••-{generated.credential.tokenLast4} ·{" "}
                    {formatDateTime(generated.credential.issuedAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 print:hidden">
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#292E38] bg-[#111318] p-6 animate-panel-enter">
            <h2 className="text-base font-semibold text-[#F5F6F8]">
              {confirmAction === "REGENERATE"
                ? "Regenerate QR Credential?"
                : "Revoke Active QR Credential?"}
            </h2>
            <p className="mt-2 text-xs text-[#A4AAB5]">
              {confirmAction === "REGENERATE"
                ? "This will immediately invalidate the member's previous QR pass and issue a new one."
                : "The member will not be able to scan in with their current QR pass until a new one is issued."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="h-9 rounded-lg border border-[#292E38] bg-[#171A21] px-3.5 text-xs font-medium text-[#A4AAB5] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction === "REGENERATE" ? executeGenerate : executeRevoke}
                className="h-9 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
