"use client";

import React, { useEffect, useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";
import type { BusinessHoursMap } from "@/lib/domain/membership";

interface GymSettingsState {
  gymName: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  allowMultipleCheckInsPerDay: boolean;
  duplicateCheckInWindowMinutes: number;
  expiryReminderDays: number;
  businessHours: BusinessHoursMap;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string; role: string } | null;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<"general" | "policy" | "staff" | "audit">("general");
  const [settings, setSettings] = useState<GymSettingsState | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
        if (data?.staff) setStaff(data.staff);
        if (data?.auditLogs) setAuditLogs(data.auditLogs);
      })
      .catch(() => {});
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSavedNotice(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setDirty(false);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <p className="py-12 text-center text-sm text-[#747C89]">Loading settings...</p>;
  }

  return (
    <div className="space-y-6 animate-panel-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight text-[#F5F6F8]"
            style={{ fontFamily: "var(--font-barlow), sans-serif" }}
          >
            SETTINGS
          </h1>
          <p className="mt-1 text-sm text-[#A4AAB5]">
            Configure gym profile, check-in rules, staff roles, and review the security audit trail.
          </p>
        </div>

        {savedNotice && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-3 py-1.5 text-xs font-medium text-[#2BCB83]">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved
          </span>
        )}
      </div>

      <div className="flex gap-2 border-b border-[#292E38]">
        {(
          [
            ["general", "Gym Profile"],
            ["policy", "Check-In & Hours"],
            ["staff", "Staff & Roles"],
            ["audit", "Audit Log"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-[#E32935] text-[#F5F6F8]"
                : "border-transparent text-[#747C89] hover:text-[#A4AAB5]"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "general" || tab === "policy") && (
        <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-[#292E38] bg-[#111318] p-6">
          {tab === "general" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-[#A4AAB5]">Gym Name</label>
                <input
                  value={settings.gymName}
                  onChange={(e) => {
                    setSettings({ ...settings, gymName: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#A4AAB5]">Support Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => {
                    setSettings({ ...settings, email: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#A4AAB5]">Phone Number</label>
                <input
                  value={settings.phone}
                  onChange={(e) => {
                    setSettings({ ...settings, phone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#A4AAB5]">Address</label>
                <input
                  value={settings.address}
                  onChange={(e) => {
                    setSettings({ ...settings, address: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-[#292E38] bg-[#171A21] p-4">
                <div>
                  <p className="text-sm font-medium text-[#F5F6F8]">
                    Allow multiple check-ins per day
                  </p>
                  <p className="text-xs text-[#747C89]">
                    If disabled, members are limited to one approved entry per calendar day.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowMultipleCheckInsPerDay}
                  onChange={(e) => {
                    setSettings({ ...settings, allowMultipleCheckInsPerDay: e.target.checked });
                    setDirty(true);
                  }}
                  className="h-4 w-4 accent-[#E32935]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                    Duplicate Check-In Cooldown (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={settings.duplicateCheckInWindowMinutes}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        duplicateCheckInWindowMinutes: Number(e.target.value),
                      });
                      setDirty(true);
                    }}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                    Expiry Reminder Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={settings.expiryReminderDays}
                    onChange={(e) => {
                      setSettings({ ...settings, expiryReminderDays: Number(e.target.value) });
                      setDirty(true);
                    }}
                    className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-[#292E38] pt-4">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      )}

      {tab === "staff" && (
        <div className="rounded-xl border border-[#292E38] bg-[#111318] divide-y divide-[#292E38]">
          {staff.length === 0 ? (
            <p className="p-6 text-center text-xs text-[#747C89]">
              Staff list is restricted to Owner accounts.
            </p>
          ) : (
            staff.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium text-[#F5F6F8]">{u.name}</p>
                  <p className="text-xs text-[#747C89]">{u.email}</p>
                </div>
                <span className="rounded-md border border-[#292E38] bg-[#171A21] px-2.5 py-1 text-xs font-medium text-[#A4AAB5]">
                  {u.role}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="rounded-xl border border-[#292E38] bg-[#111318] divide-y divide-[#292E38]">
          {auditLogs.length === 0 ? (
            <p className="p-6 text-center text-xs text-[#747C89]">
              No audit log entries visible for your role.
            </p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-4 p-4 text-xs">
                <div>
                  <p className="font-mono font-medium text-[#F5F6F8]">{log.action}</p>
                  <p className="text-[#747C89]">
                    {log.entityType} ({log.entityId}) · Actor: {log.actor?.name ?? "System"}
                  </p>
                </div>
                <span className="text-[#747C89] tabular-nums">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
