import { AlertTriangle } from 'lucide-react';

/**
 * `embedded` renders the alert as a card inside a page (no full-bleed border),
 * otherwise it behaves as a full-width strip under the header. Critical only, so
 * the colour is red — never a decorative accent.
 */
export default function PenaltyBanner({ active, value, duration, embedded = false }) {
  if (!active) return null;

  if (embedded) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-md border border-red-200 bg-red-50 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-[12px] font-semibold tracking-wide text-red-700">Power factor penalty alert</p>
        </div>
        <p className="font-mono text-[11px] text-red-600">
          cos φ <span className="font-bold tabular text-red-700">{value != null ? value.toFixed(2) : '--'}</span>{' '}
          &lt; 0.85 for <span className="font-bold tabular text-red-700">{duration ?? 0}s</span>
        </p>
      </div>
    );
  }

  return (
    <div className="border-b border-red-200 bg-red-50">
      <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <p className="text-[12px] font-semibold tracking-wide text-red-700">Power factor penalty alert</p>
        </div>
        <p className="hidden font-mono text-[11px] text-red-600 sm:block">
          Cos φ <span className="font-bold tabular text-red-700">{value != null ? value.toFixed(2) : '0.00'}</span>{' '}
          &lt; 0.85 for <span className="font-bold tabular text-red-700">{duration ?? 0}s</span>
        </p>
      </div>
    </div>
  );
}
