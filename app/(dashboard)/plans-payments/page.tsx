"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Check, X, CreditCard, RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

interface PlanItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  enrollmentFee: number;
  durationValue: number;
  durationUnit: string;
  benefits: string[];
  isPopular: boolean;
  isActive: boolean;
  activeSubscribers: number;
}

interface PaymentRow {
  id: string;
  receiptNumber: string;
  memberId: string;
  memberCode: string;
  memberName: string;
  planName: string;
  amount: number;
  method: string;
  status: string;
  referenceNumber: string | null;
  recordedBy: string;
  paidAt: string;
}

interface MemberOption {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
}

export default function PlansAndPaymentsPage() {
  const [tab, setTab] = useState<"plans" | "payments">("plans");
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [totals, setTotals] = useState({ collected: 0, pending: 0, refunded: 0 });
  const [members, setMembers] = useState<MemberOption[]>([]);

  const [paymentModal, setPaymentModal] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [payForm, setPayForm] = useState({
    memberId: "",
    planId: "",
    amount: 0,
    method: "CASH" as "CASH" | "CARD" | "EWALLET" | "BANK_TRANSFER" | "OTHER",
    referenceNumber: "",
    notes: "",
    isRenewal: true,
  });

  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: 799,
    durationValue: 1,
    durationUnit: "MONTHS" as "DAYS" | "WEEKS" | "MONTHS",
    benefitsText: "Gym Access, Locker Access",
  });

  const loadAll = useCallback(async () => {
    const [plansRes, payRes, memRes] = await Promise.all([
      fetch("/api/plans"),
      fetch("/api/payments"),
      fetch("/api/members?pageSize=50"),
    ]);
    if (plansRes.ok) {
      const p = await plansRes.json();
      setPlans(p.plans ?? []);
    }
    if (payRes.ok) {
      const pay = await payRes.json();
      setPayments(pay.payments ?? []);
      setTotals(pay.totals ?? { collected: 0, pending: 0, refunded: 0 });
    }
    if (memRes.ok) {
      const m = await memRes.json();
      setMembers(m.members ?? []);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to record payment.");
        return;
      }
      setPaymentModal(false);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: planForm.name,
          description: planForm.description,
          price: planForm.price,
          durationValue: planForm.durationValue,
          durationUnit: planForm.durationUnit,
          benefits: planForm.benefitsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create plan.");
        return;
      }
      setPlanModal(false);
      loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function handleRefundOrVoid(paymentId: string, action: "REFUND" | "VOID") {
    const reason = window.prompt(`Enter reason to ${action.toLowerCase()} this payment:`);
    if (!reason || reason.trim().length < 4) return;
    const res = await fetch(`/api/payments/${paymentId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    if (res.ok) {
      loadAll();
    }
  }

  return (
    <div className="space-y-6 animate-panel-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-[#F5F6F8]"
            style={{ fontFamily: "var(--font-barlow), sans-serif" }}
          >
            PLANS & PAYMENTS
          </h1>
          <p className="mt-1 text-sm text-[#A4AAB5]">
            Configure membership tiers and record over-the-counter payments with full audit history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const firstActive = plans.find((p) => p.isActive);
              setPayForm((prev) => ({
                ...prev,
                memberId: members[0]?.id ?? "",
                planId: firstActive?.id ?? "",
                amount: firstActive?.price ?? 0,
              }));
              setPaymentModal(true);
            }}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46]"
          >
            <CreditCard className="h-4 w-4" />
            <span>Record Payment</span>
          </button>
          <button
            type="button"
            onClick={() => setPlanModal(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#292E38] bg-[#111318] px-4 text-sm font-medium text-[#F5F6F8] hover:bg-[#20242D]"
          >
            <Plus className="h-4 w-4" />
            <span>Add Plan</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#292E38]">
        <button
          type="button"
          onClick={() => setTab("plans")}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "plans"
              ? "border-[#E32935] text-[#F5F6F8]"
              : "border-transparent text-[#747C89] hover:text-[#A4AAB5]"
          )}
        >
          Membership Plans
        </button>
        <button
          type="button"
          onClick={() => setTab("payments")}
          className={cn(
            "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "payments"
              ? "border-[#E32935] text-[#F5F6F8]"
              : "border-transparent text-[#747C89] hover:text-[#A4AAB5]"
          )}
        >
          Payment History
        </button>
      </div>

      {tab === "plans" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex flex-col justify-between rounded-xl border bg-[#111318] p-6",
                p.isPopular ? "border-[#E32935]/60" : "border-[#292E38]"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#F5F6F8]">{p.name}</h2>
                  {p.isPopular && (
                    <span className="rounded-md bg-[#E32935]/15 px-2 py-0.5 text-[11px] font-semibold text-[#E32935]">
                      Most Popular
                    </span>
                  )}
                </div>
                <p className="mt-3 text-3xl font-bold text-[#F5F6F8] tabular-nums">
                  {formatCurrency(p.price)}
                  <span className="text-xs font-normal text-[#747C89]">
                    {" "}
                    / {p.durationValue} {p.durationUnit.toLowerCase()}
                  </span>
                </p>
                {p.description && (
                  <p className="mt-2 text-xs text-[#A4AAB5]">{p.description}</p>
                )}

                <ul className="mt-4 space-y-2 border-t border-[#292E38] pt-4 text-xs text-[#A4AAB5]">
                  {p.benefits.map((b, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#2BCB83]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-[#292E38] pt-4 text-xs text-[#747C89]">
                <span>{p.activeSubscribers} active subscribers</span>
                <span>{p.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#292E38] bg-[#111318] p-4">
              <span className="text-xs text-[#A4AAB5]">Total Collected</span>
              <p className="mt-1 text-2xl font-bold text-[#2BCB83] tabular-nums">
                {formatCurrency(totals.collected)}
              </p>
            </div>
            <div className="rounded-xl border border-[#292E38] bg-[#111318] p-4">
              <span className="text-xs text-[#A4AAB5]">Pending</span>
              <p className="mt-1 text-2xl font-bold text-[#F2B84B] tabular-nums">
                {formatCurrency(totals.pending)}
              </p>
            </div>
            <div className="rounded-xl border border-[#292E38] bg-[#111318] p-4">
              <span className="text-xs text-[#A4AAB5]">Refunded</span>
              <p className="mt-1 text-2xl font-bold text-[#4B91F1] tabular-nums">
                {formatCurrency(totals.refunded)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#292E38] bg-[#111318]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#292E38] bg-[#171A21] text-xs font-medium uppercase tracking-wider text-[#747C89]">
                  <tr>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#292E38]">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#171A21]">
                      <td className="px-4 py-3 font-mono text-xs text-[#F5F6F8]">
                        {p.receiptNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#F5F6F8]">{p.memberName}</p>
                        <p className="text-xs text-[#747C89]">{p.memberCode}</p>
                      </td>
                      <td className="px-4 py-3 text-[#A4AAB5]">{p.planName}</td>
                      <td className="px-4 py-3 text-xs text-[#A4AAB5]">{p.method}</td>
                      <td className="px-4 py-3 font-medium text-[#F5F6F8] tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-[#747C89] tabular-nums">
                        {formatDateTime(p.paidAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === "PAID" && (
                          <button
                            type="button"
                            onClick={() => handleRefundOrVoid(p.id, "REFUND")}
                            className="inline-flex items-center gap-1 rounded-md border border-[#292E38] bg-[#171A21] px-2.5 py-1 text-xs text-[#A4AAB5] hover:text-white"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Record Over-the-Counter Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#292E38] bg-[#111318] p-6 animate-panel-enter">
            <div className="mb-4 flex items-center justify-between border-b border-[#292E38] pb-3">
              <h2 className="text-lg font-semibold text-[#F5F6F8]">
                Record Over-the-Counter Payment
              </h2>
              <button type="button" onClick={() => setPaymentModal(false)} aria-label="Close">
                <X className="h-5 w-5 text-[#747C89]" />
              </button>
            </div>
            {error && (
              <p className="mb-3 rounded-lg bg-[#F05252]/10 p-2.5 text-xs text-[#F05252]">
                {error}
              </p>
            )}
            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs text-[#A4AAB5]">Member</label>
                <select
                  required
                  value={payForm.memberId}
                  onChange={(e) => setPayForm({ ...payForm, memberId: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName} ({m.memberCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A4AAB5]">Membership Plan</label>
                <select
                  required
                  value={payForm.planId}
                  onChange={(e) => {
                    const selected = plans.find((p) => p.id === e.target.value);
                    setPayForm({
                      ...payForm,
                      planId: e.target.value,
                      amount: selected ? selected.price : payForm.amount,
                    });
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                >
                  {plans
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.price)}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Amount (PHP)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] tabular-nums"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Method</label>
                  <select
                    value={payForm.method}
                    onChange={(e) =>
                      setPayForm({ ...payForm, method: e.target.value as typeof payForm.method })
                    }
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card Terminal</option>
                    <option value="EWALLET">E-Wallet</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A4AAB5]">Reference # (Optional)</label>
                <input
                  value={payForm.referenceNumber}
                  onChange={(e) => setPayForm({ ...payForm, referenceNumber: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModal(false)}
                  className="h-10 rounded-lg border border-[#292E38] bg-[#171A21] px-4 text-sm text-[#A4AAB5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46]"
                >
                  {saving ? "Posting..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Plan Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#292E38] bg-[#111318] p-6 animate-panel-enter">
            <div className="mb-4 flex items-center justify-between border-b border-[#292E38] pb-3">
              <h2 className="text-lg font-semibold text-[#F5F6F8]">Create Membership Plan</h2>
              <button type="button" onClick={() => setPlanModal(false)} aria-label="Close">
                <X className="h-5 w-5 text-[#747C89]" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs text-[#A4AAB5]">Plan Name</label>
                <input
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Price (PHP)</label>
                  <input
                    type="number"
                    required
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Duration</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planForm.durationValue}
                    onChange={(e) =>
                      setPlanForm({ ...planForm, durationValue: Number(e.target.value) })
                    }
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A4AAB5]">Unit</label>
                  <select
                    value={planForm.durationUnit}
                    onChange={(e) =>
                      setPlanForm({
                        ...planForm,
                        durationUnit: e.target.value as typeof planForm.durationUnit,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                  >
                    <option value="DAYS">Days</option>
                    <option value="WEEKS">Weeks</option>
                    <option value="MONTHS">Months</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#A4AAB5]">
                  Benefits (comma separated)
                </label>
                <input
                  value={planForm.benefitsText}
                  onChange={(e) => setPlanForm({ ...planForm, benefitsText: e.target.value })}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPlanModal(false)}
                  className="h-10 rounded-lg border border-[#292E38] bg-[#171A21] px-4 text-sm text-[#A4AAB5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46]"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
