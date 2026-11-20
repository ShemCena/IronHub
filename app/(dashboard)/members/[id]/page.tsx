"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Ban, ShieldAlert, CheckCircle2, Archive } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

interface MemberDetail {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  joinedAt: string;
  memberships: {
    id: string;
    planNameSnapshot: string;
    priceSnapshot: string;
    startDate: string;
    endDate: string;
    status: string;
    isRenewal: boolean;
  }[];
  payments?: {
    id: string;
    receiptNumber: string;
    amount: string;
    method: string;
    status: string;
    paidAt: string;
  }[];
  attendanceRecords: {
    id: string;
    method: string;
    outcome: string;
    denialReason: string | null;
    checkedInAt: string;
  }[];
  qrCredentials: {
    id: string;
    tokenLast4: string;
    isActive: boolean;
    issuedAt: string;
    revokedAt: string | null;
  }[];
}

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [tab, setTab] = useState<"overview" | "memberships" | "payments" | "attendance">(
    "overview"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMember = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load member");
      setMember(data.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading member");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  async function handleStatusChange(newStatus: "ACTIVE" | "SUSPENDED" | "ARCHIVED") {
    if (!member) return;
    const res = await fetch(`/api/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email ?? "",
        phone: member.phone ?? "",
        status: newStatus,
      }),
    });
    if (res.ok) {
      loadMember();
    }
  }

  async function handleRevokeLostQr() {
    if (!member) return;
    const res = await fetch("/api/qr/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, reason: "Lost card revoked by staff" }),
    });
    if (res.ok) {
      loadMember();
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-xs text-[#8A93A2]">Loading member profile...</p>;
  }

  if (error || !member) {
    return (
      <div className="rounded-xl border border-[#F05252]/30 bg-[#F05252]/10 p-5 text-xs text-[#F05252]">
        {error ?? "Member not found."}
      </div>
    );
  }

  const activeMembership = member.memberships[0];
  const activeQr = member.qrCredentials.find((q) => q.isActive);

  return (
    <div className="space-y-4 animate-panel-enter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Link
            href="/members"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#242934] bg-[#111318] text-[#A4AAB5] hover:text-white"
            aria-label="Back to members"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold text-[#F5F6F8]">
                {member.firstName} {member.lastName}
              </h1>
              <StatusBadge status={member.status} />
            </div>
            <p className="text-xs text-[#8A93A2]">
              {member.memberCode} · Joined {formatDate(member.joinedAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeQr && (
            <button
              type="button"
              onClick={handleRevokeLostQr}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#F05252]/40 bg-[#F05252]/10 px-3 text-xs font-medium text-[#F05252] hover:bg-[#F05252]/20"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Revoke Lost QR</span>
            </button>
          )}
          {member.status !== "SUSPENDED" ? (
            <button
              type="button"
              onClick={() => handleStatusChange("SUSPENDED")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#F2B84B]/40 bg-[#F2B84B]/10 px-3 text-xs font-medium text-[#F2B84B] hover:bg-[#F2B84B]/20"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Suspend</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStatusChange("ACTIVE")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#2BCB83]/40 bg-[#2BCB83]/10 px-3 text-xs font-medium text-[#2BCB83] hover:bg-[#2BCB83]/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Reactivate</span>
            </button>
          )}
          {member.status !== "ARCHIVED" && (
            <button
              type="button"
              onClick={() => handleStatusChange("ARCHIVED")}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#242934] bg-[#111318] px-3 text-xs font-medium text-[#A4AAB5] hover:text-white"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4">
          <span className="text-xs text-[#8A93A2]">Current Plan</span>
          <p className="mt-1 text-lg font-semibold text-[#F5F6F8]">
            {activeMembership?.planNameSnapshot ?? "No Plan Assigned"}
          </p>
          <p className="mt-0.5 text-xs text-[#A4AAB5]">
            {activeMembership ? `Valid until ${formatDate(activeMembership.endDate)}` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4">
          <span className="text-xs text-[#8A93A2]">Client Self-Service QR Pass</span>
          <p className="mt-1 font-mono text-lg font-semibold text-[#F5F6F8]">
            {activeQr ? `••••-${activeQr.tokenLast4}` : "None Active"}
          </p>
          <p className="mt-0.5 text-xs text-[#A4AAB5]">
            {activeQr
              ? `Issued ${formatDate(activeQr.issuedAt)} via Member Portal`
              : "Client generates their pass at /portal"}
          </p>
        </div>
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-4">
          <span className="text-xs text-[#8A93A2]">Total Check-Ins Recorded</span>
          <p className="mt-1 text-lg font-semibold text-[#F5F6F8] tabular-nums">
            {member.attendanceRecords.filter((a) => a.outcome === "APPROVED").length}
          </p>
          <p className="mt-0.5 text-xs text-[#A4AAB5]">Recent 25 entries shown below</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#242934]">
        {(["overview", "memberships", "payments", "attendance"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-xs font-medium capitalize transition-colors",
              tab === t
                ? "border-[#E32935] text-[#F5F6F8]"
                : "border-transparent text-[#8A93A2] hover:text-[#A4AAB5]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="rounded-xl border border-[#242934] bg-[#111318] p-5 text-[13px]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs text-[#8A93A2]">Email</span>
              <p className="mt-1 text-[#F5F6F8]">{member.email ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-[#8A93A2]">Phone</span>
              <p className="mt-1 text-[#F5F6F8]">{member.phone ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-[#8A93A2]">Address</span>
              <p className="mt-1 text-[#F5F6F8]">{member.address ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-[#8A93A2]">Staff Notes</span>
              <p className="mt-1 text-[#F5F6F8]">{member.notes ?? "No notes recorded."}</p>
            </div>
          </div>
        </div>
      )}

      {tab === "memberships" && (
        <div className="divide-y divide-[#242934] rounded-xl border border-[#242934] bg-[#111318]">
          {member.memberships.length === 0 ? (
            <p className="p-5 text-center text-xs text-[#8A93A2]">No membership history.</p>
          ) : (
            member.memberships.map((ms) => (
              <div key={ms.id} className="flex items-center justify-between px-4 py-3 text-xs">
                <div>
                  <p className="font-medium text-[#F5F6F8]">
                    {ms.planNameSnapshot} {ms.isRenewal ? "(Renewal)" : ""}
                  </p>
                  <p className="text-[11px] text-[#8A93A2]">
                    {formatDate(ms.startDate)} → {formatDate(ms.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-[#A4AAB5] tabular-nums">
                    {formatCurrency(ms.priceSnapshot)}
                  </span>
                  <StatusBadge status={ms.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="divide-y divide-[#242934] rounded-xl border border-[#242934] bg-[#111318]">
          {!member.payments || member.payments.length === 0 ? (
            <p className="p-5 text-center text-xs text-[#8A93A2]">No payment records available.</p>
          ) : (
            member.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 text-xs">
                <div>
                  <p className="font-mono text-[#F5F6F8]">{p.receiptNumber}</p>
                  <p className="text-[11px] text-[#8A93A2]">
                    {p.method} · {formatDateTime(p.paidAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-[#F5F6F8] tabular-nums">
                    {formatCurrency(p.amount)}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "attendance" && (
        <div className="divide-y divide-[#242934] rounded-xl border border-[#242934] bg-[#111318]">
          {member.attendanceRecords.length === 0 ? (
            <p className="p-5 text-center text-xs text-[#8A93A2]">No check-in history.</p>
          ) : (
            member.attendanceRecords.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3 text-xs">
                <div>
                  <p className="text-[#F5F6F8]">
                    {a.method} Check-In {a.denialReason ? `— ${a.denialReason}` : ""}
                  </p>
                  <p className="text-[11px] text-[#8A93A2]">{formatDateTime(a.checkedInAt)}</p>
                </div>
                <StatusBadge status={a.outcome} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
