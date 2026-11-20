"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  UserCheck,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { getPlanTierColor } from "@/components/charts/plan-distribution-donut";
import { formatCurrency, formatDate } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

interface MemberRow {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: string;
  joinedAt: string;
  photoUrl: string | null;
  currentPlan: string | null;
  expiryDate: string | null;
  hasActiveQr: boolean;
  qrLast4: string | null;
}

interface PlanOption {
  id: string;
  name: string;
  price: number;
  enrollmentFee: number;
  isActive: boolean;
}

const STATUS_TABS = ["ALL", "ACTIVE", "EXPIRED", "SUSPENDED"] as const;

export default function MembersPage() {
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
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    planId: "",
    paymentMethod: "CASH" as "CASH" | "CARD" | "EWALLET" | "BANK_TRANSFER" | "OTHER",
    paymentReference: "",
  });

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        status: statusFilter,
        planId: planFilter,
      });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/members?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members ?? []);
        setSummary(data.summary ?? { total: 0, active: 0, expired: 0, suspended: 0 });
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotalFiltered(data.pagination?.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
    }, 150);
    return () => clearTimeout(timer);
  }, [loadMembers]);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.plans) {
          setPlans(data.plans.filter((p: PlanOption) => p.isActive));
        }
      })
      .catch(() => { });
  }, []);

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to create member.");
        return;
      }
      setModalOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        planId: "",
        paymentMethod: "CASH",
        paymentReference: "",
      });
      loadMembers();
    } catch {
      setFormError("Network error while creating member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 animate-panel-enter">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F6F8]">Members</h1>
          <p className="mt-0.5 text-xs text-[#A4AAB5]">
            Manage gym member profiles and plan validity. Clients generate their own QR pass in the Member Portal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#F13A46]"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Compressed KPI Strip */}
      <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
        <KpiCard
          label="Total Members"
          value={summary.total}
          helper="Registered profiles"
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Active Members"
          value={summary.active}
          helper="Valid memberships"
          icon={UserCheck}
          tone="green"
        />
        <KpiCard
          label="Expired"
          value={summary.expired}
          helper="Needs renewal"
          icon={XCircle}
          tone="purple"
        />
        <KpiCard
          label="Suspended"
          value={summary.suspended}
          helper="Access paused"
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
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilter === tab
                  ? "bg-[#E32935] text-white"
                  : "text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
              )}
            >
              {tab === "ALL" ? "All" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by membership plan"
            className="h-9 rounded-lg border border-[#242934] bg-[#111318] px-2.5 text-xs text-[#F5F6F8]"
          >
            <option value="ALL">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A93A2]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, code, email..."
              className="h-9 w-full rounded-lg border border-[#242934] bg-[#111318] pl-8 pr-3 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Compressed Table */}
      <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#242934] bg-[#171A21] text-[11px] font-medium uppercase tracking-wider text-[#8A93A2]">
              <tr>
                <th className="px-3.5 py-2.5">Member</th>
                <th className="px-3.5 py-2.5">ID</th>
                <th className="px-3.5 py-2.5">Membership Plan</th>
                <th className="px-3.5 py-2.5">Status</th>
                <th className="px-3.5 py-2.5">Client QR</th>
                <th className="px-3.5 py-2.5">Expiry Date</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242934]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-8 text-center text-xs text-[#8A93A2]">
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-8 text-center text-xs text-[#8A93A2]">
                    No members match your current filters.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const initials = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-[#171A21]">
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-2.5">
                          {m.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.photoUrl}
                              alt={`${m.firstName} ${m.lastName}`}
                              className="h-8 w-8 shrink-0 rounded-full border border-[#292E38] object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-[11px] font-semibold text-[#F5F6F8]">
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
                            <p className="text-[11px] text-[#8A93A2]">
                              {m.email ?? m.phone ?? "No contact"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2 font-mono text-[11px] text-[#A4AAB5]">
                        {m.memberCode}
                      </td>
                      <td className="px-3.5 py-2">
                        {m.currentPlan ? (
                          <span className="inline-flex items-center gap-1.5 text-[#F5F6F8]">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: getPlanTierColor(m.currentPlan) }}
                              aria-hidden="true"
                            />
                            {m.currentPlan}
                          </span>
                        ) : (
                          <span className="text-[#8A93A2]">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-3.5 py-2 font-mono text-[11px] text-[#A4AAB5]">
                        {m.hasActiveQr ? `••••-${m.qrLast4 ?? "PASS"}` : "Not generated"}
                      </td>
                      <td className="px-3.5 py-2 text-[11px] text-[#A4AAB5] tabular-nums">
                        {m.expiryDate ? formatDate(m.expiryDate) : "—"}
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <Link
                          href={`/members/${m.id}`}
                          className="inline-flex h-7 items-center rounded-md border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] hover:bg-[#20242D]"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#242934] px-3.5 py-2.5 text-xs text-[#A4AAB5]">
          <span className="tabular-nums">
            Showing {members.length} of {totalFiltered} members · Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-[#242934] bg-[#171A21] px-2 py-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-[#242934] bg-[#171A21] px-2 py-1 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Member Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#242934] bg-[#111318] p-5 animate-panel-enter">
            <div className="mb-4 flex items-center justify-between border-b border-[#242934] pb-2.5">
              <h2 className="text-base font-semibold text-[#F5F6F8]">Register New Member</h2>
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

            <form onSubmit={handleCreateMember} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">First Name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Last Name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[#A4AAB5]">
                  Initial Membership Plan (Optional)
                </label>
                <select
                  value={form.planId}
                  onChange={(e) => setForm({ ...form, planId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 rounded-lg border border-[#242934] bg-[#171A21] px-3.5 text-xs text-[#A4AAB5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-9 rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46]"
                >
                  {saving ? "Saving..." : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
