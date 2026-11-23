import React from 'react';
import { Sparkles, ShieldCheck, Infinity as InfinityIcon, X } from 'lucide-react';

export default function UpgradeModal({ isOpen, onClose, onGoToBilling, usedToday = 3, dailyLimit = 3 }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-5 text-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Daily Free Limit Reached
              </span>
              <h2 className="text-lg font-bold text-slate-900">Upgrade to InkPDF Pro</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
            aria-label="Close upgrade prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          You have used <strong className="text-slate-900">{usedToday} of {dailyLimit}</strong> free PDF operations in the last 24 hours. Unlock uninterrupted local WASM processing in ZAR.
        </p>

        <ul className="space-y-2.5 text-sm text-slate-700 bg-[#fdfbf7] p-4 rounded-xl border border-slate-200">
          <li className="flex items-center gap-2">
            <InfinityIcon className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Unlimited daily PDF edits, merges, splits, compressions & forms</span>
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>100% in-browser WASM processing & POPIA data controls</span>
          </li>
          <li className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Ad-free workspace billed in ZAR</span>
          </li>
        </ul>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl transition"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoToBilling();
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            View Pro Plans (ZAR)
          </button>
        </div>
      </div>
    </div>
  );
}