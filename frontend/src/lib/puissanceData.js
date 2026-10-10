/**
 * Surveillance du dépassement — SIMULATED dataset, full year 2026.
 *
 * The contract parameters are not invented: Ps, the 10 % free tolerance, the
 * subscription prime and the penalty rate are the same figures the backend tariff
 * engine uses (`backend/src/config.js`, `backend/src/steg.js`), so this view cannot
 * contradict `TariffAudit` or `StegAuditPanel` if it is later fed by the API.
 *
 * The scenario is designed, not random: a full year of daily peaks is generated
 * from a seasonal/weekday model, then every day is held below Ps and exactly two
 * days are placed above it. Deriving the two events from the finished series
 * (`DEPASSEMENT_EVENTS` filters on `peakKva > ps`) rather than from the design
 * list is what guarantees the KPI, the chart markers and the Alertes sub-module
 * can never disagree about how many overruns happened.
 */
import { round1, round2, seeded } from './seeded';

export const SIMULATED = true;
export const SIMULATION_NOTE =
  'Jeu de données simulé — la pointe appelée est générée, aucun relevé de puissance réel n’est branché.';

/** Mirrors backend/src/config.js: STEG_CONTRACTED_POWER, STEG_TOLERANCE, STEG_PRIME_*, STEG_PENALTY_*. */
export const CONTRACT = {
  ps: 150,
  tolerance: 0.1,
  primeRatePerKvaPerMonth: 8.4,
  penaltyRatePerKvaPerMonth: 12.5,
  currency: 'DT'
};

export const PERIOD = { label: 'Année 2026', year: 2026, days: 365, from: '2026-01-01', to: '2026-12-31' };

const MONTH_SHORT = ['janv.', 'févr.', 'mar.', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MONTH_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const WEEKDAY_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/** Free kVA above Ps that STEG does not bill, as in steg.js. */
export const TOLERANCE_KVA = round1(CONTRACT.ps * CONTRACT.tolerance);

export const PRIME_MONTHLY = round2(CONTRACT.ps * CONTRACT.primeRatePerKvaPerMonth);
export const PRIME_ANNUAL = round2(PRIME_MONTHLY * 12);

/**
 * The two overruns the year is built around. Each is a plausible industrial
 * cause rather than an arbitrary spike: a cold snap in February and a heat wave in
 * July, when the chiller plant and the line peak in the same hour.
 */
const DESIGNED_OVERRUNS = [
  { date: '2026-02-19', peak: 158.7, hour: 14, cause: 'Vague de froid — chauffages et ligne de production au maximum' },
  { date: '2026-07-23', peak: 174.9, hour: 19, cause: 'Canicule — groupe froid et production en heures de pointe' }
];

const BASE = 116;
const SEASONAL = 8;
const NOISE = 3.2;

/** Sunday first: matches Date#getDay(). */
const WEEKDAY_FACTOR = [0.6, 1.02, 1.04, 1.05, 1.03, 0.99, 0.82];

function isoOf(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildDaily() {
  const rand = seeded(20260219);
  const rows = [];

  for (let offset = 0; offset < PERIOD.days; offset++) {
    const date = new Date(PERIOD.year, 0, 1 + offset);
    const month = date.getMonth();
    const dow = date.getDay();
    const iso = isoOf(date);
    const designed = DESIGNED_OVERRUNS.find((o) => o.date === iso);

    // The chiller plant makes July and August the expensive months, so the
    // seasonal term is inverted against the calendar: cosine is highest in
    // January and lowest in July.
    const seasonal = -SEASONAL * Math.cos((month / 12) * 2 * Math.PI);
    const chiller = month === 6 || month === 7 ? 3.5 : 0;
    const value = (BASE + seasonal + chiller + (rand() - 0.5) * 2 * NOISE) * WEEKDAY_FACTOR[dow];

    const hour = designed
      ? designed.hour
      : dow === 0
        ? 9
        : dow === 6
          ? 10
          : rand() < 0.5
            ? 10
            : 14;

    rows.push({
      key: `jour-${iso}`,
      date: iso,
      day: date.getDate(),
      month,
      weekday: WEEKDAY_LONG[dow],
      label: `${String(date.getDate()).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`,
      hour,
      cause: designed ? designed.cause : null,
      raw: designed ? designed.peak : value
    });
  }

  // Hold every non-overrun day under the contract. A seed that happened to throw
  // one ordinary Tuesday over Ps would make the overrun count a coincidence, and
  // the Alertes sub-module would inherit that coin flip.
  //
  // The scale applies to ordinary days ONLY. Applying it to the designed overruns
  // as well would quietly rescale the two events the moment the clamp engaged,
  // pushing them back under Ps and silently reducing the year to zero or one
  // overrun — the guarantee has to hold for any base level, not just this one.
  const cap = CONTRACT.ps * 0.97;
  const highest = rows.reduce((m, r) => (r.cause ? m : Math.max(m, r.raw)), 0);
  const scale = Math.min(1, cap / highest);

  return rows.map((r) => {
    const peakKva = round1(r.cause ? r.raw : r.raw * scale);
    return {
      key: r.key,
      date: r.date,
      day: r.day,
      month: r.month,
      weekday: r.weekday,
      label: r.label,
      hour: r.hour,
      cause: r.cause,
      peakKva,
      averageKva: round1(peakKva * (0.71 + seeded(r.day * 31 + r.month * 7)() * 0.12))
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
    peakKva: round1(Math.max(...rows.map((d) => d.peakKva))),
    averageKva: round1(rows.reduce((s, d) => s + d.averageKva, 0) / rows.length),
    exceedances: rows.filter((d) => d.peakKva > CONTRACT.ps).length
  };
}).map((m) => ({ ...m, exceeded: m.exceedances > 0 }));

/**
 * The overrun register, derived from the curve itself. `ps-alertes` imports this
 * same list, so an alert can never be filed for a day the chart does not show as
 * over the line, or missed for one it does.
 */
export const DEPASSEMENT_EVENTS = DAILY.filter((d) => d.peakKva > CONTRACT.ps)
  .map((d) => {
    const overrunKva = round1(d.peakKva - CONTRACT.ps);
    const taxableKva = round1(Math.max(0, d.peakKva - CONTRACT.ps - TOLERANCE_KVA));
    return {
      id: `ps-depassement-${d.date}`,
      date: d.date,
      dateLabel: `${d.day === 1 ? '1er' : d.day} ${MONTH_LONG[d.month]} ${PERIOD.year}`,
      weekday: d.weekday,
      hour: d.hour,
      timeLabel: `${String(d.hour).padStart(2, '0')}h00`,
      cause: d.cause,
      peakKva: d.peakKva,
      psKva: CONTRACT.ps,
      overrunKva,
      toleranceKva: TOLERANCE_KVA,
      taxableKva,
      // steg.js bills only the taxable part, at the penalty rate.
      penaltyPerMonth: round2(taxableKva * CONTRACT.penaltyRatePerKvaPerMonth),
      monthlyPrime: PRIME_MONTHLY,
      // Above Ps but inside the free allowance: an alert, not an invoice.
      severity: taxableKva > 0 ? 'critical' : 'warning'
    };
  })
  .sort((a, b) => (a.date < b.date ? -1 : 1));

export const DEPASSEMENT_COUNT = DEPASSEMENT_EVENTS.length;

/**
 * Aggregates for the Alertes sub-module. They live beside the register rather than
 * in the view, so the KPI strip can never disagree with the cards below it.
 */
export const ALERT_SUMMARY = {
  total: DEPASSEMENT_EVENTS.length,
  critical: DEPASSEMENT_EVENTS.filter((e) => e.severity === 'critical').length,
  warning: DEPASSEMENT_EVENTS.filter((e) => e.severity === 'warning').length,
  // What the year would cost per month if every registered overrun happened again
  // every month. It is a recurring exposure, not a bill: STEG prices the penalty
  // per kVA per month, and these were one-off days.
  monthlyPenaltyIfRecurring: round2(
    DEPASSEMENT_EVENTS.reduce((s, e) => s + e.penaltyPerMonth, 0)
  ),
  worst: DEPASSEMENT_EVENTS.reduce(
    (a, b) => (!a || b.peakKva > a.peakKva ? b : a),
    null
  )
};

export const PEAK_DAY = DAILY.reduce((a, b) => (b.peakKva > a.peakKva ? b : a));

/** Closest the site came to Ps without going over: the margin management keeps. */
export const HIGHEST_SAFE_DAY = DAILY.filter((d) => d.peakKva <= CONTRACT.ps).reduce((a, b) =>
  b.peakKva > a.peakKva ? b : a
);

export const AVG_PEAK = round1(DAILY.reduce((s, d) => s + d.peakKva, 0) / DAILY.length);
export const UTILISATION = PEAK_DAY.peakKva / CONTRACT.ps;
export const HEADROOM = round1(CONTRACT.ps - HIGHEST_SAFE_DAY.peakKva);

export const GRANULARITIES = [
  { key: 'mois', label: 'Mois', hint: 'une pointe par mois', points: MONTHLY },
  { key: 'jour', label: 'Jour', hint: 'une pointe par jour', points: DAILY }
];

export const DEFAULT_GRANULARITY = 'mois';

export function granularity(key) {
  return GRANULARITIES.find((g) => g.key === key) || GRANULARITIES[0];
}

/**
 * The chart contract, kept beside the data on purpose: the series, the limit and
 * the crossing threshold have to travel together, or the red line could end up
 * drawn at a value the curve never reaches. The view renders whatever this returns
 * and a test can assert against it directly.
 */
export function chartProps(key = DEFAULT_GRANULARITY) {
  const g = granularity(key);
  return {
    granularity: g.key,
    points: g.points,
    labels: g.points.map((p) => p.label),
    values: g.points.map((p) => p.peakKva),
    unit: 'kVA',
    reference: CONTRACT.ps,
    referenceColor: '#dc2626',
    highlightAbove: CONTRACT.ps
  };
}

export const KPIS = [
  {
    key: 'ps',
    label: 'Puissance souscrite contractuelle',
    value: CONTRACT.ps,
    unit: 'kVA',
    decimals: 1,
    sub: `contrat STEG · tolérance ${Math.round(CONTRACT.tolerance * 100)} %`,
    accent: '#0f172a'
  },
  {
    key: 'peak',
    label: 'Puissance maximale atteinte',
    value: PEAK_DAY.peakKva,
    unit: 'kVA',
    decimals: 1,
    sub: `${PEAK_DAY.label} · ${String(PEAK_DAY.hour).padStart(2, '0')}h00`,
    accent: '#dc2626',
    tone: 'critical'
  },
  {
    key: 'count',
    label: 'Nombre de dépassements',
    value: DEPASSEMENT_COUNT,
    unit: 'dépassements',
    decimals: 0,
    sub: `sur ${PERIOD.days} jours · ${MONTHLY.filter((m) => m.exceeded).length} mois`,
    accent: '#d97706',
    tone: 'critical'
  }
];
