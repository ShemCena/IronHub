"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "activate">("signin");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

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
    <div className="flex min-h-screen items-center justify-center bg-[#090A0D] px-4 py-8">
      {/* Compressed Split-Panel Card inspired by reference layout, styled in IRONHUB dark system */}
      <div className="animate-panel-enter relative flex w-full max-w-[760px] flex-col overflow-hidden rounded-[26px] border border-[#242934] bg-[#0D0F14] shadow-[0_28px_70px_-20px_rgba(0,0,0,0.85)] md:min-h-[450px] md:flex-row">
        {/* Left Athletic Brand Panel */}
        <div className="relative flex flex-col justify-between overflow-hidden p-6 md:w-[45%] md:p-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/sidebar-athlete.jpg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-70"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#E32935]/30 via-[#090A0D]/75 to-[#090A0D]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#090A0D] via-[#090A0D]/40 to-transparent"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <BrandMark />
          </div>

          <div className="relative z-10 mt-8 md:my-auto">
            <h1 className="text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-[26px]">
              Build a Stronger
              <span className="block text-[#E32935]">Community.</span>
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#A4AAB5]">
              Track. Manage. Grow. Unified gym operations, attendance, and member QR passes.
            </p>
          </div>

          <div className="relative z-10 mt-6 hidden items-center gap-2 text-[11px] text-[#8A93A2] md:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-[#E32935]" />
            <span>Role-protected Staff &amp; Member Portal</span>
          </div>
        </div>

        {/* Right Overlapping Form Panel (matching reference inward curve) */}
        <div className="relative z-20 flex flex-1 flex-col justify-between bg-[#111318] p-6 md:-ml-4 md:rounded-l-[28px] md:border-l md:border-[#242934] md:p-8">
          <div className="flex items-center justify-end">
            <span className="text-[11px] font-medium text-[#8A93A2]">
              IronHub Fitness · PH
            </span>
          </div>

          <div className="my-auto py-3">
            <h2 className="text-lg font-semibold tracking-tight text-[#F5F6F8]">
              {mode === "signin" ? "Sign In" : "Activate Member Account"}
            </h2>
            <p className="mt-0.5 text-xs text-[#8A93A2]">
              {mode === "signin"
                ? "Enter your email or Member ID to access your dashboard."
                : "First-time members: set your password using your Member ID."}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-3.5 flex items-start gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 px-3 py-2 text-xs text-[#F05252]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="identifier" className="sr-only">
                    Email Address or Member ID
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Email Address or Member ID (e.g. IH-1001)"
                    className="h-9 w-full border-b border-[#292E38] bg-transparent px-0.5 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] transition-colors focus:border-[#E32935] focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="h-9 w-full border-b border-[#292E38] bg-transparent pr-8 pl-0.5 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] transition-colors focus:border-[#E32935] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[#8A93A2] hover:text-[#F5F6F8]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-[11px] text-[#8A93A2]">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-[#E32935]"
                    />
                    <span>Keep session active on this device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-full bg-[#E32935] px-5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(227,41,53,0.55)] transition-all duration-150 hover:bg-[#F13A46] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleActivate} className="mt-5 space-y-3.5">
                <div>
                  <label htmlFor="member-code" className="sr-only">
                    Member ID
                  </label>
                  <input
                    id="member-code"
                    required
                    value={memberCode}
                    onChange={(e) => setMemberCode(e.target.value)}
                    placeholder="Member ID (e.g. IH-1001)"
                    className="h-9 w-full border-b border-[#292E38] bg-transparent px-0.5 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] transition-colors focus:border-[#E32935] focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="contact-verify" className="sr-only">
                    Registered Email or Phone
                  </label>
                  <input
                    id="contact-verify"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="Registered Email or Phone"
                    className="h-9 w-full border-b border-[#292E38] bg-transparent px-0.5 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] transition-colors focus:border-[#E32935] focus:outline-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="new-password" className="sr-only">
                    Create Password
                  </label>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create Password (min 8 characters)"
                    className="h-9 w-full border-b border-[#292E38] bg-transparent pr-8 pl-0.5 text-xs text-[#F5F6F8] placeholder:text-[#8A93A2] transition-colors focus:border-[#E32935] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-[#8A93A2] hover:text-[#F5F6F8]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex h-10 w-full items-center justify-center rounded-full bg-[#E32935] px-5 text-xs font-semibold text-white shadow-[0_8px_20px_-6px_rgba(227,41,53,0.55)] transition-all duration-150 hover:bg-[#F13A46] active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? "Activating..." : "Activate Account"}
                </button>
              </form>
            )}
          </div>

          {/* Bottom Switcher Footer matching reference */}
          <div className="border-t border-[#20242D] pt-3 text-center text-[11px] text-[#8A93A2]">
            {mode === "signin" ? (
              <>
                First-time gym member?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("activate");
                    setError(null);
                  }}
                  className="font-semibold text-[#E32935] hover:text-[#F13A46] hover:underline"
                >
                  Activate account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="font-semibold text-[#E32935] hover:text-[#F13A46] hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
