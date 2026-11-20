"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle, QrCode, ArrowRight } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to sign in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090A0D] px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-[#242934] bg-[#111318] p-6 animate-panel-enter">
        <div className="mb-6 flex flex-col gap-2.5">
          <BrandMark />
          <div className="mt-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#F5F6F8]">
              Staff Workspace Sign In
            </h1>
            <p className="mt-0.5 text-xs text-[#A4AAB5]">
              Owner, Admin, Front Desk, and Trainer access.
            </p>
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-[#A4AAB5]">
              Staff Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A2]" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@ironhub.ph"
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
            {loading ? "Signing in..." : "Sign In to Workspace"}
          </button>
        </form>

        <div className="mt-5 border-t border-[#242934] pt-4">
          <Link
            href="/portal/login"
            className="group flex items-center justify-between rounded-xl border border-[#242934] bg-[#171A21] px-3.5 py-2.5 text-xs transition-colors hover:border-[#E32935]/40 hover:bg-[#1D2029]"
          >
            <span className="flex items-center gap-2 font-medium text-[#F5F6F8]">
              <QrCode className="h-4 w-4 text-[#E32935]" />
              Gym Member? Generate Your QR Pass
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-[#8A93A2] transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
