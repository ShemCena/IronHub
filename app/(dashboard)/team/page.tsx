"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Wallet,
  Trophy,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useFeedback } from "@/components/ui/feedback-modal";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "FRONT_DESK" | "TRAINER";
  isActive: boolean;
  lastLoginAt: string | null;
}

const PAGE_SIZE = 6;

function formatRoleLabel(role: string): string {
  return role === "TRAINER" ? "Trainor" : "Admin";
}

export default function TeamPage() {
  const { showSuccess, showError, confirmAction } = useFeedback();
  const [staff, setStaff] = useState<TeamUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [assignableRoles, setAssignableRoles] = useState<("ADMIN" | "TRAINER")[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "TRAINER" as "ADMIN" | "TRAINER",
  });

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff ?? []);
        setCurrentUserId(data.currentUser?.id ?? "");
        setAssignableRoles(data.permissions?.assignableRoles ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2600);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to create account.";
        setFormError(msg);
        showError("Account Creation Failed", msg);
        return;
      }
      setModalOpen(false);
      setForm({ name: "", email: "", password: "", role: "TRAINER" });
      showSuccess("Account Created", `${data.staff.name} has been added to your team.`);
      loadTeam();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(u: TeamUser) {
    const res = await fetch(`/api/staff/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) {
      showSuccess(
        u.isActive ? "Account Deactivated" : "Account Activated",
        `${u.name} has been ${u.isActive ? "deactivated" : "activated"}.`
      );
      loadTeam();
    } else {
      const data = await res.json().catch(() => ({}));
      showError("Update Failed", data.error ?? "Could not update account status.");
    }
  }

  function handleDelete(u: TeamUser) {
    confirmAction({
      title: "Delete Account",
      message: `Are you sure you want to permanently remove ${u.name} (${u.email})?`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        const res = await fetch(`/api/staff/${u.id}`, { method: "DELETE" });
        if (res.ok) {
          showSuccess("Account Removed", `${u.name} has been removed.`);
          loadTeam();
        } else {
          const data = await res.json().catch(() => ({}));
          showError("Delete Failed", data.error ?? "Could not delete account.");
        }
      },
    });
  }

  const activeCount = staff.filter((s) => s.isActive).length;
  const trainerCount = staff.filter((s) => s.role === "TRAINER" && s.isActive).length;
  const totalPages = Math.max(1, Math.ceil(staff.length / PAGE_SIZE));
  const paged = staff.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4 animate-panel-enter">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">
            Admins &amp; Trainors
          </h1>
          <p className="text-xs text-[#A4AAB5]">
            Manage gym administrators and coaching trainor accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notice && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-3 py-1.5 text-xs font-medium text-[#2BCB83]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {notice}
            </span>
          )}
          {assignableRoles.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setForm({ name: "", email: "", password: "", role: "TRAINER" });
                setModalOpen(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Account</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        <KpiCard
          label="Monthly Team Payroll"
          value="₱94,500"
          deltaPercent={4}
          icon={Wallet}
          tone="purple"
        />
        <KpiCard
          label="Active Accounts"
          value={loading ? "—" : activeCount}
          deltaPercent={10}
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Active Trainors"
          value={loading ? "—" : trainerCount}
          deltaPercent={15}
          icon={Trophy}
          tone="green"
        />
      </div>

      {/* Team Table with Pagination */}
      <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
        <div className="divide-y divide-[#242934]">
          {loading ? (
            <p className="py-10 text-center text-xs text-[#8A93A2]">Loading accounts...</p>
          ) : paged.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#8A93A2]">No accounts found.</p>
          ) : (
            paged.map((u) => {
              const canEdit = u.id !== currentUserId;
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 text-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-xs font-semibold text-[#F5F6F8]">
                      {u.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-[#F5F6F8]">{u.name}</p>
                      <p className="text-xs text-[#8A93A2]">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-md border border-[#292E38] bg-[#171A21] px-2.5 py-1 text-xs font-medium text-[#A4AAB5]">
                      {formatRoleLabel(u.role)}
                    </span>
                    <StatusBadge status={u.isActive ? "ACTIVE" : "ARCHIVED"} />
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(u)}
                          className="rounded-md border border-[#242934] bg-[#171A21] px-2.5 py-1 text-xs text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(u)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#242934] bg-[#171A21] text-[#8A93A2] hover:border-[#F05252]/40 hover:text-[#F05252]"
                          title="Delete account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="border-t border-[#242934] px-4 py-2.5">
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={staff.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="accounts"
          />
        </div>
      </div>

      {/* Add Admin / Trainor Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#242934] bg-[#111318] p-4 animate-panel-enter">
            <div className="mb-3 flex items-center justify-between border-b border-[#242934] pb-2">
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Add Admin or Trainor</h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#8A93A2] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-2 text-xs text-[#F05252]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-[#A4AAB5]">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Coach Alex Rivera"
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[#A4AAB5]">Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="coach@ironhub.ph"
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] text-[#A4AAB5]">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) =>
                      setForm({ ...form, role: e.target.value as "ADMIN" | "TRAINER" })
                    }
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2 text-xs text-[#F5F6F8]"
                  >
                    <option value="TRAINER">Trainor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-[#A4AAB5]">
                    Initial Password *
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
              </div>

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
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
