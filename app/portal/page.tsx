"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  CreditCard,
  Settings,
  RefreshCw,
  Download,
  Printer,
  Copy,
  Check,
  LogOut,
  CheckCircle2,
  Camera,
  Trash2,
  Save,
  Clock,
  ShieldCheck,
  Menu,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useFeedback } from "@/components/ui/feedback-modal";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

type PortalSection = "overview" | "qr" | "attendance" | "membership" | "settings";

interface PortalDashboardPayload {
  gymName: string;
  gymStatus: { isOpen: boolean; label: string };
  member: {
    id: string;
    memberCode: string;
    firstName: string;
    lastName: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    photoUrl: string | null;
    status: string;
    joinedAt: string;
  };
  currentPlan: {
    id: string;
    name: string;
    price: number;
    startDate: string;
    endDate: string;
    status: string;
    daysRemaining: number | null;
    benefits: string[];
  } | null;
  stats: {
    visitsThisMonth: number;
    totalVisits: number;
    daysRemaining: number | null;
  };
  memberships: {
    id: string;
    planName: string;
    price: number;
    startDate: string;
    endDate: string;
    status: string;
    isRenewal: boolean;
  }[];
  payments: {
    id: string;
    receiptNumber: string;
    planName: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
  }[];
  attendance: {
    id: string;
    method: string;
    outcome: string;
    denialReason: string | null;
    checkedInAt: string;
  }[];
  credential: {
    id: string;
    tokenLast4: string;
    issuedAt: string;
  } | null;
  qrDataUrl: string | null;
  tokenPreview: string | null;
}

const NAV_ITEMS: {
  id: PortalSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "qr", label: "My QR Pass", icon: QrCode },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "membership", label: "Plan & Receipts", icon: CreditCard },
  { id: "settings", label: "Settings", icon: Settings },
];

const PORTAL_PAGE_SIZE = 6;

async function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image format."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable."));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function MemberPortalDashboardPage() {
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [section, setSection] = useState<PortalSection>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [data, setData] = useState<PortalDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [attPage, setAttPage] = useState(1);
  const [payPage, setPayPage] = useState(1);

  const [profileForm, setProfileForm] = useState({
    phone: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    photoUrl: null as string | null,
    currentPassword: "",
    newPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.ok) {
        const json: PortalDashboardPayload = await res.json();
        setData(json);
        setProfileForm({
          phone: json.member.phone ?? "",
          address: json.member.address ?? "",
          emergencyContactName: json.member.emergencyContactName ?? "",
          emergencyContactPhone: json.member.emergencyContactPhone ?? "",
          photoUrl: json.member.photoUrl ?? null,
          currentPassword: "",
          newPassword: "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  function flashNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  }

  async function handleGenerateQr() {
    setGeneratingQr(true);
    setError(null);
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
        showSuccess(
          "QR Pass Active",
          "Your personal QR pass is ready. Present it to the front desk when entering the gym."
        );
      } else {
        showError("QR Error", json.error ?? "Could not generate QR pass.");
      }
    } finally {
      setGeneratingQr(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setProfileForm((prev) => ({ ...prev, photoUrl: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        phone: profileForm.phone,
        address: profileForm.address,
        emergencyContactName: profileForm.emergencyContactName,
        emergencyContactPhone: profileForm.emergencyContactPhone,
        photoUrl: profileForm.photoUrl,
      };
      if (profileForm.newPassword.trim()) {
        payload.currentPassword = profileForm.currentPassword;
        payload.newPassword = profileForm.newPassword;
      }

      const res = await fetch("/api/portal/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json.error ?? "Failed to update settings.";
        setError(msg);
        showError("Update Failed", msg);
        return;
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              member: {
                ...prev.member,
                phone: json.member.phone,
                address: json.member.address,
                emergencyContactName: json.member.emergencyContactName,
                emergencyContactPhone: json.member.emergencyContactPhone,
                photoUrl: json.member.photoUrl,
              },
            }
          : prev
      );
      setProfileForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
      showSuccess("Profile Saved", "Your contact details, photo, and security settings have been saved.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleDownloadQr() {
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
        Loading your Client Dashboard...
      </div>
    );
  }

  const initials = `${data.member.firstName[0] ?? ""}${data.member.lastName[0] ?? ""}`.toUpperCase();
  const daysLeft = data.stats.daysRemaining;
  const expiryLabel =
    daysLeft === null
      ? "No active plan"
      : daysLeft < 0
      ? `Expired ${Math.abs(daysLeft)}d ago`
      : `${daysLeft} days remaining`;

  const totalAttPages = Math.max(1, Math.ceil(data.attendance.length / PORTAL_PAGE_SIZE));
  const pagedAttendance = data.attendance.slice(
    (attPage - 1) * PORTAL_PAGE_SIZE,
    attPage * PORTAL_PAGE_SIZE
  );

  const totalPayPages = Math.max(1, Math.ceil(data.payments.length / PORTAL_PAGE_SIZE));
  const pagedPayments = data.payments.slice(
    (payPage - 1) * PORTAL_PAGE_SIZE,
    payPage * PORTAL_PAGE_SIZE
  );

  return (
    <div className="flex min-h-screen bg-[#090A0D] text-[#F5F6F8]">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/75 print:hidden lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Balanced Fixed Client Sidebar matching Staff Workspace */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[216px] shrink-0 flex-col border-r border-[#1F232C] bg-[#0D0F14] transition-transform duration-200 ease-[var(--ease-out)] print:hidden lg:sticky lg:top-0 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-15 shrink-0 items-center justify-between px-4">
          <BrandMark />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 text-[#A4AAB5] hover:bg-[#20242D] hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2.5" aria-label="Client navigation">
          {NAV_ITEMS.map((item) => {
            const active = section === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSection(item.id);
                  setMobileOpen(false);
                }}
                className={cn(
                  "group relative flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] font-medium transition-[background-color,color,box-shadow] duration-150",
                  active
                    ? "bg-gradient-to-r from-[#E32935] via-[#B81F2A]/75 to-[#E32935]/10 text-white shadow-[0_6px_18px_-6px_rgba(227,41,53,0.5)]"
                    : "text-[#A4AAB5] hover:bg-[#171A21] hover:text-[#F5F6F8]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-white" : "text-[#8A93A2] group-hover:text-[#F5F6F8]"
                  )}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Client Card */}
        <div className="shrink-0 p-3">
          <div className="relative h-[142px] overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/sidebar-athlete.jpg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover object-top opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/55 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-3 text-center">
              <p
                className="text-sm font-bold uppercase leading-tight tracking-wider text-white"
                style={{ fontFamily: "var(--font-barlow), sans-serif" }}
              >
                STRONGER
                <span className="block text-[#E32935]">TOGETHER</span>
              </p>
              <span className="mt-0.5 text-[11px] font-medium text-[#A4AAB5]">
                {data.member.memberCode}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-15 shrink-0 items-center justify-between gap-3 border-b border-[#1F232C] bg-[#090A0D]/90 px-4 backdrop-blur-md print:hidden md:px-6">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-[#242934] bg-[#111318] p-1.5 text-[#A4AAB5] hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="text-xs font-medium text-[#A4AAB5]">
              {data.gymName} · Client Workspace
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="flex h-9 items-center gap-2 rounded-lg border border-[#242934] bg-[#111318] px-2 transition-colors hover:bg-[#171A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
              aria-expanded={accountOpen}
            >
              {data.member.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.member.photoUrl}
                  alt={data.member.name}
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-[#E32935]/40"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E32935]/18 text-[11px] font-semibold text-[#E32935] ring-1 ring-[#E32935]/35">
                  {initials}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium leading-tight text-[#F5F6F8]">
                  {data.member.name}
                </p>
                <p className="text-[10px] leading-tight text-[#8A93A2]">
                  Client · {data.member.memberCode}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-[#8A93A2]" />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-[#292E38] bg-[#171A21] p-1.5 shadow-2xl">
                <div className="border-b border-[#292E38] px-2.5 py-1.5">
                  <p className="truncate text-xs font-medium text-[#F5F6F8]">{data.member.name}</p>
                  <p className="truncate text-[10px] text-[#8A93A2]">
                    {data.member.email ?? data.member.memberCode}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSection("settings");
                    setAccountOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings &amp; Account</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#F05252] hover:bg-[#F05252]/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 px-4 py-4 md:px-6 md:py-5">
          {notice && (
            <div className="flex items-center gap-2 rounded-xl border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-3.5 py-2.5 text-xs text-[#2BCB83] print:hidden">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-[#F05252]/30 bg-[#F05252]/10 px-3.5 py-2.5 text-xs text-[#F05252] print:hidden">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: OVERVIEW DASHBOARD */}
          {section === "overview" && (
            <div className="space-y-4 animate-panel-enter">
              {/* Hero */}
              <section className="relative min-h-[144px] overflow-hidden rounded-2xl border border-[#242934] bg-[#0D0F14]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/hero-athlete.jpg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-75"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#090A0D] via-[#090A0D]/80 to-[#090A0D]/40" />

                <div className="relative flex min-h-[144px] flex-col justify-between gap-3.5 p-5 md:flex-row md:items-center md:px-6">
                  <div className="flex items-center gap-4">
                    {data.member.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={data.member.photoUrl}
                        alt={data.member.name}
                        className="h-14 w-14 rounded-xl border-2 border-[#E32935]/50 object-cover shadow-lg"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#292E38] bg-[#171A21] text-lg font-bold text-[#F5F6F8]">
                        {initials}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                          Welcome back,{" "}
                          <span className="italic text-[#E32935]">{data.member.firstName}!</span>
                        </h1>
                        <StatusBadge status={data.member.status} />
                      </div>
                      <p className="mt-1 text-xs text-[#A4AAB5]">
                        Client ID <span className="font-mono text-white">{data.member.memberCode}</span> ·
                        Track your attendance, plan expiration, and personal QR check-in pass.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium",
                        data.gymStatus.isOpen
                          ? "border-[#2BCB83]/30 bg-[#2BCB83]/10 text-[#2BCB83]"
                          : "border-[#F05252]/30 bg-[#F05252]/10 text-[#F05252]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          data.gymStatus.isOpen ? "bg-[#2BCB83]" : "bg-[#F05252]"
                        )}
                      />
                      {data.gymStatus.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSection("qr")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46]"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>Open My QR Pass</span>
                    </button>
                  </div>
                </div>
              </section>

              {/* 4 Client KPIs in 1 Horizontal Row (md:grid-cols-4) */}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
                <KpiCard
                  label="Current Plan"
                  value={
                    data.currentPlan
                      ? `${data.currentPlan.name} (${formatCurrency(data.currentPlan.price)})`
                      : "None"
                  }
                  deltaPercent={0}
                  icon={ShieldCheck}
                  tone="blue"
                />
                <KpiCard
                  label="Plan Expiration"
                  value={
                    data.currentPlan ? formatDate(data.currentPlan.endDate) : "—"
                  }
                  helper={expiryLabel}
                  icon={Clock}
                  tone={daysLeft !== null && daysLeft <= 7 ? "amber" : "green"}
                />
                <KpiCard
                  label="Visits This Month"
                  value={data.stats.visitsThisMonth}
                  deltaPercent={15}
                  icon={CalendarCheck}
                  tone="green"
                />
                <KpiCard
                  label="Total Check-Ins"
                  value={data.stats.totalVisits}
                  deltaPercent={12}
                  icon={QrCode}
                  tone="purple"
                />
              </div>

              {/* Lower 2-column grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-7">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-[#F5F6F8]">Recent Attendance</h2>
                      <p className="text-xs text-[#8A93A2]">Your latest check-ins at the gym</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSection("attendance")}
                      className="text-xs font-medium text-[#E32935] hover:text-[#F13A46]"
                    >
                      View All
                    </button>
                  </div>

                  {data.attendance.length === 0 ? (
                    <p className="py-8 text-center text-xs text-[#8A93A2]">
                      No check-ins recorded yet. Generate your QR pass and scan at the front desk!
                    </p>
                  ) : (
                    <div className="divide-y divide-[#242934]">
                      {data.attendance.slice(0, 5).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between py-2.5 text-[13px]"
                        >
                          <div>
                            <p className="font-medium text-[#F5F6F8]">
                              {a.method === "QR" ? "QR Pass Scan" : "Front-Desk Manual Check-In"}
                            </p>
                            <p className="text-xs text-[#8A93A2]">
                              {formatDateTime(a.checkedInAt)}
                              {a.denialReason ? ` — ${a.denialReason}` : ""}
                            </p>
                          </div>
                          <StatusBadge status={a.outcome} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick QR & Profile Card */}
                <div className="flex flex-col justify-between rounded-xl border border-[#242934] bg-[#111318] p-4 md:p-5 lg:col-span-5">
                  <div>
                    <h2 className="text-sm font-semibold text-[#F5F6F8]">My Check-In Pass</h2>
                    <p className="text-xs text-[#8A93A2]">
                      Self-generated QR pass for front-desk scanning
                    </p>
                  </div>

                  <div className="my-3.5 flex flex-col items-center justify-center rounded-xl border border-[#242934] bg-[#171A21] p-4 text-center">
                    {data.qrDataUrl ? (
                      <>
                        <div className="rounded-xl bg-white p-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={data.qrDataUrl}
                            alt="My QR Pass"
                            className="h-36 w-36"
                          />
                        </div>
                        <p className="mt-2 font-mono text-xs text-[#A4AAB5]">
                          Pass ID ••••-{data.credential?.tokenLast4}
                        </p>
                      </>
                    ) : (
                      <div className="py-6">
                        <QrCode className="mx-auto h-8 w-8 text-[#8A93A2]" />
                        <p className="mt-2 text-xs text-[#A4AAB5]">No active QR pass generated yet</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSection("qr")}
                      className="h-9 rounded-lg bg-[#E32935] px-3 text-xs font-semibold text-white hover:bg-[#F13A46]"
                    >
                      {data.qrDataUrl ? "Manage QR Pass" : "Generate QR Pass"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSection("settings")}
                      className="h-9 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                    >
                      Upload Photo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: MY QR PASS */}
          {section === "qr" && (
            <div className="grid grid-cols-1 gap-4 animate-panel-enter md:grid-cols-12">
              <div className="space-y-4 rounded-xl border border-[#242934] bg-[#111318] p-5 md:p-6 print:hidden md:col-span-5">
                <div>
                  <h1 className="text-lg font-semibold text-[#F5F6F8]">My Personal QR Pass</h1>
                  <p className="mt-1 text-xs text-[#A4AAB5]">
                    Generate or refresh your QR credential. Staff will scan this code at the front desk.
                  </p>
                </div>

                <div className="space-y-2.5 rounded-xl border border-[#242934] bg-[#171A21] p-4 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-[#8A93A2]">Client</span>
                    <span className="font-semibold text-[#F5F6F8]">{data.member.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A93A2]">Client ID</span>
                    <span className="font-mono text-[#F5F6F8]">{data.member.memberCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A93A2]">Plan</span>
                    <span className="text-[#F5F6F8]">{data.currentPlan?.name ?? "No Plan"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8A93A2]">Expiration</span>
                    <span className="text-[#F5F6F8] tabular-nums">
                      {data.currentPlan ? formatDate(data.currentPlan.endDate) : "—"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={generatingQr}
                  onClick={handleGenerateQr}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>
                    {generatingQr
                      ? "Generating..."
                      : data.qrDataUrl
                      ? "Regenerate My QR Code"
                      : "Generate My QR Code"}
                  </span>
                </button>

                <p className="text-xs leading-relaxed text-[#8A93A2]">
                  Regenerating immediately invalidates any older screenshot or printed card for
                  your protection.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl border border-[#242934] bg-[#111318] p-5 md:p-6 md:col-span-7">
                {!data.qrDataUrl ? (
                  <div className="py-10 text-center">
                    <QrCode className="mx-auto h-10 w-10 text-[#8A93A2]" />
                    <p className="mt-3 text-base font-medium text-[#F5F6F8]">No Active QR Pass</p>
                    <p className="mt-1 text-xs text-[#8A93A2]">
                      Click &ldquo;Generate My QR Code&rdquo; on the left to issue your pass.
                    </p>
                  </div>
                ) : (
                  <div className="w-full max-w-[330px] space-y-3.5">
                    <div className="rounded-2xl bg-white p-5 text-center text-[#090A0D] shadow-xl">
                      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#525866]">
                          IRONHUB PASS
                        </span>
                        <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {data.member.status}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-center gap-2.5">
                        {data.member.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={data.member.photoUrl}
                            alt={data.member.name}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-300"
                          />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-bold leading-tight text-[#090A0D]">
                            {data.member.name}
                          </p>
                          <p className="text-xs text-[#525866]">
                            {data.member.memberCode} · {data.currentPlan?.name ?? "Client"}
                          </p>
                        </div>
                      </div>

                      <div className="my-3 flex justify-center bg-white p-1.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={data.qrDataUrl}
                          alt="Client QR Pass"
                          width={216}
                          height={216}
                          className="h-52 w-52"
                        />
                      </div>

                      <p className="border-t border-neutral-200 pt-2.5 font-mono text-[11px] text-[#525866]">
                        ID ••••-{data.credential?.tokenLast4} ·{" "}
                        {data.credential ? formatDateTime(data.credential.issuedAt) : ""}
                      </p>
                    </div>

                    <div className="flex gap-2.5 print:hidden">
                      <button
                        type="button"
                        onClick={handleDownloadQr}
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
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#A4AAB5] hover:text-white"
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
          )}

          {/* SECTION 3: ATTENDANCE HISTORY WITH PAGINATION */}
          {section === "attendance" && (
            <div className="space-y-4 animate-panel-enter">
              <div>
                <h1 className="text-xl font-semibold text-[#F5F6F8]">My Attendance Log</h1>
                <p className="text-xs text-[#A4AAB5]">
                  {data.stats.visitsThisMonth} visits this month · {data.stats.totalVisits} total
                  approved check-ins
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
                <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#242934] bg-[#171A21] text-[11px] font-medium uppercase tracking-wider text-[#8A93A2]">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Time</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Notes</th>
                      <th className="px-4 py-2.5 text-right">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242934]">
                    {pagedAttendance.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-xs text-[#8A93A2]">
                          No attendance records yet.
                        </td>
                      </tr>
                    ) : (
                      pagedAttendance.map((a) => (
                        <tr key={a.id} className="hover:bg-[#171A21]">
                          <td className="px-4 py-3 font-medium text-[#F5F6F8]">
                            {formatDate(a.checkedInAt)}
                          </td>
                          <td className="px-4 py-3 text-[#A4AAB5] tabular-nums">
                            {formatTime(a.checkedInAt)}
                          </td>
                          <td className="px-4 py-3 text-[#A4AAB5]">{a.method}</td>
                          <td className="px-4 py-3 text-[#8A93A2]">
                            {a.denialReason ?? "Verified at front desk"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={a.outcome} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
                {data.attendance.length > 0 && (
                  <div className="border-t border-[#242934] px-4 py-2.5">
                    <PaginationBar
                      page={attPage}
                      totalPages={totalAttPages}
                      totalItems={data.attendance.length}
                      pageSize={PORTAL_PAGE_SIZE}
                      onPageChange={setAttPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: MEMBERSHIP & RECEIPTS WITH PAGINATION */}
          {section === "membership" && (
            <div className="space-y-4 animate-panel-enter">
              <div>
                <h1 className="text-xl font-semibold text-[#F5F6F8]">
                  Membership Plan &amp; Receipts
                </h1>
                <p className="text-xs text-[#A4AAB5]">
                  Track your current plan validity, benefits, and payment history.
                </p>
              </div>

              {data.currentPlan && (
                <div className="rounded-xl border border-[#E32935]/40 bg-[#111318] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E32935]">
                        Current Plan
                      </span>
                      <h2 className="mt-1 text-lg font-bold text-[#F5F6F8]">
                        {data.currentPlan.name} Plan — {formatCurrency(data.currentPlan.price)}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#A4AAB5]">
                        Valid {formatDate(data.currentPlan.startDate)} →{" "}
                        {formatDate(data.currentPlan.endDate)} ({expiryLabel})
                      </p>
                    </div>
                    <StatusBadge status={data.currentPlan.status} />
                  </div>

                  {data.currentPlan.benefits.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-2 border-t border-[#242934] pt-3">
                      {data.currentPlan.benefits.map((b, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-3 py-1.5 text-xs text-[#F5F6F8]"
                        >
                          <Check className="h-3.5 w-3.5 text-[#2BCB83]" />
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
                <div className="border-b border-[#242934] px-4 py-3">
                  <h2 className="text-sm font-semibold text-[#F5F6F8]">Payment Receipts</h2>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-[#242934] bg-[#171A21] text-[11px] font-medium uppercase tracking-wider text-[#8A93A2]">
                    <tr>
                      <th className="px-4 py-2.5">Receipt</th>
                      <th className="px-4 py-2.5">Plan</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Amount</th>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242934]">
                    {pagedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#8A93A2]">
                          No payment receipts found.
                        </td>
                      </tr>
                    ) : (
                      pagedPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#171A21]">
                          <td className="px-4 py-3 font-mono text-[#F5F6F8]">
                            {p.receiptNumber}
                          </td>
                          <td className="px-4 py-3 text-[#A4AAB5]">{p.planName}</td>
                          <td className="px-4 py-3 text-[#A4AAB5]">{p.method}</td>
                          <td className="px-4 py-3 font-medium text-[#F5F6F8] tabular-nums">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3 text-[#8A93A2] tabular-nums">
                            {formatDateTime(p.paidAt)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <StatusBadge status={p.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
                {data.payments.length > 0 && (
                  <div className="border-t border-[#242934] px-4 py-2.5">
                    <PaginationBar
                      page={payPage}
                      totalPages={totalPayPages}
                      totalItems={data.payments.length}
                      pageSize={PORTAL_PAGE_SIZE}
                      onPageChange={setPayPage}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 5: SETTINGS & PROFILE PICTURE UPLOAD */}
          {section === "settings" && (
            <form
              onSubmit={handleSaveSettings}
              className="grid grid-cols-1 gap-4 animate-panel-enter lg:grid-cols-12"
            >
              {/* Left: Photo Upload Card */}
              <div className="flex flex-col items-center justify-center rounded-xl border border-[#242934] bg-[#111318] p-5 md:p-6 text-center lg:col-span-4">
                <h2 className="text-sm font-semibold text-[#F5F6F8]">Profile Picture</h2>
                <p className="mt-1 text-xs text-[#8A93A2]">
                  Shown on your dashboard, QR pass, and front-desk check-in screen.
                </p>

                <div className="my-5">
                  {profileForm.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileForm.photoUrl}
                      alt={data.member.name}
                      className="h-28 w-28 rounded-full border-2 border-[#E32935] object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-2xl font-bold text-[#F5F6F8]">
                      {initials}
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#242934] bg-[#171A21] px-3.5 text-xs font-medium text-[#F5F6F8] hover:bg-[#20242D]"
                  >
                    <Camera className="h-3.5 w-3.5 text-[#E32935]" />
                    <span>Upload Photo</span>
                  </button>
                  {profileForm.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((prev) => ({ ...prev, photoUrl: null }))}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 px-3 text-xs text-[#F05252] hover:bg-[#F05252]/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Contact, Emergency & Password */}
              <div className="space-y-4 rounded-xl border border-[#242934] bg-[#111318] p-5 md:p-6 lg:col-span-8">
                <div>
                  <h2 className="text-sm font-semibold text-[#F5F6F8]">
                    Personal Details &amp; Security
                  </h2>
                  <p className="text-xs text-[#8A93A2]">
                    Update your contact details, emergency contact, or portal password.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs text-[#A4AAB5]">Phone Number</label>
                    <input
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+63 917 000 0000"
                      className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-[#A4AAB5]">Address</label>
                    <input
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      placeholder="City / Street address"
                      className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                      Emergency Contact Name
                    </label>
                    <input
                      value={profileForm.emergencyContactName}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, emergencyContactName: e.target.value })
                      }
                      className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                      Emergency Contact Phone
                    </label>
                    <input
                      value={profileForm.emergencyContactPhone}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })
                      }
                      className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 border-t border-[#242934] pt-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                      Current Password (only if changing)
                    </label>
                    <input
                      type="password"
                      value={profileForm.currentPassword}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, currentPassword: e.target.value })
                      }
                      placeholder="Current password"
                      className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                      New Password (optional)
                    </label>
                    <input
                      type="password"
                      minLength={8}
                      value={profileForm.newPassword}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, newPassword: e.target.value })
                      }
                      placeholder="Min 8 characters"
                      className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-[#242934] pt-4">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{savingProfile ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
