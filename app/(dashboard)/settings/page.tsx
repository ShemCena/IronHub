"use client";

import React, { useEffect, useState } from "react";
import { Save, CheckCircle2, Building2, Clock, Users, ShieldAlert } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { StatusBadge } from "@/components/ui/status-badge";
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

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

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
    return <p className="py-12 text-center text-sm text-[#8A93A2]">Loading settings...</p>;
  }

  return (
    <div className="space-y-6 animate-panel-enter">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#F5F6F8]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[#A4AAB5]">
            Configure gym profile, check-in rules, staff roles, and review the security audit trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <span className="rounded-md border border-[#F2B84B]/30 bg-[#F2B84B]/10 px-2.5 py-1 text-xs font-medium text-[#F2B84B]">
              Unsaved changes
            </span>
          )}
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-3 py-1.5 text-xs font-medium text-[#2BCB83]">
              <CheckCircle2 className="h-4 w-4" />
              Settings saved
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto whitespace-nowrap border-b border-[#292E38]" role="tablist">
        {(
          [
            ["general", "Gym Profile", Building2],
            ["policy", "Check-In & Hours", Clock],
            ["staff", "Staff & Roles", Users],
            ["audit", "Audit Log", ShieldAlert],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-[#E32935] text-[#F5F6F8]"
                : "border-transparent text-[#8A93A2] hover:text-[#A4AAB5]"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === "general" && (
        <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 rounded-xl border border-[#292E38] bg-[#111318] p-6 lg:col-span-8">
            <div>
              <h2 className="text-base font-semibold text-[#F5F6F8]">Gym Information</h2>
              <p className="text-xs text-[#8A93A2]">
                Displayed on receipts, member QR passes, and reports.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gym-name" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Gym Name
                </label>
                <input
                  id="gym-name"
                  value={settings.gymName}
                  onChange={(e) => {
                    setSettings({ ...settings, gymName: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
              <div>
                <label htmlFor="gym-email" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Support Email
                </label>
                <input
                  id="gym-email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => {
                    setSettings({ ...settings, email: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
              <div>
                <label htmlFor="gym-phone" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Phone Number
                </label>
                <input
                  id="gym-phone"
                  value={settings.phone}
                  onChange={(e) => {
                    setSettings({ ...settings, phone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
              <div>
                <label htmlFor="gym-timezone" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Timezone
                </label>
                <input
                  id="gym-timezone"
                  value={settings.timezone}
                  onChange={(e) => {
                    setSettings({ ...settings, timezone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="gym-address" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Address
                </label>
                <input
                  id="gym-address"
                  value={settings.address}
                  onChange={(e) => {
                    setSettings({ ...settings, address: e.target.value });
                    setDirty(true);
                  }}
                  className="h-10 w-full rounded-lg border border-[#292E38] bg-[#171A21] px-3 text-sm text-[#F5F6F8] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end border-t border-[#292E38] pt-4">
              <button
                type="submit"
                disabled={!dirty || saving}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:border disabled:border-[#292E38] disabled:bg-[#20242D] disabled:text-[#8A93A2]"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </div>

          {/* Right Brand Preview Card */}
          <div className="rounded-xl border border-[#292E38] bg-[#111318] p-6 lg:col-span-4">
            <h2 className="text-base font-semibold text-[#F5F6F8]">Gym Brand Identity</h2>
            <p className="text-xs text-[#8A93A2]">Active workspace mark &amp; branch details</p>

            <div className="mt-5 flex flex-col items-center justify-center rounded-xl border border-[#292E38] bg-[#090A0D] p-8 text-center">
              <BrandMark />
              <p className="mt-4 text-sm font-medium text-[#F5F6F8]">{settings.gymName}</p>
              <p className="mt-1 text-xs text-[#8A93A2]">{settings.address}</p>
            </div>
          </div>
        </form>
      )}

      {tab === "policy" && (
        <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-[#292E38] bg-[#111318] p-6">
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#F5F6F8]">Check-In Policy</h2>
            <div className="flex items-center justify-between rounded-lg border border-[#292E38] bg-[#171A21] p-4">
              <div>
                <p className="text-sm font-medium text-[#F5F6F8]">
                  Allow multiple check-ins per day
                </p>
                <p className="text-xs text-[#8A93A2]">
                  If disabled, members are limited to one approved entry per calendar day.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.allowMultipleCheckInsPerDay}
                onClick={() => {
                  setSettings({
                    ...settings,
                    allowMultipleCheckInsPerDay: !settings.allowMultipleCheckInsPerDay,
                  });
                  setDirty(true);
                }}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  settings.allowMultipleCheckInsPerDay ? "bg-[#E32935]" : "bg-[#292E38]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white transition-transform",
                    settings.allowMultipleCheckInsPerDay ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
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

          {/* Operating Hours */}
          <div className="space-y-3 border-t border-[#292E38] pt-5">
            <div>
              <h2 className="text-base font-semibold text-[#F5F6F8]">Operating Hours</h2>
              <p className="text-xs text-[#8A93A2]">
                Drives the live Gym Open / Gym Closed status on the Dashboard.
              </p>
            </div>
            <div className="divide-y divide-[#292E38] rounded-xl border border-[#292E38] bg-[#171A21]">
              {WEEKDAYS.map((day) => {
                const entry = settings.businessHours?.[day] ?? {
                  open: "06:00",
                  close: "22:00",
                  closed: false,
                };
                return (
                  <div
                    key={day}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
                  >
                    <span className="w-24 font-medium capitalize text-[#F5F6F8]">{day}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        disabled={entry.closed}
                        value={entry.open}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            businessHours: {
                              ...settings.businessHours,
                              [day]: { ...entry, open: e.target.value },
                            },
                          });
                          setDirty(true);
                        }}
                        className="h-8 rounded border border-[#292E38] bg-[#111318] px-2 text-[#F5F6F8] disabled:opacity-40"
                      />
                      <span className="text-[#8A93A2]">to</span>
                      <input
                        type="time"
                        disabled={entry.closed}
                        value={entry.close}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            businessHours: {
                              ...settings.businessHours,
                              [day]: { ...entry, close: e.target.value },
                            },
                          });
                          setDirty(true);
                        }}
                        className="h-8 rounded border border-[#292E38] bg-[#111318] px-2 text-[#F5F6F8] disabled:opacity-40"
                      />
                      <label className="ml-2 inline-flex items-center gap-1.5 text-[#A4AAB5]">
                        <input
                          type="checkbox"
                          checked={entry.closed}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              businessHours: {
                                ...settings.businessHours,
                                [day]: { ...entry, closed: e.target.checked },
                              },
                            });
                            setDirty(true);
                          }}
                          className="accent-[#E32935]"
                        />
                        Closed
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end border-t border-[#292E38] pt-4">
            <button
              type="submit"
              disabled={!dirty || saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:border disabled:border-[#292E38] disabled:bg-[#20242D] disabled:text-[#8A93A2]"
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
            <p className="p-6 text-center text-xs text-[#8A93A2]">
              Staff list is restricted to Owner accounts.
            </p>
          ) : (
            staff.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-xs font-semibold text-[#F5F6F8]">
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
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-[#292E38] bg-[#171A21] px-2.5 py-1 text-xs font-medium text-[#A4AAB5]">
                    {u.role}
                  </span>
                  <StatusBadge status={u.isActive ? "ACTIVE" : "ARCHIVED"} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "audit" && (
        <div className="rounded-xl border border-[#292E38] bg-[#111318] divide-y divide-[#292E38]">
          {auditLogs.length === 0 ? (
            <p className="p-6 text-center text-xs text-[#8A93A2]">
              No audit log entries visible for your role.
            </p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs">
                <div className="space-y-1">
                  <span className="inline-block rounded border border-[#292E38] bg-[#171A21] px-2 py-0.5 font-mono font-medium text-[#F5F6F8]">
                    {log.action}
                  </span>
                  <p className="text-[#8A93A2]">
                    {log.entityType} ({log.entityId}) · Actor: {log.actor?.name ?? "System"}
                  </p>
                </div>
                <span className="text-[#8A93A2] tabular-nums">
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
