"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { useFeedback } from "@/components/ui/feedback-modal";

export default function LoginPage() {
  const router = useRouter();
  const { showError } = useFeedback();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

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
        const msg = data.error ?? "Unable to sign in.";
        setError(msg);
        showError("Sign In Failed", msg);
        return;
      }
      router.push(data.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      const msg = "Network error while signing in.";
      setError(msg);
      showError("Connection Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#141720] px-4 py-6">
      {/* Compressed Split-Panel Login Card matching IRONHUB system */}
      <div className="animate-panel-enter flex w-full max-w-[640px] flex-col overflow-hidden rounded-[22px] border border-[#242934] bg-[#0D0F14] shadow-[0_24px_60px_-18px_rgba(0,0,0,0.75)] md:min-h-[376px] md:flex-row">
        {/* Left Athletic Brand Panel */}
        <div className="relative flex flex-col justify-between overflow-hidden p-5 md:w-[44%] md:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/sidebar-athlete.jpg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-70"
          />
          <div
            className="pointer-events-none absolute inset-0 bg-[#0D0F14]/65"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <BrandMark />
          </div>

          <div className="relative z-10 mt-6 md:my-auto">
            <h1 className="text-xl font-bold leading-[1.15] tracking-tight text-white sm:text-2xl">
              Build a Stronger
              <span className="block text-[#E32935]">Community.</span>
            </h1>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#C2C8D4]">
              Track. Manage. Grow. Unified gym operations, coaching analytics, and client QR passes.
            </p>
          </div>

          <div className="relative z-10 mt-5 hidden items-center gap-1.5 text-[10px] text-[#A4AAB5] md:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-[#E32935]" />
            <span>Admin · Trainor · Client Portal</span>
          </div>
        </div>

        {/* Right Overlapping Form Panel */}
        <div className="relative z-20 flex flex-1 flex-col justify-between bg-[#111318] p-5 md:-ml-3.5 md:rounded-l-[24px] md:border-l md:border-[#242934] md:p-6">
          <div className="flex items-center justify-end">
            <span className="text-[10px] font-medium text-[#8A93A2]">
              IronHub Fitness · PH
            </span>
          </div>

          <div className="my-auto py-2">
            <h2 className="text-base font-semibold tracking-tight text-[#F5F6F8]">Sign In</h2>
            <p className="mt-0.5 text-[11px] text-[#8A93A2]">
              Enter your email address or Member ID to access your workspace.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 px-2.5 py-2 text-[11px] text-[#F05252]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} className="mt-5 space-y-3.5">
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
                  <span>Keep session active</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-9 w-full items-center justify-center rounded-full bg-[#E32935] px-5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[#F13A46] active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>

          <div className="border-t border-[#20242D] pt-2.5 text-center text-[10px] text-[#8A93A2]">
            Need help signing in? Contact your IronHub front desk.
          </div>
        </div>
      </div>
    </div>
  );
}
