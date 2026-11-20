"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, AlertCircle } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "activate">("signin");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [memberCode, setMemberCode] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to sign in.");
        return;
      }
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberCode,
          emailOrPhone,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to activate member account.");
        return;
      }
      router.push("/portal");
      router.refresh();
    } catch {
      setError("Network error while activating account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090A0D] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[#242934] bg-[#111318] p-6 animate-panel-enter">
        <div className="mb-5 flex flex-col gap-2">
          <BrandMark />
          <div className="mt-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">
              Sign In to IRONHUB
            </h1>
            <p className="mt-0.5 text-xs text-[#A4AAB5]">
              Enter your email or Member ID to access your dashboard.
            </p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[#242934] bg-[#171A21] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={cn(
              "rounded-md py-1.5 text-xs font-medium transition-colors",
              mode === "signin" ? "bg-[#E32935] text-white" : "text-[#A4AAB5] hover:text-white"
            )}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("activate");
              setError(null);
            }}
            className={cn(
              "rounded-md py-1.5 text-xs font-medium transition-colors",
              mode === "activate" ? "bg-[#E32935] text-white" : "text-[#A4AAB5] hover:text-white"
            )}
          >
            New Member Setup
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 px-3 py-2 text-xs text-[#F05252]"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <div>
              <label htmlFor="identifier" className="mb-1 block text-xs font-medium text-[#A4AAB5]">
                Email or Member ID
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A2]" />
                <input
                  id="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="email@ironhub.ph or IH-1001"
                  className="h-10 w-full rounded-lg border border-[#242934] bg-[#171A21] pl-9 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-medium text-[#A4AAB5]">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A2]" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-10 w-full rounded-lg border border-[#242934] bg-[#171A21] pl-9 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#8A93A2] focus-visible:border-[#E32935] focus-visible:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-10 w-full items-center justify-center rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#F13A46] disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleActivate} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A4AAB5]">
                Member ID (from front desk)
              </label>
              <input
                required
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="IH-1001"
                className="h-10 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A4AAB5]">
                Registered Email or Phone
              </label>
              <input
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="juan@ironhub.ph"
                className="h-10 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#A4AAB5]">
                Create Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Choose a password"
                className="h-10 w-full rounded-lg border border-[#242934] bg-[#171A21] px-3 text-sm text-[#F5F6F8]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-[#E32935] px-4 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-60"
            >
              {loading ? "Activating..." : "Activate Member Dashboard"}
            </button>
          </form>
        )}

        <p className="mt-5 border-t border-[#242934] pt-3.5 text-center text-[11px] text-[#8A93A2]">
          Staff and members are automatically routed to their workspace.
        </p>
      </div>
    </div>
  );
}
