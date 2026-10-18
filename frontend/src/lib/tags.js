export function tagFor(key, v) {
  if (v === null || v === undefined || !Number.isFinite(v)) {
    return { label: '--', state: 'slate' };
  }
  switch (key) {
    case 'voltage':
      return v >= 360 && v <= 440
        ? { label: 'Nominal', state: 'energy' }
        : { label: 'Out of range', state: 'amber' };
    case 'frequency':
      return v >= 49.8 && v <= 50.2
        ? { label: '50 Hz', state: 'energy' }
        : { label: 'Off grid', state: 'amber' };
    case 'cosPhi':
      if (v >= 0.95) return { label: 'Good', state: 'energy' };
      if (v >= 0.85) return { label: 'Warning', state: 'amber' };
      return { label: 'Penalty', state: 'red' };
    case 'energy':
      return { label: 'Cumulative', state: 'info' };
    default:
      return { label: 'Live', state: 'info' };
  }
}

/**
 * Status/label palette. `energy` is green (measured energy, normal state),
 * `info` and `brand` are the blue family (analytics, selection, information),
 * `amber` warns, `red` is critical. Legacy keys (`emerald`, `sky`, `indigo`,
 * `rose`) remain as aliases so no caller has to change.
 */
export const CHIP = {
  brand: 'text-brand-700 bg-brand-50 border-brand-200',
  info: 'text-brand-700 bg-brand-50 border-brand-200',
  energy: 'text-energy-700 bg-energy-50 border-energy-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-300',
  red: 'text-red-700 bg-red-50 border-red-300',
  slate: 'text-slate-600 bg-slate-100 border-slate-300',
  // aliases
  emerald: 'text-energy-700 bg-energy-50 border-energy-200',
  sky: 'text-brand-700 bg-brand-50 border-brand-200',
  indigo: 'text-brand-700 bg-brand-50 border-brand-200',
  rose: 'text-red-700 bg-red-50 border-red-300'
};

export const STATUS = {
  ok: { label: 'Sized correctly', cls: 'text-energy-700 bg-energy-50 border-energy-300', dot: 'bg-energy-500' },
  watch: { label: 'Near limit', cls: 'text-amber-700 bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
  critical: { label: 'Penalty risk', cls: 'text-red-700 bg-red-50 border-red-300', dot: 'bg-red-500' }
};
