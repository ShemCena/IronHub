"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertCircle } from "lucide-react";
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
    <div className="flex min-h-screen items-center justify-center bg-[#090A0D] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[#292E38] bg-[#111318] p-8">
        <div className="mb-8 flex flex-col gap-3">
          <BrandMark />
          <div className="mt-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#F5F6F8]">
              Staff Sign In
            </h1>
            <p className="mt-1 text-sm text-[#A4AAB5]">
              Access member records, QR check-in, and over-the-counter payments.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#F05252]/30 bg-[#F05252]/10 px-3.5 py-2.5 text-sm text-[#F05252]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-medium text-[#A4AAB5]"
            >
              Staff Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747C89]" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@ironhub.ph"
                className="h-11 w-full rounded-lg border border-[#292E38] bg-[#171A21] pl-10 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#747C89] focus:border-[#E32935] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-[#A4AAB5]"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#747C89]" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="h-11 w-full rounded-lg border border-[#292E38] bg-[#171A21] pl-10 pr-3 text-sm text-[#F5F6F8] placeholder:text-[#747C89] focus:border-[#E32935] focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-[#E32935] px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#F13A46] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In to Workspace"}
          </button>
        </form>

        <p className="mt-6 border-t border-[#292E38] pt-4 text-xs text-[#747C89]">
          Authorized gym personnel only. All actions are recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
