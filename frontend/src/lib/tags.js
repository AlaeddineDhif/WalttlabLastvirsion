export function tagFor(key, v) {
  if (v === null || v === undefined || !Number.isFinite(v)) {
    return { label: '--', state: 'slate' };
  }
  switch (key) {
    case 'voltage':
      return v >= 360 && v <= 440
        ? { label: 'Nominal', state: 'emerald' }
        : { label: 'Out of range', state: 'amber' };
    case 'frequency':
      return v >= 49.8 && v <= 50.2
        ? { label: '50 Hz', state: 'emerald' }
        : { label: 'Off grid', state: 'amber' };
    case 'cosPhi':
      if (v >= 0.95) return { label: 'Good', state: 'emerald' };
      if (v >= 0.85) return { label: 'Warning', state: 'amber' };
      return { label: 'Penalty', state: 'rose' };
    case 'energy':
      return { label: 'Cumulative', state: 'indigo' };
    default:
      return { label: 'Live', state: 'sky' };
  }
}

export const CHIP = {
  emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-300',
  rose: 'text-rose-700 bg-rose-50 border-rose-300',
  sky: 'text-sky-700 bg-sky-50 border-sky-200',
  indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  slate: 'text-slate-600 bg-slate-100 border-slate-300'
};

export const STATUS = {
  ok: { label: 'Sized correctly', cls: 'text-emerald-700 bg-emerald-50 border-emerald-300', dot: 'bg-emerald-500' },
  watch: { label: 'Near limit', cls: 'text-amber-700 bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
  critical: { label: 'Penalty risk', cls: 'text-rose-700 bg-rose-50 border-rose-300', dot: 'bg-rose-500' }
};