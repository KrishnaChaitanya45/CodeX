import React from "react";

interface MobileSupportModalProps {
  isOpen?: boolean;
  title?: string;
  subtitle?: string;
  message?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  onClose?: () => void;
  className?: string;
}

export function MobileSupportModal({
  isOpen = true,
  title = "Mobile support is on the way",
  subtitle = "We’re crafting a touch-friendly experience.",
  message = "For now, we recommend using a desktop or laptop for the best results.",
  primaryLabel = "Go back home",
  primaryHref = "/",
  secondaryLabel = "Browse projects",
  secondaryHref = "/projects",
  onClose,
  className = "",
}: MobileSupportModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 px-6 text-white md:hidden ${className}`}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
              <span className="text-lg">📱</span>
            </div>
            <div>
              <p className="text-lg font-semibold">{title}</p>
              <p className="text-sm text-slate-300">{subtitle}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-sm"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
        <div className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
          {message}
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <a
            href={secondaryHref}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
          >
            {secondaryLabel}
          </a>
          <a
            href={primaryHref}
            className="rounded-xl border border-white/10 px-4 py-2 text-center text-sm font-semibold text-white"
          >
            {primaryLabel}
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2 text-center text-sm font-semibold text-slate-300"
            >
              Not now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
