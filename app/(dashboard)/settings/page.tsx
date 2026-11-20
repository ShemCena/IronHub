"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Save, CheckCircle2, AlertCircle, KeyRound, Building2, UserCircle2 } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { useFeedback } from "@/components/ui/feedback-modal";
import { SettingsSkeleton } from "@/components/ui/ironhub-loader";
import { getCached, setCached } from "@/lib/cache/client-cache";
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

interface SettingsPermissions {
  canViewGymSettings: boolean;
  canManageGymSettings: boolean;
}

interface CurrentUserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
}

export default function SettingsPage() {
  const { showSuccess, showError } = useFeedback();
  const [currentUser, setCurrentUser] = useState<CurrentUserInfo | null>(null);
  const [permissions, setPermissions] = useState<SettingsPermissions | null>(null);
  const [settings, setSettings] = useState<GymSettingsState | null>(null);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    const cacheKey = "settings:gym";
    const cached = getCached<{
      currentUser: CurrentUserInfo | null;
      permissions: SettingsPermissions | null;
      settings: GymSettingsState | null;
    }>(cacheKey, 60_000);
    if (cached) {
      setCurrentUser(cached.currentUser);
      setProfileName(cached.currentUser?.name ?? "");
      setPermissions(cached.permissions);
      setSettings(cached.settings);
    }
    const res = await fetch("/api/settings?scope=settings");
    if (!res.ok) return;
    const data = await res.json();
    setCached(cacheKey, data);
    setCurrentUser(data.currentUser ?? null);
    setProfileName(data.currentUser?.name ?? "");
    setPermissions(data.permissions ?? null);
    setSettings(data.settings ?? null);
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
        showSuccess("Settings Saved", "Gym profile information has been updated.");
      } else {
        const data = await res.json().catch(() => ({}));
        showError("Save Failed", data.error ?? "Unable to save gym settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to update profile.";
        setProfileError(msg);
        showError("Profile Update Failed", msg);
        return;
      }
      setCurrentUser((prev) => (prev ? { ...prev, name: data.user.name } : prev));
      showSuccess("Profile Updated", "Your coach profile has been saved.");
    } finally {
      setProfileSaving(false);
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
        const msg = data.error ?? "Failed to update password.";
        setPwError(msg);
        showError("Password Error", msg);
        return;
      }
      setPwForm({ currentPassword: "", newPassword: "" });
      showSuccess("Password Updated", "Your account password has been changed.");
    } finally {
      setPwSaving(false);
    }
  }

  if (!permissions || !currentUser) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-4 animate-panel-enter">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">Settings</h1>
          <p className="text-xs text-[#A4AAB5]">
            {permissions.canViewGymSettings
              ? "Manage gym profile information and your account security."
              : "Manage your coach profile information and account security."}
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

      {/* Combined Single-Screen Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {permissions.canViewGymSettings && settings ? (
          <form
            onSubmit={handleSaveGymSettings}
            className="space-y-4 rounded-xl border border-[#242934] bg-[#111318] p-5 lg:col-span-7"
          >
            <div className="flex items-center justify-between border-b border-[#242934] pb-3">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-[#E32935]" />
                <div>
                  <h2 className="text-sm font-semibold text-[#F5F6F8]">Gym Information</h2>
                  <p className="text-xs text-[#8A93A2]">
                    Shown on receipts, client QR passes, and reports.
                  </p>
                </div>
              </div>
              <BrandMark />
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="gym-name" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Gym Name
                </label>
                <input
                  id="gym-name"
                  disabled={!permissions.canManageGymSettings}
                  value={settings.gymName}
                  onChange={(e) => {
                    setSettings({ ...settings, gymName: e.target.value });
                    setDirty(true);
                  }}
                  className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                />
              </div>
              <div>
                <label htmlFor="gym-email" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Support Email
                </label>
                <input
                  id="gym-email"
                  type="email"
                  disabled={!permissions.canManageGymSettings}
                  value={settings.email}
                  onChange={(e) => {
                    setSettings({ ...settings, email: e.target.value });
                    setDirty(true);
                  }}
                  className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                />
              </div>
              <div>
                <label htmlFor="gym-phone" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Phone Number
                </label>
                <input
                  id="gym-phone"
                  disabled={!permissions.canManageGymSettings}
                  value={settings.phone}
                  onChange={(e) => {
                    setSettings({ ...settings, phone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                />
              </div>
              <div>
                <label htmlFor="gym-timezone" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Timezone
                </label>
                <input
                  id="gym-timezone"
                  disabled={!permissions.canManageGymSettings}
                  value={settings.timezone}
                  onChange={(e) => {
                    setSettings({ ...settings, timezone: e.target.value });
                    setDirty(true);
                  }}
                  className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="gym-address" className="mb-1.5 block text-xs text-[#A4AAB5]">
                  Address
                </label>
                <input
                  id="gym-address"
                  disabled={!permissions.canManageGymSettings}
                  value={settings.address}
                  onChange={(e) => {
                    setSettings({ ...settings, address: e.target.value });
                    setDirty(true);
                  }}
                  className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                />
              </div>
            </div>

            {permissions.canManageGymSettings && (
              <div className="flex justify-end border-t border-[#242934] pt-3">
                <button
                  type="submit"
                  disabled={!dirty || saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:border disabled:border-[#242934] disabled:bg-[#20242D] disabled:text-[#8A93A2]"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{saving ? "Saving..." : "Save Gym Info"}</span>
                </button>
              </div>
            )}
          </form>
        ) : (
          /* Trainor Profile & Coaching Information */
          <form
            onSubmit={handleSaveProfile}
            className="flex flex-col justify-between space-y-4 rounded-xl border border-[#242934] bg-[#111318] p-5 lg:col-span-7"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#242934] pb-3">
                <div className="flex items-center gap-2.5">
                  <UserCircle2 className="h-4 w-4 text-[#E32935]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#F5F6F8]">Coach Profile &amp; Info</h2>
                    <p className="text-xs text-[#8A93A2]">
                      Your coaching identity displayed to clients and admins.
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-[#2BCB83]/30 bg-[#2BCB83]/10 px-2.5 py-1 text-xs font-semibold text-[#2BCB83]">
                  Active {currentUser.roleLabel}
                </span>
              </div>

              {profileError && (
                <div className="flex items-center gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-2.5 text-xs text-[#F05252]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs text-[#A4AAB5]">Full Name</label>
                  <input
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#A4AAB5]">Email Address</label>
                  <input
                    disabled
                    value={currentUser.email}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#8A93A2] opacity-80"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#A4AAB5]">Role</label>
                  <input
                    disabled
                    value={currentUser.roleLabel}
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#8A93A2] opacity-80"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#A4AAB5]">Gym Branch</label>
                  <input
                    disabled
                    value="IronHub Fitness · Cadiz City"
                    className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#8A93A2] opacity-80"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-[#242934] pt-3">
              <button
                type="submit"
                disabled={profileSaving || profileName.trim() === currentUser.name}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:border disabled:border-[#242934] disabled:bg-[#20242D] disabled:text-[#8A93A2]"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{profileSaving ? "Saving..." : "Save Profile"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Account & Security */}
        <form
          onSubmit={handlePasswordChange}
          className="flex flex-col justify-between space-y-4 rounded-xl border border-[#242934] bg-[#111318] p-5 lg:col-span-5"
        >
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 border-b border-[#242934] pb-3">
              <KeyRound className="h-4 w-4 text-[#E32935]" />
              <div>
                <h2 className="text-sm font-semibold text-[#F5F6F8]">Account &amp; Security</h2>
                <p className="text-xs text-[#8A93A2]">
                  {currentUser.name} ({currentUser.roleLabel}) · {currentUser.email}
                </p>
              </div>
            </div>

            {pwError && (
              <div className="flex items-center gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 p-2.5 text-xs text-[#F05252]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{pwError}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs text-[#A4AAB5]">Current Password</label>
              <input
                type="password"
                required
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#A4AAB5]">
                New Password (min 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                className="h-9 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs text-[#F5F6F8]"
              />
            </div>
          </div>

          <div className="flex justify-end border-t border-[#242934] pt-3">
            <button
              type="submit"
              disabled={pwSaving}
              className="h-9 rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
            >
              {pwSaving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
