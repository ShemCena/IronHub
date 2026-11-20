"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: number;
  tone: "success" | "error";
  title: string;
  message: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
}

interface FeedbackContextValue {
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  confirmAction: (opts: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
  }) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone: "success" | "error", title: string, message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev.slice(-2), { id, tone, title, message }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast]
  );

  const showSuccess = useCallback(
    (title: string, message: string) => pushToast("success", title, message),
    [pushToast]
  );

  const showError = useCallback(
    (title: string, message: string) => pushToast("error", title, message),
    [pushToast]
  );

  const closeConfirm = useCallback(() => {
    if (busy) return;
    setConfirm((prev) => ({ ...prev, open: false }));
  }, [busy]);

  useEffect(() => {
    if (!confirm.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm.open, closeConfirm]);

  const confirmAction = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      onConfirm: () => void | Promise<void>;
    }) => {
      setConfirm({
        open: true,
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Confirm",
        cancelLabel: opts.cancelLabel ?? "Cancel",
        onConfirm: opts.onConfirm,
      });
    },
    []
  );

  async function handleConfirm() {
    if (!confirm.onConfirm) {
      closeConfirm();
      return;
    }
    setBusy(true);
    try {
      await confirm.onConfirm();
      setConfirm((prev) => ({ ...prev, open: false }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FeedbackContext.Provider value={{ showSuccess, showError, confirmAction }}>
      {children}

      {/* Non-blocking Floating Success / Error Pop-Ups (bottom-right, never occupies screen) */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-[330px] flex-col gap-2 px-2 sm:px-0"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-panel-enter pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-[#111318]/95 p-3 shadow-[0_14px_36px_-10px_rgba(0,0,0,0.85)] backdrop-blur-md",
              t.tone === "success"
                ? "border-[#2BCB83]/35"
                : "border-[#F05252]/40"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                t.tone === "success"
                  ? "bg-[#2BCB83]/15 text-[#2BCB83]"
                  : "bg-[#F05252]/15 text-[#F05252]"
              )}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#F5F6F8]">{t.title}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#A4AAB5]">{t.message}</p>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-[#8A93A2] hover:bg-[#171A21] hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Compact Confirmation Pop-Up (destructive actions only) */}
      {confirm.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={closeConfirm}
        >
          <div
            className="animate-panel-enter relative w-full max-w-[340px] rounded-2xl border border-[#242934] bg-[#111318] p-4 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2B84B]/15 text-[#F2B84B] ring-1 ring-[#F2B84B]/35">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="confirm-modal-title"
                  className="text-sm font-semibold tracking-tight text-[#F5F6F8]"
                >
                  {confirm.title}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[#A4AAB5]">{confirm.message}</p>
              </div>
              <button
                type="button"
                onClick={closeConfirm}
                disabled={busy}
                aria-label="Close"
                className="rounded p-0.5 text-[#8A93A2] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={closeConfirm}
                className="h-8 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs font-medium text-[#A4AAB5] hover:bg-[#20242D] hover:text-white disabled:opacity-50"
              >
                {confirm.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirm}
                className="h-8 rounded-lg bg-[#E32935] px-3.5 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
              >
                {busy ? "Processing..." : confirm.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
