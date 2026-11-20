"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalTone = "success" | "error" | "confirm";

interface ModalState {
  open: boolean;
  tone: ModalTone;
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
  const [modal, setModal] = useState<ModalState>({
    open: false,
    tone: "success",
    title: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    if (busy) return;
    setModal((prev) => ({ ...prev, open: false }));
  }, [busy]);

  useEffect(() => {
    if (!modal.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal.open, close]);

  const showSuccess = useCallback((title: string, message: string) => {
    setModal({ open: true, tone: "success", title, message });
  }, []);

  const showError = useCallback((title: string, message: string) => {
    setModal({ open: true, tone: "error", title, message });
  }, []);

  const confirmAction = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      onConfirm: () => void | Promise<void>;
    }) => {
      setModal({
        open: true,
        tone: "confirm",
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
    if (!modal.onConfirm) {
      close();
      return;
    }
    setBusy(true);
    try {
      await modal.onConfirm();
      setModal((prev) => ({ ...prev, open: false }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FeedbackContext.Provider value={{ showSuccess, showError, confirmAction }}>
      {children}

      {modal.open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-modal-title"
          onClick={close}
        >
          <div
            className="animate-panel-enter relative w-full max-w-[360px] rounded-2xl border border-[#242934] bg-[#111318] p-5 text-center shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label="Close modal"
              className="absolute right-3.5 top-3.5 rounded-md p-1 text-[#8A93A2] hover:bg-[#171A21] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              {modal.tone === "success" && (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2BCB83]/15 text-[#2BCB83] ring-1 ring-[#2BCB83]/40">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              )}
              {modal.tone === "error" && (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F05252]/15 text-[#F05252] ring-1 ring-[#F05252]/40">
                  <XCircle className="h-6 w-6" />
                </div>
              )}
              {modal.tone === "confirm" && (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2B84B]/15 text-[#F2B84B] ring-1 ring-[#F2B84B]/40">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              )}
            </div>

            <h2
              id="feedback-modal-title"
              className="mt-3 text-sm font-semibold tracking-tight text-[#F5F6F8]"
            >
              {modal.title}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#A4AAB5]">{modal.message}</p>

            <div className="mt-5 flex items-center justify-center gap-2">
              {modal.tone === "confirm" ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={close}
                    className="h-8.5 flex-1 rounded-lg border border-[#242934] bg-[#171A21] px-3 text-xs font-medium text-[#A4AAB5] hover:bg-[#20242D] hover:text-white disabled:opacity-50"
                  >
                    {modal.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleConfirm}
                    className="h-8.5 flex-1 rounded-lg bg-[#E32935] px-3 text-xs font-semibold text-white hover:bg-[#F13A46] disabled:opacity-50"
                  >
                    {busy ? "Processing..." : modal.confirmLabel ?? "Confirm"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className={cn(
                    "h-8.5 w-full rounded-lg px-4 text-xs font-semibold text-white transition-colors",
                    modal.tone === "success"
                      ? "bg-[#2BCB83] text-[#090A0D] hover:bg-[#34D98E]"
                      : "bg-[#E32935] hover:bg-[#F13A46]"
                  )}
                >
                  {modal.tone === "success" ? "Done" : "Dismiss"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
