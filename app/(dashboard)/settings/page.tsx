"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Save,
  CheckCircle2,
  Building2,
  Clock,
  Users,
  ShieldAlert,
  KeyRound,
  UserPlus,
  X,
  AlertCircle,
  Wallet,
  CalendarCheck,
  Trash2,
} from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { PaginationBar } from "@/components/ui/pagination-bar";
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
  role: "OWNER" | "ADMIN" | "FRONT_DESK" | "TRAINER";
  isActive: boolean;
  lastLoginAt: string | null;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  actor: { name: string; role: string } | null;
}

interface SettingsPermissions {
  canViewGymSettings: boolean;
  canManageGymSettings: boolean;
  canManageStaff: boolean;
  canViewAudit: boolean;
  assignableRoles: ("ADMIN" | "FRONT_DESK" | "TRAINER")[];
}

interface CurrentUserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
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

const PAGE_SIZE = 6;

function formatRoleLabel(role: string): string {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return "Admin";
    case "FRONT_DESK":
      return "Staff";
    case "TRAINER":
      return "Trainor";
    default:
      return role;
  }
}

export default function SettingsPage() {
  const [tab, setTab] = useState<"general" | "policy" | "staff" | "account" | "audit">("general");
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [permissions, setPermissions] = useState<SettingsPermissions | null>(null);
  const [settings, setSettings] = useState<GymSettingsState | null>(null);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);

  const [staffPage, setStaffPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Add Staff Modal state
  const [staffModal, setStaffModal] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "FRONT_DESK" as "ADMIN" | "FRONT_DESK" | "TRAINER",
  });

  // Password Change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (!res.ok) return;
    const data = await res.json();
    setCurrentUser(data.currentUser ?? null);
    setPermissions(data.permissions ?? null);
    setSettings(data.settings ?? null);
    setStaff(data.staff ?? []);
    setAuditLogs(data.auditLogs ?? []);

    if (data.permissions && !data.permissions.canViewGymSettings) {
      setTab("account");
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function flashSaved(msg: string) {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 2600);
  }

  async function handleSaveGymSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || !permissions?.canManageGymSettings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setDirty(false);
        flashSaved("Gym settings saved");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setStaffError(data.error ?? "Failed to add staff member.");
        return;
      }
      setStaffModal(false);
      setStaffForm({ name: "", email: "", password: "", role: "FRONT_DESK" });
      flashSaved(`Added ${data.staff.name}`);
      loadSettings();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStaffActive(u: StaffUser) {
    const res = await fetch(`/api/staff/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    if (res.ok) {
      flashSaved(`${u.name} ${u.isActive ? "deactivated" : "activated"}`);
      loadSettings();
    }
  }

  async function handleDeleteStaff(u: StaffUser) {
    const res = await fetch(`/api/staff/${u.id}`, { method: "DELETE" });
    if (res.ok) {
      flashSaved(`${u.name} removed`);
      loadSettings();
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaving(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pwForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? "Failed to update password.");
        return;
      }
      setPwForm({ currentPassword: "", newPassword: "" });
      flashSaved("Password updated");
    } finally {
      setPwSaving(false);
    }
  }

  if (!permissions || !currentUser) {
    return <p className="py-10 text-center text-xs text-[#8A93A2]">Loading settings...</p>;
  }

  const readOnlyGym = !permissions.canManageGymSettings;

  const availableTabs = [
    ...(permissions.canViewGymSettings
      ? ([
          ["general", "General", Building2],
          ["policy", "Check-In & Hours", Clock],
        ] as const)
      : []),
    ...(permissions.canManageStaff ? ([["staff", "Staff & Roles", Users]] as const) : []),
    ["account", "Account & Security", KeyRound] as const,
    ...(permissions.canViewAudit ? ([["audit", "Audit Log", ShieldAlert]] as const) : []),
  ];

  const activeStaffCount = staff.filter((s) => s.isActive).length;
  const totalStaffPages = Math.max(1, Math.ceil(staff.length / PAGE_SIZE));
  const pagedStaff = staff.slice((staffPage - 1) * PAGE_SIZE, staffPage * PAGE_SIZE);

  const totalAuditPages = Math.max(1, Math.ceil(auditLogs.length / PAGE_SIZE));
  const pagedAudit = auditLogs.slice((auditPage - 1) * PAGE_SIZE, auditPage * PAGE_SIZE);

  return (
    <div className="space-y-3 animate-panel-enter">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#F5F6F8]">Settings</h1>
          <p className="text-[11px] text-[#A4AAB5]">
            Configure gym profile, operating hours, staff accounts, and security preferences.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <span className="rounded-md border border-[#F2B84B]/30 bg-[#F2B84B]/10 px-2.5 py-1 text-xs font-medium text-[#F2B84B]">
              Unsaved changes
            </span>
          )}
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-3 py-1 text-xs font-medium text-[#2BCB83]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {savedNotice}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1.5 overflow-x-auto whitespace-nowrap border-b border-[#242934]"
        role="tablist"
      >
        {availableTabs.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "inline-flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
              tab === key
                ? "border-[#E32935] text-[#F5F6F8]"
                : "border-transparent text-[#8A93A2] hover:text-[#A4AAB5]"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: General Gym Profile */}
      {tab === "general" && settings && (
        <form onSubmit={handleSaveGymSettings} className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="space-y-3 rounded-xl border border-[#242934] bg-[#111318] p-4 lg:col-span-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#F5F6F8]">Gym Information</h2>
                <p className="text-[11px] text-[#8A93A2]">
                  Displayed on receipts, member QR passes, and reports.
                </p>
              </div>
              {readOnlyGym && (
                <span className="rounded border border-[#292E38] bg-[#171A21] px-2 py-0.5 text-[10px] text-[#8A93A2]">
                  Admin Editable Only
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="gym-name" className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Gym Name
                </label>
                <input
                  id="gym-name"
                  disabled={readOnlyGym}
                  value={settings.gymName}
                  onChange={(e) => {
                    setSettings({ ...settings, gymName: e.target.value });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="gym-email" className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Support Email
                </label>
                <input
                  id="gym-email"
                  type="email"
                  disabled={readOnlyGym}
                  value={settings.email}
                  onChange={(e) => {
                    setSettings({ ...settings, email: e.target.value });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="gym-phone" className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Phone Number
                </label>
                <input
                  id="gym-phone"
                  disabled={readOnlyGym}
                  value={settings.phone}
                  onChange={(e) => {
                    setSettings({ ...settings, phone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] disabled:opacity-60"
                />
              </div>
              <div>
                <label htmlFor="gym-timezone" className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Timezone
                </label>
                <input
                  id="gym-timezone"
                  disabled={readOnlyGym}
                  value={settings.timezone}
                  onChange={(e) => {
                    setSettings({ ...settings, timezone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] disabled:opacity-60"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="gym-address" className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Address
                </label>
                <input
                  id="gym-address"
                  disabled={readOnlyGym}
                  value={settings.address}
                  onChange={(e) => {
                    setSettings({ ...settings, address: e.target.value });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8] disabled:opacity-60"
                />
              </div>
            </div>

            {!readOnlyGym && (
              <div className="flex justify-end border-t border-[#242934] pt-3">
                <button
                  type="submit"
                  disabled={!dirty || saving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:border disabled:border-[#242934] disabled:bg-[#20242D] disabled:text-[#8A93A2]"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#242934] bg-[#111318] p-4 lg:col-span-4">
            <h2 className="text-sm font-semibold text-[#F5F6F8]">Gym Logo</h2>
            <p className="text-[11px] text-[#8A93A2]">Active workspace mark &amp; branch identity</p>

            <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-[#242934] bg-[#090A0D] p-5 text-center">
              <BrandMark />
              <p className="mt-3 text-xs font-medium text-[#F5F6F8]">{settings.gymName}</p>
              <p className="mt-0.5 text-[11px] text-[#8A93A2]">{settings.address}</p>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Check-In Policy & Operating Hours */}
      {tab === "policy" && settings && (
        <form
          onSubmit={handleSaveGymSettings}
          className="space-y-4 rounded-xl border border-[#242934] bg-[#111318] p-4"
        >
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#F5F6F8]">Check-In Policy</h2>
            <div className="flex items-center justify-between rounded-lg border border-[#242934] bg-[#171A21] p-3">
              <div>
                <p className="text-xs font-medium text-[#F5F6F8]">
                  Allow multiple check-ins per day
                </p>
                <p className="text-[11px] text-[#8A93A2]">
                  If disabled, members are limited to one approved entry per calendar day.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                disabled={readOnlyGym}
                aria-checked={settings.allowMultipleCheckInsPerDay}
                onClick={() => {
                  setSettings({
                    ...settings,
                    allowMultipleCheckInsPerDay: !settings.allowMultipleCheckInsPerDay,
                  });
                  setDirty(true);
                }}
                className={cn(
                  "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:opacity-50",
                  settings.allowMultipleCheckInsPerDay ? "bg-[#E32935]" : "bg-[#292E38]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 rounded-full bg-white transition-transform",
                    settings.allowMultipleCheckInsPerDay ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Duplicate Check-In Cooldown (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={readOnlyGym}
                  value={settings.duplicateCheckInWindowMinutes}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      duplicateCheckInWindowMinutes: Number(e.target.value),
                    });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[#A4AAB5]">
                  Expiry Reminder Lead Time (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  disabled={readOnlyGym}
                  value={settings.expiryReminderDays}
                  onChange={(e) => {
                    setSettings({ ...settings, expiryReminderDays: Number(e.target.value) });
                    setDirty(true);
                  }}
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2.5 border-t border-[#242934] pt-3">
            <div>
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Operating Hours</h2>
              <p className="text-[11px] text-[#8A93A2]">
                Drives the live Gym Open / Gym Closed indicator on the Dashboard.
              </p>
            </div>
            <div className="divide-y divide-[#242934] rounded-xl border border-[#242934] bg-[#171A21]">
              {WEEKDAYS.map((day) => {
                const entry = settings.businessHours?.[day] ?? {
                  open: "06:00",
                  close: "22:00",
                  closed: false,
                };
                return (
                  <div
                    key={day}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 text-xs"
                  >
                    <span className="w-24 font-medium capitalize text-[#F5F6F8]">{day}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        disabled={readOnlyGym || entry.closed}
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
                        className="h-7 rounded border border-[#242934] bg-[#111318] px-2 text-xs text-[#F5F6F8] disabled:opacity-40"
                      />
                      <span className="text-[#8A93A2]">to</span>
                      <input
                        type="time"
                        disabled={readOnlyGym || entry.closed}
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
                        className="h-7 rounded border border-[#242934] bg-[#111318] px-2 text-xs text-[#F5F6F8] disabled:opacity-40"
                      />
                      <label className="ml-2 inline-flex items-center gap-1.5 text-[#A4AAB5]">
                        <input
                          type="checkbox"
                          disabled={readOnlyGym}
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

          {!readOnlyGym && (
            <div className="flex justify-end border-t border-[#242934] pt-3">
              <button
                type="submit"
                disabled={!dirty || saving}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab 3: Staff & Roles (Admin can add Admin, Staff, and Trainor) */}
      {tab === "staff" && permissions.canManageStaff && (
        <div className="space-y-3">
          {/* 3-Card KPI Strip with vs last mo comparison */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <KpiCard
              label="Monthly Staff Payroll"
              value="₱80,500"
              deltaPercent={4}
              icon={Wallet}
              tone="purple"
            />
            <KpiCard
              label="Active Team Members"
              value={activeStaffCount}
              deltaPercent={10}
              icon={Users}
              tone="blue"
            />
            <KpiCard
              label="Check-Ins Handled"
              value={248}
              deltaPercent={12}
              icon={CalendarCheck}
              tone="green"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-[#242934] bg-[#111318] p-3">
            <div>
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Staff Accounts &amp; Roles</h2>
              <p className="text-[11px] text-[#8A93A2]">
                Add and manage Admins, Staff, and Trainors.
              </p>
            </div>
            {permissions.assignableRoles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStaffError(null);
                  setStaffForm({
                    name: "",
                    email: "",
                    password: "",
                    role: permissions.assignableRoles[0] ?? "FRONT_DESK",
                  });
                  setStaffModal(true);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#E32935] px-3 text-xs font-semibold text-white hover:bg-[#F13A46]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Staff</span>
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
            <div className="divide-y divide-[#242934]">
              {pagedStaff.map((u) => {
                const canEditRow =
                  u.id !== currentUser.id &&
                  permissions.assignableRoles.includes(
                    (u.role === "OWNER" ? "ADMIN" : u.role) as "ADMIN" | "FRONT_DESK" | "TRAINER"
                  );
                return (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[#292E38] bg-[#171A21] text-[10px] font-semibold text-[#F5F6F8]">
                        {u.name
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[#F5F6F8]">{u.name}</p>
                        <p className="text-[11px] text-[#8A93A2]">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md border border-[#292E38] bg-[#171A21] px-2 py-0.5 text-[11px] font-medium text-[#A4AAB5]">
                        {formatRoleLabel(u.role)}
                      </span>
                      <StatusBadge status={u.isActive ? "ACTIVE" : "ARCHIVED"} />
                      {canEditRow && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleToggleStaffActive(u)}
                            className="rounded-md border border-[#242934] bg-[#171A21] px-2 py-0.5 text-[11px] text-[#A4AAB5] hover:bg-[#20242D] hover:text-white"
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(u)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[#242934] bg-[#171A21] text-[#8A93A2] hover:border-[#F05252]/40 hover:text-[#F05252]"
                            title="Delete staff account"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-[#242934] px-3.5 py-2">
              <PaginationBar
                page={staffPage}
                totalPages={totalStaffPages}
                totalItems={staff.length}
                pageSize={PAGE_SIZE}
                onPageChange={setStaffPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Account & Security (All Roles) */}
      {tab === "account" && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
          <form
            onSubmit={handlePasswordChange}
            className="space-y-3 rounded-xl border border-[#242934] bg-[#111318] p-4 lg:col-span-6"
          >
            <div>
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Change Password</h2>
              <p className="text-[11px] text-[#8A93A2]">
                Update the password for {currentUser.email}.
              </p>
            </div>

            {pwError && (
              <div className="flex items-center gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-2.5 text-xs text-[#F05252]">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            <div>
              <label className="mb-1 block text-[11px] text-[#A4AAB5]">Current Password</label>
              <input
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[#A4AAB5]">
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={pwSaving}
                className="h-8 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
              >
                {pwSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>

          <div className="space-y-2.5 rounded-xl border border-[#242934] bg-[#111318] p-4 lg:col-span-6">
            <div>
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Role Access Policy (4 Roles)</h2>
              <p className="text-[11px] text-[#8A93A2]">
                Signed in as <span className="text-[#F5F6F8]">{currentUser.name}</span> (
                {currentUser.roleLabel})
              </p>
            </div>

            <ul className="space-y-1.5 rounded-xl border border-[#242934] bg-[#171A21] p-3 text-xs text-[#A4AAB5]">
              <li>
                • <strong className="text-[#F5F6F8]">Admin:</strong> Full access to Dashboard,
                Members, Check-In, Plans &amp; Payments, Reports, and adding Admins, Staff, and
                Trainors.
              </li>
              <li>
                • <strong className="text-[#F5F6F8]">Staff:</strong> Front-desk check-in scanning,
                member enrollment, and over-the-counter payment collection.
              </li>
              <li>
                • <strong className="text-[#F5F6F8]">Trainor:</strong> Floor attendance monitoring,
                member lookup, and personal salary &amp; check-in metrics.
              </li>
              <li>
                • <strong className="text-[#F5F6F8]">Client:</strong> Logs into{" "}
                <code className="text-[#E32935]">/portal</code> to track attendance, plan expiry,
                upload profile photo, and self-generate QR passes.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 5: Audit Log */}
      {tab === "audit" && permissions.canViewAudit && (
        <div className="overflow-hidden rounded-xl border border-[#242934] bg-[#111318]">
          <div className="divide-y divide-[#242934]">
            {pagedAudit.length === 0 ? (
              <p className="p-6 text-center text-xs text-[#8A93A2]">No audit log entries yet.</p>
            ) : (
              pagedAudit.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="inline-block rounded border border-[#292E38] bg-[#171A21] px-2 py-0.5 font-mono text-[11px] font-medium text-[#F5F6F8]">
                      {log.action}
                    </span>
                    <p className="text-[11px] text-[#8A93A2]">
                      {log.entityType} ({log.entityId}) · Actor: {log.actor?.name ?? "Client Portal"}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#8A93A2] tabular-nums">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
          {auditLogs.length > 0 && (
            <div className="border-t border-[#242934] px-3.5 py-2">
              <PaginationBar
                page={auditPage}
                totalPages={totalAuditPages}
                totalItems={auditLogs.length}
                pageSize={PAGE_SIZE}
                onPageChange={setAuditPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Add Staff Modal */}
      {staffModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#242934] bg-[#111318] p-4 animate-panel-enter">
            <div className="mb-3 flex items-center justify-between border-b border-[#242934] pb-2">
              <h2 className="text-sm font-semibold text-[#F5F6F8]">Add Staff Account</h2>
              <button
                type="button"
                onClick={() => setStaffModal(false)}
                className="text-[#8A93A2] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {staffError && (
              <div className="mb-2.5 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-2 text-xs text-[#F05252]">
                {staffError}
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] text-[#A4AAB5]">Full Name *</label>
                <input
                  required
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  placeholder="Ella Santos"
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-[#A4AAB5]">Email Address *</label>
                <input
                  type="email"
                  required
                  value={staffForm.email}
                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                  placeholder="staff@ironhub.ph"
                  className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-[11px] text-[#A4AAB5]">Role *</label>
                  <select
                    value={staffForm.role}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        role: e.target.value as typeof staffForm.role,
                      })
                    }
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2 text-xs text-[#F5F6F8]"
                  >
                    {permissions.assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {formatRoleLabel(r)}
                      </option>
                    ))}
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
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    placeholder="Min 8 characters"
                    className="h-8 w-full rounded-lg border border-[#242934] bg-[#171A21] px-2.5 text-xs text-[#F5F6F8]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffModal(false)}
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
