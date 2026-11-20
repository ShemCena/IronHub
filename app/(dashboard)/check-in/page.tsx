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
  Loader2,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaginationBar } from "@/components/ui/pagination-bar";
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
    photoUrl?: string | null;
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

const LOG_PAGE_SIZE = 5;

export default function CheckInPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [scanState, setScanState] = useState<"idle" | "requesting" | "scanning">("idle");
  const [devices, setDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [manualQuery, setManualQuery] = useState("");
  const [manualMatches, setManualMatches] = useState<MemberSearchHit[]>([]);
  const [recent, setRecent] = useState<RecentCheckIn[]>([]);
  const [logPage, setLogPage] = useState(1);

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
      setLogPage(1);
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
    setScanState("requesting");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const list = await BrowserQRCodeReader.listVideoInputDevices();
      setDevices(list.map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` })));

      const reader = new BrowserQRCodeReader();
      if (!videoRef.current) {
        setScanState("idle");
        return;
      }

      const deviceId = selectedDeviceId || list[0]?.deviceId || undefined;
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (res) => {
          if (res) {
            const text = res.getText();
            controls.stop();
            setScanState("idle");
            submitQrToken(text);
          }
        }
      );
      controlsRef.current = controls;
      setScanState("scanning");
    } catch {
      setScanState("idle");
      setCameraError(
        "Camera access is unavailable or denied. Use manual member search or paste a token."
      );
    }
  }

  function handleStopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanState("idle");
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
      setLogPage(1);
      loadRecent();
    } finally {
      setSubmitting(false);
    }
  }

  const scanning = scanState === "scanning";
  const totalLogPages = Math.max(1, Math.ceil(recent.length / LOG_PAGE_SIZE));
  const pagedRecent = recent.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE);

  return (
    <div className="space-y-4 animate-panel-enter">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">
          Check-In
        </h1>
        <p className="text-xs text-[#A4AAB5]">
          Scan a client&apos;s self-generated QR pass or record a manual front-desk check-in.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Scanner Panel */}
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-5">
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#F5F6F8]">QR Scanner</h2>
              <p className="text-xs text-[#8A93A2]">Camera or USB barcode wedge</p>
            </div>
            {!scanning ? (
              <button
                type="button"
                disabled={scanState === "requesting"}
                onClick={handleStartCamera}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-60"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>{scanState === "requesting" ? "Starting..." : "Start Camera"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopCamera}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#292E38] bg-[#171A21] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
              >
                <CameraOff className="h-3.5 w-3.5" />
                <span>Stop Camera</span>
              </button>
            )}
          </div>

          {devices.length > 1 && (
            <div className="mb-3">
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                aria-label="Select camera device"
                className="h-9 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Viewfinder with 4 L-shaped corner brackets */}
          <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-[#292E38] bg-[#090A0D]">
            <video
              ref={videoRef}
              className={cn("h-full w-full object-cover", !scanning && "hidden")}
              muted
              playsInline
            />

            {scanState === "requesting" && (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#E32935]" />
                <p className="text-xs text-[#A4AAB5]">Requesting camera permission...</p>
              </div>
            )}

            {scanState === "idle" && (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E32935]/12 text-[#E32935] ring-1 ring-[#E32935]/30 shadow-[0_0_24px_rgba(227,41,53,0.2)]">
                  <QrCode className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#F5F6F8]">Scan Member QR Code</p>
                  <p className="mt-0.5 text-xs text-[#8A93A2]">
                    Click Start Camera or paste a token below
                  </p>
                </div>
              </div>
            )}

            {/* L-shaped corner reticles */}
            <div className="pointer-events-none absolute inset-5">
              <span
                className={cn(
                  "absolute left-0 top-0 h-5 w-5 rounded-tl-md border-l-2 border-t-2",
                  scanning ? "border-[#E32935]" : "border-[#8A93A2]/60"
                )}
              />
              <span
                className={cn(
                  "absolute right-0 top-0 h-5 w-5 rounded-tr-md border-r-2 border-t-2",
                  scanning ? "border-[#E32935]" : "border-[#8A93A2]/60"
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 left-0 h-5 w-5 rounded-bl-md border-b-2 border-l-2",
                  scanning ? "border-[#E32935]" : "border-[#8A93A2]/60"
                )}
              />
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-5 w-5 rounded-br-md border-b-2 border-r-2",
                  scanning ? "border-[#E32935]" : "border-[#8A93A2]/60"
                )}
              />
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
            className="mt-3.5 flex gap-2"
          >
            <input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Or scan / paste QR token (IH1:...)"
              className="h-9 flex-1 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !tokenInput.trim()}
              className="h-9 rounded-lg border border-[#292E38] bg-[#171A21] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D] disabled:opacity-40"
            >
              Verify
            </button>
          </form>
        </div>

        {/* Result & Manual Fallback */}
        <div className="space-y-4 lg:col-span-7">
          {/* Verification Card */}
          <div
            className={cn(
              "flex min-h-[230px] flex-col items-center justify-center rounded-xl border p-6 text-center transition-colors",
              result?.outcome === "APPROVED"
                ? "border-[#2BCB83]/40 bg-gradient-to-b from-[#164A31]/80 via-[#0E1E17] to-[#111318]"
                : result?.outcome === "DENIED"
                ? "border-[#F05252]/40 bg-gradient-to-b from-[#4A161A]/80 via-[#1E0E10] to-[#111318]"
                : "border-[#242934] bg-gradient-to-b from-[#152820]/50 via-[#111318] to-[#111318]"
            )}
          >
            {!result ? (
              <div className="flex max-w-sm flex-col items-center gap-2.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2BCB83]/15 text-[#2BCB83] ring-1 ring-[#2BCB83]/30">
                  <UserCheck className="h-5 w-5" />
                </div>
                <p className="text-base font-semibold text-[#F5F6F8]">Ready for Check-In</p>
                <p className="text-xs text-[#A4AAB5]">
                  Scan a member&apos;s QR code on the left or search manually below to verify membership access.
                </p>
              </div>
            ) : result.outcome === "APPROVED" ? (
              <div className="flex w-full max-w-xs flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2BCB83] text-[#090A0D] shadow-[0_0_22px_rgba(43,203,131,0.45)]">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="mt-3 text-base font-bold text-[#2BCB83]">
                  Check-In Successful!
                </p>
                {result.member?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={result.member.photoUrl}
                    alt={result.member.name}
                    className="mt-3 h-13 w-13 rounded-full border-2 border-[#2BCB83]/60 object-cover"
                  />
                ) : (
                  <div className="mt-3 flex h-13 w-13 items-center justify-center rounded-full border-2 border-[#2BCB83]/50 bg-[#171A21] text-sm font-bold text-white">
                    {(result.member?.name ?? "M")
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                )}
                <p className="mt-2.5 text-base font-semibold text-white">
                  {result.member?.name}
                </p>
                <p className="text-xs text-[#A4AAB5]">
                  {result.member?.planName} · {result.member?.memberCode}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8A93A2] tabular-nums">
                  {result.checkedInAt ? `Today · ${formatTime(result.checkedInAt)}` : ""}
                  {result.member?.expiryDate
                    ? ` · Valid until ${formatDate(result.member.expiryDate)}`
                    : ""}
                </p>
                <div className="mt-3.5 flex w-full items-center gap-2">
                  {result.member && (
                    <Link
                      href={`/members/${result.member.id}`}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs font-semibold text-white hover:bg-[#20242D]"
                    >
                      <span>View Member</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="h-9 rounded-lg border border-[#292E38] bg-[#111318] px-3 text-xs text-[#A4AAB5] hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex w-full max-w-xs flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F05252] text-white shadow-[0_0_22px_rgba(240,82,82,0.45)]">
                  <XCircle className="h-6 w-6" />
                </div>
                <p className="mt-3 text-base font-bold text-[#F05252]">Check-In Denied</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {result.member?.name ?? "Unrecognized Credential"}
                </p>
                <p className="mt-0.5 text-xs text-[#F05252]">
                  {result.reason ?? "Access is not permitted."}
                </p>
                <div className="mt-3.5 flex w-full items-center gap-2">
                  {result.member && (
                    <Link
                      href={`/members/${result.member.id}`}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-xs font-semibold text-white hover:bg-[#20242D]"
                    >
                      <span>View Profile</span>
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="h-9 rounded-lg border border-[#292E38] bg-[#111318] px-3 text-xs text-[#A4AAB5] hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Manual Fallback */}
          <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5">
            <h2 className="text-sm font-semibold text-[#F5F6F8]">
              Manual Check-In Fallback
            </h2>
            <p className="text-xs text-[#8A93A2]">
              Search by name or member code if a client forgot their phone.
            </p>

            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A93A2]" />
              <input
                type="search"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Type member name or code (e.g. Juan or IH-1001)..."
                className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] pl-8.5 pr-3 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
              />
            </div>

            {manualMatches.length > 0 && (
              <div className="mt-2.5 divide-y divide-[#242934] rounded-lg border border-[#242934] bg-[#171A21]">
                {manualMatches.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[13px]"
                  >
                    <div>
                      <p className="font-medium text-[#F5F6F8]">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-[#8A93A2]">
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

          {/* Recent Attendance Log with Pagination */}
          <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5">
            <h2 className="mb-2.5 text-sm font-semibold text-[#F5F6F8]">
              Recent Attendance Log
            </h2>
            <div className="divide-y divide-[#242934]">
              {pagedRecent.length === 0 ? (
                <p className="py-5 text-center text-xs text-[#8A93A2]">
                  No check-ins recorded yet.
                </p>
              ) : (
                pagedRecent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                  >
                    <div>
                      <p className="font-medium text-[#F5F6F8]">{r.memberName}</p>
                      <p className="text-xs text-[#8A93A2]">
                        {r.memberCode} · {r.method} · {formatTime(r.checkedInAt)}
                        {r.denialReason ? ` — ${r.denialReason}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={r.outcome} />
                  </div>
                ))
              )}
            </div>
            {recent.length > 0 && (
              <div className="mt-2.5 border-t border-[#242934] pt-2.5">
                <PaginationBar
                  page={logPage}
                  totalPages={totalLogPages}
                  totalItems={recent.length}
                  pageSize={LOG_PAGE_SIZE}
                  onPageChange={setLogPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
