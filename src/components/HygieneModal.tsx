import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { CleaningStats } from '../types/dashboard';

interface HygieneModalProps {
  open: boolean;
  onClose: () => void;
  stats: CleaningStats;
  isLiveMode: boolean;
}

export const HygieneModal: React.FC<HygieneModalProps> = ({
  open,
  onClose,
  stats,
  isLiveMode,
}) => {
  if (!open) return null;

  const metrics = [
    { label: 'Raw Input Rows', value: stats.totalRawRows },
    { label: 'Valid Cleaned Orders', value: stats.validRows },
    { label: 'Duplicates Deduplicated', value: stats.duplicatesRemoved },
    { label: 'Blank Rows Discarded', value: stats.blanksDiscarded },
    { label: 'Invalid Dates Removed', value: stats.invalidDatesRemoved },
    { label: 'Formatted Fields Normalized', value: stats.normalizedFields },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hygiene-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="hygiene-modal-title" className="text-base font-bold text-gray-900">
                In-Browser Data Cleaning Audit
              </h2>
              <p className="text-xs text-gray-500">
                Source: {isLiveMode ? 'Live Google Sheet Feed' : 'Built-In Sample Dataset'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-gray-100 bg-gray-50/80 p-3"
            >
              <div className="text-[11px] font-medium text-gray-500">{m.label}</div>
              <div className="mt-1 text-lg font-bold text-gray-900 tabular-nums">
                {m.value.toLocaleString('en-US')}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-red-100 bg-[#FEF2F2]/60 p-3.5 text-xs text-gray-700 space-y-1.5 leading-relaxed">
          <div className="font-semibold text-[#DC2626]">Deterministic Pipeline Rules</div>
          <p>
            1. Trims string whitespace, discards rows missing both Order ID and Revenue, and normalizes missing categories to &quot;Unspecified&quot;.
          </p>
          <p>
            2. Normalizes Order Date values into strict <code className="font-mono-tabular">YYYY-MM-DD</code> UTC timestamps.
          </p>
          <p>
            3. Strips <code className="font-mono-tabular">$</code>, <code className="font-mono-tabular">,</code>, and <code className="font-mono-tabular">%</code> symbols from numeric columns and deduplicates by Order ID keeping the latest/most complete record.
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C1C] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
