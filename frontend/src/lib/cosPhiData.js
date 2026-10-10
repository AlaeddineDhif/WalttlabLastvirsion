/**
 * Suivi de dépassement (Cos φ) — SIMULATED dataset, full year 2026.
 *
 * Same contract as `puissanceData.js`: the seeded generator, the derived event
 * register and the chart props living beside the data rather than in the view, so
 * the KPI strip, the curve and the Alertes sub-module cannot disagree.
 *
 * The breach direction is mirrored. A power demand crosses Ps by going ABOVE it,
 * so that dataset filters on `peakKva > ps` and highlights `highlightAbove`. A
 * power factor crosses its floor by going BELOW it, so this one filters on
 * `cosPhi < threshold` and highlights `highlightBelow`. The threshold itself is
 * the 0.80 the STEG contract grants for free; everything under it is reactive
 * energy that the grid has to supply and that the site is billed for.
 *
 * The scenario is designed, not random: five dips are placed at plausible
 * industrial causes, and every other day is held clear of the floor. The count of
 * breaches is therefore a property of the scenario rather than of the seed, and it
 * is read back off the finished series so the chart and the register always agree.
 */
import { round1, round2, seeded } from './seeded';

export const SIMULATED = true;
export const SIMULATION_NOTE =
  'Jeu de données simulé — le facteur de puissance est généré, aucun relevé de cos φ réel n’est branché.';

/** The free floor of the contract: below 0.80, reactive energy becomes billable. */
export const THRESHOLD = 0.8;

/**
 * Contract figures. The prime and the penalty rate are the same ones the backend
 * tariff engine uses (`backend/src/config.js`), so this view cannot contradict
 * `TariffAudit` later.
 *
 * `reactiveRatePerKvarh` has no backend counterpart: the STEG engine in
 * `backend/src/steg.js` prices the subscription prime and the power overrun only.
 * The reactive rate below is therefore a documented assumption of this view, not a
 * value read from the tariff, and it is labelled as simulated everywhere it shows.
 */
export const CONTRACT = {
  threshold: THRESHOLD,
  primeRatePerKvaPerMonth: 8.4,
  penaltyRatePerKvaPerMonth: 12.5,
  reactiveRatePerKvarh: 0.05,
  currency: 'DT'
};

/** Hard bounds of the plotted axis. The dips reach 0.72, so 0.70 leaves a floor of headroom. */
export const AXIS = { min: 0.7, max: 1 };

export const PERIOD = {
  label: 'Année 2026',
  year: 2026,
  days: 365,
  from: '2026-01-01',
  to: '2026-12-31'
};

const MONTH_SHORT = ['janv.', 'févr.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTH_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Under this the breach is billed on the whole excess, not only warned about. */
export const CRITICAL_THRESHOLD = 0.75;

/**
 * The five dips the year is built around. Each is an industrial cause rather than
 * an arbitrary spike: inductive plant running light or a bank of capacitors out
 * of service both pull the power factor down the same way.
 */
const DESIGNED_DIPS = [
  {
    date: '2026-01-14',
    cosPhi: 0.742,
    hour: 22,
    activeKwa: 41.2,
    hours: 6,
    cause: 'Reprise de nuit : éclairage et roulement à vide, charge fortement inductive'
  },
  {
    date: '2026-03-27',
    cosPhi: 0.768,
    hour: 6,
    activeKwa: 33.8,
    hours: 4,
    cause: 'Démarrage décalé des variateurs, moteurs de la ligne à vide'
  },
  {
    date: '2026-06-11',
    cosPhi: 0.725,
    hour: 15,
    activeKwa: 96.5,
    hours: 7,
    cause: 'Canicule : groupes de froid et production en même heure, compensation saturée'
  },
  {
    date: '2026-08-05',
    cosPhi: 0.781,
    hour: 13,
    activeKwa: 78.3,
    hours: 3,
    cause: 'Banc de compensation réactif désengagé pour maintenance préventive'
  },
  {
    date: '2026-11-21',
    cosPhi: 0.754,
    hour: 18,
    activeKwa: 52.6,
    hours: 5,
    cause: 'Reprise après arrêt prolongé : charges déséquilibrées sur le départ atelier'
  }
];

/** tan(φ) at the contract floor: the reactive power the free band already allows. */
const TAN_AT_THRESHOLD = Math.tan(Math.acos(THRESHOLD));

const BASE = 0.936;
const NOISE = 0.026;
const SEASONAL = 0.022;

/** Sunday first: matches Date#getDay(). A light day loads the caps harder. */
const WEEKDAY_FACTOR = [0.94, 1.0, 1.005, 1.008, 1.004, 0.998, 0.96];

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

function isoOf(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Reactive power in kvar for an active load at a given power factor. */
export function reactiveKvar(activeKwa, cosPhi) {
  if (!(cosPhi > 0)) return null;
  return round1(activeKwa * Math.tan(Math.acos(cosPhi)));
}

/**
 * Reactive energy actually billed. Only the part above the 0.80 floor is charged,
 * which is the same idea as the free kVA tolerance in the puissance module: the
 * contract allows a band, and the site pays for what leaves it.
 */
export function billableKvarh(activeKwa, cosPhi, hours) {
  if (!(cosPhi > 0)) return null;
  const excess = Math.tan(Math.acos(cosPhi)) - TAN_AT_THRESHOLD;
  if (excess <= 0) return 0;
  return round1(activeKwa * excess * hours);
}

function buildDaily() {
  const rand = seeded(20260805);
  const rows = [];

  for (let offset = 0; offset < PERIOD.days; offset++) {
    const date = new Date(PERIOD.year, 0, 1 + offset);
    const month = date.getMonth();
    const dow = date.getDay();
    const iso = isoOf(date);
    const designed = DESIGNED_DIPS.find((d) => d.date === iso);

    // The chiller plant is inductive, so summer costs power factor rather than
    // earning it: the seasonal term deepens towards July and August.
    const seasonal = SEASONAL * Math.cos((month / 12) * 2 * Math.PI);
    const value = (BASE - seasonal + (rand() - 0.5) * 2 * NOISE) * WEEKDAY_FACTOR[dow];

    rows.push({
      key: `jour-${iso}`,
      date: iso,
      day: date.getDate(),
      month,
      weekday: WEEKDAY_LONG[dow],
      label: `${String(date.getDate()).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
      hour: designed ? designed.hour : 10 + Math.floor(rand() * 8),
      cause: designed ? designed.cause : null,
      rawCosPhi: designed ? designed.cosPhi : value,
      rawActiveKwa: designed
        ? designed.activeKwa
        : round1((78 + (rand() - 0.5) * 26) * WEEKDAY_FACTOR[dow])
    });
  }

  /*
   * Hold every ordinary day clear of the floor. Without this the breach count
   * would be a property of the seed, and the Alertes sub-module would inherit
   * whatever the noise happened to produce.
   *
   * The shift applies to ordinary days ONLY: applying it to the designed dips as
   * well would rescale the very events that give the year its shape, and push some
   * of them back over the floor. The guarantee has to hold for any base level.
   */
  const floor = THRESHOLD + 0.006;
  const lowest = rows.reduce((m, r) => (r.cause ? m : Math.min(m, r.rawCosPhi)), Infinity);
  const shift = Math.max(0, floor - lowest);

  return rows.map((r) => {
    const cosPhi = round3(r.cause ? r.rawCosPhi : r.rawCosPhi + shift);
    return {
      key: r.key,
      date: r.date,
      day: r.day,
      month: r.month,
      weekday: r.weekday,
      label: r.label,
      hour: r.hour,
      cause: r.cause,
      cosPhi,
      activeKwa: r.rawActiveKwa,
      reactiveKvar: reactiveKvar(r.rawActiveKwa, cosPhi)
    };
  });
}

export const DAILY = buildDaily();

export const MONTHLY = MONTH_SHORT.map((label, month) => {
  const rows = DAILY.filter((d) => d.month === month);
  return {
    key: `mois-${month + 1}`,
    label,
    longLabel: `${MONTH_LONG[month]} ${PERIOD.year}`,
    month,
    days: rows.length,
    minCosPhi: round3(Math.min(...rows.map((d) => d.cosPhi))),
    averageCosPhi: round3(rows.reduce((s, d) => s + d.cosPhi, 0) / rows.length),
    breaches: rows.filter((d) => d.cosPhi < CONTRACT.threshold).length
  };
}).map((m) => ({ ...m, breached: m.breaches > 0 }));

/**
 * The breach register, derived from the finished series. `cp-alertes` reads this
 * same list, so an alert can never be filed for a dip the chart does not show
 * under the line, or missed for one it does.
 */
export const BREACH_EVENTS = DAILY.filter((d) => d.cosPhi < CONTRACT.threshold)
  .map((d) => {
    const billable = billableKvarh(d.activeKwa, d.cosPhi, 1);
    return {
      id: `cp-depassement-${d.date}`,
      date: d.date,
      dateLabel: `${d.day === 1 ? '1er' : d.day} ${MONTH_LONG[d.month]} ${PERIOD.year}`,
      weekday: d.weekday,
      hour: d.hour,
      timeLabel: `${String(d.hour).padStart(2, '0')}h00`,
      cause: d.cause,
      cosPhi: d.cosPhi,
      threshold: CONTRACT.threshold,
      // How far under the floor the day fell: the number an operator acts on.
      deficit: round3(CONTRACT.threshold - d.cosPhi),
      activeKwa: d.activeKwa,
      reactiveKvar: reactiveKvar(d.activeKwa, d.cosPhi),
      // Billable reactive power, already net of the 0.80 free band.
      billableKvar: billable,
      // One hour of the dip, the unit the tariff is priced in.
      billableKvarh: billable,
      penaltyDT: round2(billable * CONTRACT.reactiveRatePerKvarh),
      severity: d.cosPhi < CRITICAL_THRESHOLD ? 'critical' : 'warning'
    };
  })
  .sort((a, b) => (a.date < b.date ? -1 : 1));

export const BREACH_COUNT = BREACH_EVENTS.length;

/** Aggregates for the Alertes sub-module, kept beside the register. */
export const ALERT_SUMMARY = {
  total: BREACH_EVENTS.length,
  critical: BREACH_EVENTS.filter((e) => e.severity === 'critical').length,
  warning: BREACH_EVENTS.filter((e) => e.severity === 'warning').length,
  billableKvarh: round1(BREACH_EVENTS.reduce((s, e) => s + e.billableKvarh, 0)),
  penaltyDT: round2(BREACH_EVENTS.reduce((s, e) => s + e.penaltyDT, 0)),
  worst: BREACH_EVENTS.reduce((a, b) => (!a || b.cosPhi < a.cosPhi ? b : a), null)
};

export const MIN_COSPHI = DAILY.reduce((a, b) => (b.cosPhi < a.cosPhi ? b : a));
export const AVG_COSPHI = round3(DAILY.reduce((s, d) => s + d.cosPhi, 0) / DAILY.length);

/** Total hours the site spent under the floor across the simulated year. */
export const HOURS_BELOW = BREACH_EVENTS.reduce((s, e) => s + e.hours, 0);

export const GRANULARITIES = [
  { key: 'mois', label: 'Mois', hint: 'le cos φ minimal du mois', points: MONTHLY },
  { key: 'jour', label: 'Jour', hint: 'le cos φ du jour', points: DAILY }
];

export const DEFAULT_GRANULARITY = 'jour';

export function granularity(key) {
  return GRANULARITIES.find((g) => g.key === key) || GRANULARITIES[0];
}

/**
 * The chart contract. The floor travels with the series and the axis is pinned, so
 * the 0.80 line cannot end up off-screen and the 0.70 → 1.00 band stays put
 * between two renderings of the same period.
 */
export function chartProps(key = DEFAULT_GRANULARITY) {
  const g = granularity(key);
  const isMonth = g.key === 'mois';
  return {
    granularity: g.key,
    points: g.points,
    labels: g.points.map((p) => p.label),
    values: g.points.map((p) => (isMonth ? p.minCosPhi : p.cosPhi)),
    unit: 'cos φ',
    reference: CONTRACT.threshold,
    referenceColor: '#dc2626',
    referenceLabel: `Seuil contractuel ${fmtThreshold(CONTRACT.threshold)}`,
    highlightBelow: CONTRACT.threshold,
    yMin: AXIS.min,
    yMax: AXIS.max
  };
}

function fmtThreshold(v) {
  return v.toFixed(2);
}

export const KPIS = [
  {
    key: 'threshold',
    label: 'Seuil minimal contractuel',
    value: CONTRACT.threshold,
    unit: 'cos φ',
    decimals: 2,
    sub: 'cos φ ≥ 0.80 facturé sans réactif',
    accent: '#0f172a'
  },
  {
    key: 'min',
    label: 'Cos φ minimal enregistré',
    value: MIN_COSPHI.cosPhi,
    unit: 'cos φ',
    decimals: 3,
    sub: `${MIN_COSPHI.label} · ${String(MIN_COSPHI.hour).padStart(2, '0')}h00`,
    accent: '#dc2626',
    tone: 'critical'
  },
  {
    key: 'count',
    label: 'Nombre de franchissements',
    value: BREACH_COUNT,
    unit: 'franchissements',
    decimals: 0,
    sub: `sur ${PERIOD.days} jours · ${MONTHLY.filter((m) => m.breached).length} mois`,
    accent: '#d97706',
    tone: 'critical'
  }
];
