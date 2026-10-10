/**
 * Production & Consommation — SIMULATED dataset.
 *
 * Fabricated on purpose, like `distributionData`, and marked as such wherever it
 * is rendered. Two properties matter beyond looking plausible:
 *
 * 1. It reconciles with the Distribution énergétique module. Both describe the
 *    same month, so the daily energy here sums to exactly the same total. Two
 *    different "monthly" figures inside one app would be the first thing a
 *    reviewer caught.
 * 2. Energy is not a fixed ratio of output. A real workshop carries a base load
 *    (ventilation, compressors, lighting) that runs whatever the line does, so
 *    the series is modelled as `base + k x production + noise`. The visible
 *    consequence is that SEC drifts on light days instead of being flat, which is
 *    precisely the signal this module exists to show.
 *
 * The series is generated from a fixed seed: deterministic, so the dashboard looks
 * identical on every reload and in a screenshot taken during a defence.
 */
import { TOTAL_KWH as DISTRIBUTION_TOTAL_KWH } from './distributionData';
import { seeded } from './seeded';

export const SIMULATED = true;
export const SIMULATION_NOTE =
  'Jeu de données simulé — les volumes et la consommation sont générés, aucun compteur n’est branché.';

export const PERIOD = { label: 'Mars 2026', year: 2026, month: 2, days: 31, hours: 744 };

/** Rounded so the SEC reads as a clean figure on the KPI strip. */
const TARGET_PRODUCTION = 58400;

const WEEKDAY_SHORT = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

function buildSeries() {
  const rand = seeded(20260301);
  const rows = [];

  for (let day = 1; day <= PERIOD.days; day++) {
    const dow = new Date(PERIOD.year, PERIOD.month, day).getDay();
    const sunday = dow === 0;
    const saturday = dow === 6;

    const output = (sunday ? 980 : saturday ? 1620 : 2450) * (0.9 + rand() * 0.2);
    const energy = 620 + output * 0.72 + rand() * 180;

    rows.push({ day, dow, output, energy });
  }
  return rows;
}

/**
 * Rescale a raw series to a target total, then push the integer rounding residue
 * onto its heaviest day so the column sums to the target exactly.
 */
function reconcile(rows, field, target) {
  const rawTotal = rows.reduce((s, r) => s + r[field], 0);
  const factor = target / rawTotal;
  const scaled = rows.map((r) => Math.round(r[field] * factor));
  const residual = target - scaled.reduce((s, v) => s + v, 0);
  if (residual !== 0) {
    const heaviest = scaled.indexOf(Math.max(...scaled));
    scaled[heaviest] += residual;
  }
  return scaled;
}

const raw = buildSeries();
const outputs = reconcile(raw, 'output', TARGET_PRODUCTION);
const energies = reconcile(raw, 'energy', DISTRIBUTION_TOTAL_KWH);

export const SERIES = raw.map((r, i) => ({
  day: r.day,
  weekday: WEEKDAY_SHORT[r.dow],
  label: `${WEEKDAY_SHORT[r.dow]} ${r.day}`,
  production: outputs[i],
  energy: energies[i],
  sec: energies[i] / outputs[i]
}));

export const TOTAL_PRODUCTION = outputs.reduce((s, v) => s + v, 0);
export const TOTAL_ENERGY = energies.reduce((s, v) => s + v, 0);

/** Specific Energy Consumption — the module's headline indicator. */
export const SEC_GLOBAL = TOTAL_ENERGY / TOTAL_PRODUCTION;

export const PEAK_PRODUCTION = SERIES.reduce((a, b) => (b.production > a.production ? b : a));
export const WORST_SEC = SERIES.reduce((a, b) => (b.sec > a.sec ? b : a));
export const BEST_SEC = SERIES.reduce((a, b) => (b.sec < a.sec ? b : a));

export const KPIS = [
  {
    key: 'sec',
    label: 'SEC global',
    value: SEC_GLOBAL,
    unit: 'kWh/pc',
    sub: `moyenne ${PERIOD.days} jours`,
    accent: '#059669',
    primary: true
  },
  {
    key: 'production',
    label: 'Production totale',
    value: TOTAL_PRODUCTION,
    unit: 'pcs',
    sub: `${PERIOD.label} · ${SERIES.length} jours`,
    accent: '#0f172a'
  },
  {
    key: 'energy',
    label: 'Énergie totale',
    value: TOTAL_ENERGY,
    unit: 'kWh',
    sub: `${PERIOD.hours} h · même total que Distribution`,
    accent: '#0d9488'
  },
  {
    key: 'worstSec',
    label: 'SEC le plus élevé',
    value: WORST_SEC.sec,
    unit: 'kWh/pc',
    sub: `${WORST_SEC.label} · ${WORST_SEC.production} pcs`,
    accent: '#d97706'
  }
];
