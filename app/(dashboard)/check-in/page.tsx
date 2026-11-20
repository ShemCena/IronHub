"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  XCircle,
  Search,
  UserCheck,
  QrCode,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

interface CheckInResult {
  outcome: "APPROVED" | "DENIED";
  reason?: string | null;
  checkedInAt?: string;
  member?: {
    id: string;
    memberCode: string;
    name: string;
    planName: string;
    expiryDate: string | null;
  };
}

interface RecentCheckIn {
  id: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  planName: string;
  method: string;
  outcome: string;
  denialReason: string | null;
  checkedInAt: string;
}

interface MemberSearchHit {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  status: string;
  currentPlan: string | null;
}

export default function CheckInPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [manualQuery, setManualQuery] = useState("");
  const [manualMatches, setManualMatches] = useState<MemberSearchHit[]>([]);
  const [recent, setRecent] = useState<RecentCheckIn[]>([]);

  const loadRecent = useCallback(async () => {
    const res = await fetch("/api/check-in");
    if (res.ok) {
      const data = await res.json();
      setRecent(data.records ?? []);
    }
  }, []);

  useEffect(() => {
    loadRecent();
    return () => {
      controlsRef.current?.stop();
    };
  }, [loadRecent]);

  useEffect(() => {
    const q = manualQuery.trim();
    if (q.length < 2) {
      setManualMatches([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/members?q=${encodeURIComponent(q)}&pageSize=6`);
      if (res.ok) {
        const data = await res.json();
        setManualMatches(data.members ?? []);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [manualQuery]);

  async function submitQrToken(token: string) {
    if (submitting || !token.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "QR", token: token.trim() }),
      });
      const data = await res.json();
      setResult({
        outcome: data.outcome ?? "DENIED",
        reason: data.reason ?? data.error,
        checkedInAt: data.checkedInAt,
        member: data.member,
      });
      loadRecent();
    } catch {
      setResult({
        outcome: "DENIED",
        reason: "Network error while validating QR credential.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartCamera() {
    setCameraError(null);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      setScanning(true);

      if (!videoRef.current) return;
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (res) => {
          if (res) {
            const text = res.getText();
            controls.stop();
            setScanning(false);
            submitQrToken(text);
          }
        }
      );
      controlsRef.current = controls;
    } catch {
      setScanning(false);
      setCameraError(
        "Camera access is unavailable or denied. Use manual member search or paste a token."
      );
    }
  }

  function handleStopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  }

  async function handleManualCheckIn(memberId: string) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "MANUAL", memberId }),
      });
      const data = await res.json();
      setResult({
        outcome: data.outcome ?? "DENIED",
        reason: data.reason ?? data.error,
        checkedInAt: data.checkedInAt,
        member: data.member,
      });
      setManualQuery("");
      setManualMatches([]);
      loadRecent();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 animate-panel-enter">
      <div>
        <h1
          className="text-3xl font-bold tracking-tight text-[#F5F6F8]"
          style={{ fontFamily: "var(--font-barlow), sans-serif" }}
        >
          CHECK-IN
        </h1>
        <p className="mt-1 text-sm text-[#A4AAB5]">
          Validate member QR credentials or record a manual front-desk check-in.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Scanner Panel */}
        <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#F5F6F8]">QR Scanner</h2>
            {!scanning ? (
              <button
                type="button"
                onClick={handleStartCamera}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46]"
              >
                <Camera className="h-4 w-4" />
                <span>Start Camera</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopCamera}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#292E38] bg-[#171A21] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
              >
                <CameraOff className="h-4 w-4" />
                <span>Stop Camera</span>
              </button>
            )}
          </div>

          <div className="relative flex aspect-square max-h-72 w-full items-center justify-center overflow-hidden rounded-xl border border-[#292E38] bg-[#090A0D]">
            <video
              ref={videoRef}
              className={cn("h-full w-full object-cover", !scanning && "hidden")}
              muted
              playsInline
            />
            {!scanning && (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <QrCode className="h-10 w-10 text-[#747C89]" />
                <p className="text-xs text-[#A4AAB5]">
                  Camera is idle. Click Start Camera when ready to scan a member QR code.
                </p>
              </div>
            )}

            {/* Scanner frame corners & active-only scan line */}
            <div className="pointer-events-none absolute inset-6 rounded-lg border border-[#E32935]/40">
              {scanning && (
                <div className="animate-scan-line h-0.5 w-full bg-[#E32935] shadow-[0_0_8px_#E32935]" />
              )}
            </div>
          </div>

          {cameraError && (
            <p className="mt-3 rounded-lg border border-[#F2B84B]/30 bg-[#F2B84B]/10 p-2.5 text-xs text-[#F2B84B]">
              {cameraError}
            </p>
          )}

          {/* Hardware USB scanner / paste fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitQrToken(tokenInput);
              setTokenInput("");
            }}
            className="mt-4 flex gap-2"
          >
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Or scan / paste QR token (IH1:...)"
              className="h-10 flex-1 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs text-[#F5F6F8] placeholder:text-[#747C89] focus:border-[#E32935] focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !tokenInput.trim()}
              className="h-10 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D] disabled:opacity-40"
            >
              Verify
            </button>
          </form>
        </div>

        {/* Result & Manual Fallback */}
        <div className="space-y-6 lg:col-span-7">
          {/* Verification Result */}
          <div
            className={cn(
              "rounded-xl border p-5 transition-colors",
              result?.outcome === "APPROVED"
                ? "border-[#2BCB83]/40 bg-[#2BCB83]/10"
                : result?.outcome === "DENIED"
                ? "border-[#F05252]/40 bg-[#F05252]/10"
                : "border-[#292E38] bg-[#111318]"
            )}
          >
            {!result ? (
              <div className="flex items-center gap-3 text-sm text-[#747C89]">
                <UserCheck className="h-5 w-5" />
                <span>Scan a QR code or select a member below to verify access.</span>
              </div>
            ) : result.outcome === "APPROVED" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#2BCB83]" />
                  <div>
                    <p className="text-base font-semibold text-[#F5F6F8]">
                      Check-In Approved — {result.member?.name}
                    </p>
                    <p className="text-xs text-[#A4AAB5]">
                      {result.member?.memberCode} · {result.member?.planName}
                      {result.member?.expiryDate
                        ? ` · Valid until ${formatDate(result.member.expiryDate)}`
                        : ""}
                    </p>
                  </div>
                </div>
                {result.member && (
                  <Link
                    href={`/members/${result.member.id}`}
                    className="rounded-lg border border-[#292E38] bg-[#111318] px-3 py-1.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                  >
                    View Profile
                  </Link>
                )}
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#F05252]" />
                <div>
                  <p className="text-base font-semibold text-[#F5F6F8]">
                    Check-In Denied {result.member ? `— ${result.member.name}` : ""}
                  </p>
                  <p className="text-xs text-[#F05252]">
                    {result.reason ?? "Access is not permitted."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Manual Fallback */}
          <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
            <h2 className="text-base font-semibold text-[#F5F6F8]">
              Manual Check-In Fallback
            </h2>
            <p className="mt-0.5 text-xs text-[#747C89]">
              Search by name or member code if a member forgot their QR card. Recorded in audit log.
            </p>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747C89]" />
              <input
                type="search"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Type member name or code (e.g. Juan or IH-1001)..."
                className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] pl-9 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#747C89] focus:border-[#E32935] focus:outline-none"
              />
            </div>

            {manualMatches.length > 0 && (
              <div className="mt-2 divide-y divide-[#292E38] rounded-lg border border-[#292E38] bg-[#171A21]">
                {manualMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#F5F6F8]">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-[#747C89]">
                        {m.memberCode} · {m.currentPlan ?? "No Plan"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={m.status} />
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleManualCheckIn(m.id)}
                        className="rounded-md bg-[#E32935] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#F13A46]"
                      >
                        Check In
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Attendance Log */}
          <div className="rounded-xl border border-[#292E38] bg-[#111318] p-5">
            <h2 className="mb-3 text-base font-semibold text-[#F5F6F8]">
              Recent Attendance Log
            </h2>
            <div className="divide-y divide-[#292E38]">
              {recent.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#747C89]">
                  No check-ins recorded yet.
                </p>
              ) : (
                recent.slice(0, 8).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#F5F6F8]">{r.memberName}</p>
                      <p className="text-xs text-[#747C89]">
                        {r.memberCode} · {r.method} · {formatTime(r.checkedInAt)}
                        {r.denialReason ? ` — ${r.denialReason}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={r.outcome} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
