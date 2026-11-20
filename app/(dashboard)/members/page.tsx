"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  UserPlus,
  QrCode,
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
  currentPlan: string | null;
  expiryDate: string | null;
  hasActiveQr: boolean;
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
      .catch(() => {});
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
    <div className="space-y-6 animate-panel-enter">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#F5F6F8]">
            Members
          </h1>
          <p className="mt-1 text-sm text-[#A4AAB5]">
            Manage gym member profiles, plan validity, and QR access credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#F13A46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
          tone="red"
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#292E38] bg-[#111318] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusFilter(tab);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]",
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
            className="h-10 rounded-lg border border-[#292E38] bg-[#111318] px-3 text-xs text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]/40"
          >
            <option value="ALL">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A2]" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, code, email..."
              className="h-10 w-full rounded-lg border border-[#292E38] bg-[#111318] pl-9 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E32935]/40"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#292E38] bg-[#111318]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#292E38] bg-[#171A21] text-xs font-medium uppercase tracking-wider text-[#8A93A2]">
              <tr>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Membership Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292E38]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-[#8A93A2]">
                    Loading members...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-[#8A93A2]">
                    No members match your current filters.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const initials = `${m.firstName[0] ?? ""}${m.lastName[0] ?? ""}`.toUpperCase();
                  return (
                    <tr key={m.id} className="transition-colors hover:bg-[#171A21]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-xs font-semibold text-[#F5F6F8]">
                            {initials}
                          </div>
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
                      <td className="px-4 py-2.5 font-mono text-xs text-[#A4AAB5]">
                        {m.memberCode}
                      </td>
                      <td className="px-4 py-2.5">
                        {m.currentPlan ? (
                          <span className="inline-flex items-center gap-2 text-[#F5F6F8]">
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
                      <td className="px-4 py-2.5">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#A4AAB5] tabular-nums">
                        {m.expiryDate ? formatDate(m.expiryDate) : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/qr-generator?memberId=${m.id}`}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-[#292E38] bg-[#171A21] px-2.5 text-xs text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                            title="Manage QR Credential"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>QR</span>
                          </Link>
                          <Link
                            href={`/members/${m.id}`}
                            className="inline-flex h-8 items-center rounded-md border border-[#292E38] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] hover:bg-[#20242D]"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#292E38] px-4 py-3 text-xs text-[#A4AAB5]">
          <span className="tabular-nums">
            Showing {members.length} of {totalFiltered} members · Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-[#292E38] bg-[#171A21] px-2.5 py-1 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-[#292E38] bg-[#171A21] px-2.5 py-1 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
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
          aria-labelledby="add-member-title"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#292E38] bg-[#111318] p-6 animate-panel-enter">
            <div className="mb-5 flex items-center justify-between border-b border-[#292E38] pb-3">
              <h2 id="add-member-title" className="text-lg font-semibold text-[#F5F6F8]">
                Register New Member
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-[#8A93A2] hover:text-white"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-3 text-xs text-[#F05252]">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">First Name *</label>
                  <input
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Last Name *</label>
                  <input
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
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
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
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
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#292E38] bg-[#171A21] p-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-[#A4AAB5]">
                      Over-the-Counter Method
                    </label>
                    <select
                      value={form.paymentMethod}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          paymentMethod: e.target.value as typeof form.paymentMethod,
                        })
                      }
                      className="h-10 w-full rounded-lg border border-[#292E38] bg-[#111318] px-3 text-sm text-[#F5F6F8]"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card Terminal</option>
                      <option value="EWALLET">E-Wallet (GCash / Maya)</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[#A4AAB5]">
                      Reference # (Optional)
                    </label>
                    <input
                      value={form.paymentReference}
                      onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                      placeholder="OR / Ref number"
                      className="h-10 w-full rounded-lg border border-[#292E38] bg-[#111318] px-3 text-sm text-[#F5F6F8]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 rounded-lg border border-[#292E38] bg-[#171A21] px-4 text-sm font-medium text-[#A4AAB5] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46] disabled:opacity-60"
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
