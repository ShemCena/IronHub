"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  X,
  Users,
  UserCheck,
  AlertTriangle,
  XCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useFeedback } from "@/components/ui/feedback-modal";
import { getPlanTierColor } from "@/components/charts/plan-distribution-donut";
import { formatCurrency, formatDate } from "@/lib/formatting/currency";
import { getCached, setCached, invalidateCache } from "@/lib/cache/client-cache";
import { cn } from "@/lib/utils";

interface MemberRow {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: "ACTIVE" | "EXPIRED" | "SUSPENDED" | "ARCHIVED";
  joinedAt: string;
  photoUrl: string | null;
  currentPlan: string | null;
  expiryDate: string | null;
  trainerId: string | null;
  trainerName: string | null;
  trainerFee: number;
  hasActiveQr: boolean;
  qrLast4: string | null;
}

interface TrainerOption {
  id: string;
  name: string;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  enrollmentFee: number;
  isActive: boolean;
}

const STATUS_TABS = ["ALL", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;
const PAGE_SIZE = 6;

export default function MembersPage() {
  const { showSuccess, showError, confirmAction } = useFeedback();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, expired: 0, suspended: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MemberRow | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [trainers, setTrainers] = useState<TrainerOption[]>([]);
  const [role, setRole] = useState<string>("ADMIN");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    trainerId: "",
    trainerFee: 500,
    planId: "",
    paymentMethod: "CASH" as "CASH" | "CARD" | "EWALLET" | "BANK_TRANSFER" | "OTHER",
    paymentReference: "",
    status: "ACTIVE" as "ACTIVE" | "EXPIRED" | "SUSPENDED" | "ARCHIVED",
  });

  const loadMembers = useCallback(async (force = false) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      status: statusFilter,
      planId: planFilter,
      scope,
    });
    if (search.trim()) params.set("q", search.trim());
    const cacheKey = `members:${params.toString()}`;
    const cached = force ? null : getCached<{
      members: MemberRow[];
      trainers: TrainerOption[];
      role?: string;
      summary: { total: number; active: number; expired: number; suspended: number };
      pagination?: { totalPages: number; total: number };
    }>(cacheKey, 45_000);

    if (cached) {
      setMembers(cached.members ?? []);
      setTrainers(cached.trainers ?? []);
      if (cached.role) setRole(cached.role);
      setSummary(cached.summary ?? { total: 0, active: 0, expired: 0, suspended: 0 });
      setTotalPages(cached.pagination?.totalPages ?? 1);
      setTotalFiltered(cached.pagination?.total ?? 0);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/members?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCached(cacheKey, data);
        setMembers(data.members ?? []);
        setTrainers(data.trainers ?? []);
        if (data.role) setRole(data.role);
        setSummary(data.summary ?? { total: 0, active: 0, expired: 0, suspended: 0 });
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotalFiltered(data.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter, search, scope]);

  useEffect(() => {
    if (!search.trim()) {
      loadMembers();
      return;
    }
    const timer = setTimeout(() => {
      loadMembers();
    }, 180);
    return () => clearTimeout(timer);
  }, [loadMembers, search]);

  useEffect(() => {
    const cachedPlans = getCached<PlanOption[]>("plans:active", 120_000);
    if (cachedPlans) {
      setPlans(cachedPlans);
      return;
    }
    fetch("/api/plans")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.plans) {
          const active = data.plans.filter((p: PlanOption) => p.isActive);
          setCached("plans:active", active);
          setPlans(active);
        }
      })
      .catch(() => {});
  }, []);

  function openAddModal() {
    setEditTarget(null);
    setFormError(null);
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      trainerId: trainers[0]?.id ?? "",
      trainerFee: 500,
      planId: "",
      paymentMethod: "CASH",
      paymentReference: "",
      status: "ACTIVE",
    });
    setModalOpen(true);
  }

  function openEditModal(m: MemberRow) {
    setEditTarget(m);
    setFormError(null);
    setForm({
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email ?? "",
      password: "",
      phone: m.phone ?? "",
      address: "",
      trainerId: m.trainerId ?? "",
      trainerFee: m.trainerFee ?? 0,
      planId: "",
      paymentMethod: "CASH",
      paymentReference: "",
      status: m.status,
    });
    setModalOpen(true);
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const url = editTarget ? `/api/members/${editTarget.id}` : "/api/members";
      const method = editTarget ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to save member.";
        setFormError(msg);
        showError("Unable to Save", msg);
        return;
      }
      const wasEdit = Boolean(editTarget);
      const savedName = `${form.firstName} ${form.lastName}`.trim();
      setModalOpen(false);
      setEditTarget(null);
      loadMembers();
      showSuccess(
        wasEdit ? "Client Updated" : "Client Registered",
        wasEdit
          ? `${savedName}'s profile has been updated.`
          : `${savedName} (${data.member?.memberCode ?? ""}) is registered. They can now sign in with their email & initial password, and change it anytime in Settings.`
      );
    } catch {
      setFormError("Network error while saving member.");
      showError("Network Error", "Could not connect to the server while saving.");
    } finally {
      setSaving(false);
    }
  }

  function handleArchiveMember(m: MemberRow) {
    confirmAction({
      title: "Archive Member",
      message: `Are you sure you want to archive ${m.firstName} ${m.lastName} (${m.memberCode})? They will no longer be able to check in.`,
      confirmLabel: "Archive",
      onConfirm: async () => {
        const res = await fetch(`/api/members/${m.id}`, { method: "DELETE" });
        if (res.ok) {
          loadMembers();
          showSuccess("Member Archived", `${m.firstName} ${m.lastName} has been archived.`);
        } else {
          const data = await res.json().catch(() => ({}));
          showError("Archive Failed", data.error ?? "Could not archive member.");
        }
      },
    });
  }

  return (
    <div className="space-y-4 animate-panel-enter">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">
            {role === "TRAINER" ? "Clients" : "Members"}
          </h1>
          <p className="text-xs text-[#A4AAB5]">
            {role === "TRAINER"
              ? "View your coached clients and gym client directory."
              : "Manage gym clients, coach assignments, and memberships."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {role === "TRAINER" && (
            <div className="flex items-center gap-1 rounded-lg border border-[#242934] bg-[#111318] p-1">
              <button
                type="button"
                onClick={() => {
                  setScope("mine");
                  setPage(1);
                }}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  scope === "mine" ? "bg-[#E32935] text-white" : "text-[#A4AAB5] hover:text-white"
                )}
              >
                My Coached
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope("all");
                  setPage(1);
                }}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  scope === "all" ? "bg-[#E32935] text-white" : "text-[#A4AAB5] hover:text-white"
                )}
              >
                All Clients
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#F13A46]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>{role === "TRAINER" ? "Add Client" : "Add Member"}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards in 1 Horizontal Row (md:grid-cols-4) */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-4">
        <KpiCard
          label="Total Members"
          value={summary.total}
          deltaPercent={5}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Active Members"
          value={summary.active}
          deltaPercent={4}
          icon={UserCheck}
          tone="green"
        />
        <KpiCard
          label="Expired Memberships"
          value={summary.expired}
          deltaPercent={2}
          icon={XCircle}
          tone="purple"
        />
        <KpiCard
          label="Suspended"
          value={summary.suspended}
          deltaPercent={0}
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#242934] bg-[#111318] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === tab
                  ? "bg-[#E32935] text-white"
                  : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
              )}
            >
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by membership plan"
            className="h-9 rounded-lg border border-[#242934] bg-[#111318] px-3 text-xs text-[#F5F6F8]"
          >
            <option value="ALL">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A93A2]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, code, email..."
              className="h-9 w-full rounded-lg border border-[#242934] bg-[#111318] pl-8.5 pr-3 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Table + Numbered Pagination */}
      <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-[#242934] bg-[#171A21] text-[11px] font-medium uppercase tracking-wider text-[#8A93A2]">
              <tr>
                <th className="px-4 py-2.5">Member</th>
                <th className="px-4 py-2.5">ID</th>
                <th className="px-4 py-2.5">Plan Type</th>
                <th className="px-4 py-2.5">Trainor &amp; Fee</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Expiry</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242934]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#8A93A2]">
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#8A93A2]">
                    No members match your current filters.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const initials = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-[#171A21]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {m.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.photoUrl}
                              alt={`${m.firstName} ${m.lastName}`}
                              className="h-8 w-8 shrink-0 rounded-full border border-[#292E38] object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-xs font-semibold text-[#F5F6F8]">
                              {initials}
                            </div>
                          )}
                          <div>
                            <Link
                              href={`/members/${m.id}`}
                              className="font-medium text-[#F5F6F8] hover:text-[#E32935]"
                            >
                              {m.firstName} {m.lastName}
                            </Link>
                            <p className="text-xs text-[#8A93A2]">
                              {m.email ?? m.phone ?? "No contact"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#A4AAB5]">
                        {m.memberCode}
                      </td>
                      <td className="px-4 py-3">
                        {m.currentPlan ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 font-medium text-[#F5F6F8]">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: getPlanTierColor(m.currentPlan) }}
                                aria-hidden="true"
                              />
                              {m.currentPlan}
                            </span>
                            <p className="text-[11px] text-[#8A93A2]">
                              {m.currentPlan.toLowerCase().includes("daily")
                                ? "Daily Pass"
                                : "Membership"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#F2B84B]">No Plan</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m.trainerName ? (
                          <div>
                            <p className="text-[#F5F6F8]">{m.trainerName}</p>
                            <p className="font-mono text-[11px] text-[#2BCB83]">
                              Fee: {formatCurrency(m.trainerFee ?? 0)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-[#8A93A2]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[#A4AAB5] tabular-nums">
                        {m.expiryDate ? formatDate(m.expiryDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/members/${m.id}`}
                            className="inline-flex h-7 items-center rounded-md border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] hover:bg-[#20242D]"
                          >
                            View
                          </Link>
                          {role !== "TRAINER" && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(m)}
                                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#242934] bg-[#171A21] px-2 text-xs text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                                title="Edit member"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveMember(m)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#242934] bg-[#171A21] text-[#8A93A2] hover:border-[#F05252]/40 hover:text-[#F05252]"
                                title="Archive member"
                                aria-label="Archive member"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={totalFiltered}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="members"
        />
      </div>

      {/* Add / Edit Member Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#242934] bg-[#111318] p-5 animate-panel-enter">
            <div className="mb-3.5 flex items-center justify-between border-b border-[#242934] pb-2.5">
              <h2 className="text-sm font-semibold text-[#F5F6F8]">
                {editTarget ? `Edit Member (${editTarget.memberCode})` : "Register New Member"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-[#8A93A2] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-3 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-2.5 text-xs text-[#F05252]">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">First Name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Last Name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Email (Unique) *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="client@email.com"
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  />
                </div>
              </div>

              {!editTarget ? (
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">
                    Initial Portal Password * (client can change later)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  />
                </div>
              ) : (
                role !== "TRAINER" && (
                  <div>
                    <label className="mb-1 block text-xs text-[#A4AAB5]">
                      Reset Portal Password (Optional)
                    </label>
                    <input
                      type="password"
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                    />
                  </div>
                )
              )}

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {role !== "TRAINER" && (
                  <div>
                    <label className="mb-1 block text-xs text-[#A4AAB5]">
                      Assigned Trainor / Coach
                    </label>
                    <select
                      value={form.trainerId}
                      onChange={(e) => setForm({ ...form, trainerId: e.target.value })}
                      className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                    >
                      <option value="">No assigned trainor</option>
                      {trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className={role === "TRAINER" ? "sm:col-span-2" : ""}>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Trainor Fee (PHP)</label>
                  <input
                    type="number"
                    min={0}
                    step="50"
                    value={form.trainerFee}
                    onChange={(e) => setForm({ ...form, trainerFee: Number(e.target.value) })}
                    placeholder="500"
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] tabular-nums"
                  />
                </div>
              </div>

              {editTarget ? (
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as typeof form.status })
                    }
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs text-[#A4AAB5]">
                      Initial Membership Plan (Optional)
                    </label>
                    <select
                      value={form.planId}
                      onChange={(e) => setForm({ ...form, planId: e.target.value })}
                      className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                    >
                      <option value="">Register without plan</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {formatCurrency(p.price + p.enrollmentFee)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.planId && (
                    <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-[#242934] bg-[#171A21] p-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] text-[#A4AAB5]">OTC Method</label>
                        <select
                          value={form.paymentMethod}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              paymentMethod: e.target.value as typeof form.paymentMethod,
                            })
                          }
                          className="h-8 w-full rounded border border-[#242934] bg-[#111318] px-2 text-xs text-[#F5F6F8]"
                        >
                          <option value="CASH">Cash</option>
                          <option value="CARD">Card Terminal</option>
                          <option value="EWALLET">E-Wallet</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-[#A4AAB5]">Reference #</label>
                        <input
                          value={form.paymentReference}
                          onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                          placeholder="OR / Ref #"
                          className="h-8 w-full rounded border border-[#242934] bg-[#111318] px-2 text-xs text-[#F5F6F8]"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-8 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#A4AAB5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46]"
                >
                  {saving ? "Saving..." : editTarget ? "Update Member" : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
