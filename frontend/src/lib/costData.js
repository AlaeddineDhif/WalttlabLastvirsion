/**
 * Ratio coût — SIMULATED dataset.
 *
 * Nothing here is invented independently. Quantities and energy are imported from
 * `productionData`, which already reconciles with `distributionData`, and the money
 * is that energy multiplied by a declared rate. So the three Consommation views
 * always describe the same month, and the cost view cannot drift away from the two
 * energy views.
 *
 * One rule is load-bearing: an aggregate is a ratio of sums, never a mean of
 * ratios. A week costs `sum(cost) / sum(production)`; averaging the seven daily
 * unit costs would weight a Sunday that produced 980 pcs exactly like a Wednesday
 * that produced 2400, and quietly answer a different question.
 */
import { PERIOD, SERIES, TOTAL_ENERGY, TOTAL_PRODUCTION } from './productionData';
import { BRAND_NAVY } from './brand';

export const SIMULATED = true;
export const SIMULATION_NOTE =
  'Jeu de données simulé — la consommation provient du module Production & Consommation et le tarif appliqué est un paramètre de démonstration, aucun compteur ni facturation n’est branché.';

export const TARIFF = {
  provider: 'STEG',
  /**
   * Flat industrial energy rate, identical to ENERGY_RATE in
   * ShiftEnergyCorrelation.jsx: the same kWh must not cost two different amounts
   * depending on which view is open. Keep the two in step.
   *
   * Energy only. The contracted-power subscription and its overdraw penalties are
   * not part of a cost-per-unit figure, so they stay out of this module rather
   * than being mixed in and double counted.
   */
  energyRate: 0.25,
  unit: 'TND/kWh',
  basis: 'Tarif énergie HT'
};

const RATE = TARIFF.energyRate;

export const DAILY = SERIES.map((d) => ({
  key: `jour-${d.day}`,
  day: d.day,
  label: d.label,
  detail: null,
  production: d.production,
  energy: d.energy,
  cost: d.energy * RATE,
  unitCost: (d.energy * RATE) / d.production
}));

export { PERIOD, TOTAL_ENERGY, TOTAL_PRODUCTION };

export const TOTAL_COST = DAILY.reduce((s, d) => s + d.cost, 0);

/** The headline ratio: the whole month's bill over the whole month's output. */
export const UNIT_COST = TOTAL_COST / TOTAL_PRODUCTION;

function rollup(key, label, detail, rows) {
  const production = rows.reduce((s, r) => s + r.production, 0);
  const energy = rows.reduce((s, r) => s + r.energy, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  return {
    key,
    label,
    detail,
    days: rows.length,
    production,
    energy,
    cost,
    // Ratio of sums, deliberately: see the note at the top of this file.
    unitCost: cost / production
  };
}

function chunk(rows, size) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) {
    const slice = rows.slice(i, i + size);
    out.push(
      rollup(
        `semaine-${out.length + 1}`,
        `sem. ${out.length + 1}`,
        `jours ${slice[0].day}–${slice[slice.length - 1].day}`,
        slice
      )
    );
  }
  return out;
}

const WEEKLY = chunk(DAILY, 7);

const MONTHLY = [
  rollup('mois', PERIOD.label, `jours ${DAILY[0].day}–${DAILY[DAILY.length - 1].day}`, DAILY)
];

export const GRANULARITIES = [
  { key: 'jour', label: 'Jour', hint: 'un point par jour', points: DAILY },
  { key: 'semaine', label: 'Semaine', hint: 'un point par semaine', points: WEEKLY },
  { key: 'mois', label: 'Mois', hint: 'moyenne du mois', points: MONTHLY }
];

export const DEFAULT_GRANULARITY = 'jour';

export function granularity(key) {
  return GRANULARITIES.find((g) => g.key === key) || GRANULARITIES[0];
}

export const BEST = DAILY.reduce((a, b) => (b.unitCost < a.unitCost ? b : a));
export const WORST = DAILY.reduce((a, b) => (b.unitCost > a.unitCost ? b : a));

/** Relative gap between the cheapest and the dearest day, for the footer. */
export const SPREAD = WORST.unitCost / BEST.unitCost - 1;

/** Same decimal convention as `fmt` (period separator), rendered next to the rate. */
function rateLabel() {
  return `${TARIFF.energyRate.toFixed(3)} ${TARIFF.unit}`;
}

export const KPIS = [
  {
    key: 'production',
    label: 'Production totale',
    value: TOTAL_PRODUCTION,
    unit: 'pcs',
    decimals: 0,
    sub: `${PERIOD.label} · ${DAILY.length} jours`,
    accent: '#0f172a'
  },
  {
    key: 'cost',
    label: 'Coût énergétique total',
    value: TOTAL_COST,
    unit: 'TND',
    decimals: 2,
    sub: `${rateLabel()} · ${PERIOD.hours} h`,
    accent: BRAND_NAVY
  },
  {
    key: 'unitCost',
    label: 'Coût énergétique par unité',
    value: UNIT_COST,
    unit: 'TND/pc',
    decimals: 3,
    sub: `moyenne ${DAILY.length} jours`,
    accent: '#16A34A',
    primary: true
  }
];
