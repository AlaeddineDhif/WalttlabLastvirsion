/**
 * Billing intelligence model — the single source of truth every billing surface
 * reads from. One builder, one set of numbers: the hero bill card, the forecast
 * card, the cost tiles and the executive KPIs can never disagree.
 *
 * Inputs are only data the frontend already has:
 *   - the STEG billing snapshot from `/api/audit/history` (12 months of ledger,
 *     month-to-date totals, tariff rate, subscribed power, real subscription
 *     prime and overdraw penalty computed by the backend tariff model);
 *   - an optional live overlay: kWh consumed on the telemetry feed since the
 *     last snapshot, so the bill visibly ticks up while the plant runs.
 *
 * Tax lines are a UI-side estimate (TVA 19%, the STEG industrial rate) and are
 * labelled as estimates wherever rendered. Nothing here touches the backend.
 */

/** STEG industrial VAT, used as an explicit UI estimate until the API exposes it. */
export const TVA_RATE = 0.19;

const add = (...xs) => xs.reduce((s, v) => s + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);

/** Full estimated bill (TTC) for any historical month of the ledger. */
export function monthBillEstimate(month) {
  if (!month) return null;
  return (add(month.cost, month.monthlyPrime, month.monthlyPenalty)) * (1 + TVA_RATE);
}

/**
 * Build the live billing model.
 *
 * @param {object} audit  payload of `/api/audit/history`
 * @param {object} opts
 * @param {number} opts.sessionKwh  kWh metered since the last snapshot refresh
 * @param {string|null} opts.liveAt ISO time of the last telemetry packet
 * @param {number|null} opts.pf     live power factor (for insight surfaces)
 * @param {object|null} opts.productionGap { kwh, dt } best-vs-worst SEC gap
 */
export function buildBillingModel(
  audit,
  { sessionKwh = 0, liveAt = null, pf = null, productionGap = null } = {}
) {
  if (!audit || !audit.current) return null;

  const cur = audit.current;
  const rate = audit.energyRatePerKwh;
  const months = audit.months || [];
  const prev = months.length > 1 ? months[months.length - 2] : null;

  const days = cur.days;
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const dayProgress = daysInMonth > 0 ? Math.min(days / daysInMonth, 1) : 0;

  // Month-to-date figures, live-overlaid with what the meter has burned since
  // the snapshot was taken — this is what makes the bill a live experience.
  const consumptionKwh = add(cur.energyKwh, sessionKwh);
  const energyCost = consumptionKwh * rate;

  // Real fixed fees: the subscription prime and the contracted-power overdraw
  // penalty are computed by the backend tariff model, not invented here.
  const feesPrime = Number(cur.monthlyPrime) || 0;
  const feesPenalty = Number(cur.monthlyPenalty) || 0;
  const feesTotal = feesPrime + feesPenalty;

  const taxes = (energyCost + feesTotal) * TVA_RATE;
  const bill = energyCost + feesTotal + taxes;

  // The portion of the bill caused by live consumption since the snapshot.
  const liveDelta = sessionKwh * rate * (1 + TVA_RATE);

  // Run-rate projection to the last day of the month.
  const forecast = dayProgress > 0 ? bill / dayProgress : null;

  // Previous month, converted to the same TTC basis for honest comparisons.
  const prevBill = monthBillEstimate(prev);
  const prevDays = prev ? new Date(prev.year, prev.month + 1, 0).getDate() : null;

  // Pace: what last month's bill looked like at the same point in time.
  const prevBillAtSameDay = prevBill != null && prevDays ? (prevBill * days) / prevDays : null;
  const paceDelta = prevBillAtSameDay != null ? bill - prevBillAtSameDay : null;
  const savings = paceDelta; // positive = spending more than last month's pace

  // Forecast vs the previous full month — the number a manager budgets against.
  const forecastDelta = forecast != null && prevBill != null ? forecast - prevBill : null;

  // Daily increase: what today has cost on top of yesterday's close.
  const todayKwh = audit.today ? Number(audit.today.energyKwh) || 0 : 0;
  const dailyIncrease = todayKwh * rate * (1 + TVA_RATE);

  const dailyAvgBill = days > 0 ? bill / days : null;
  const weeklyCost = dailyAvgBill == null ? null : dailyAvgBill * 7;
  const annualBill =
    months.length > 0 ? months.reduce((s, m) => s + monthBillEstimate(m), 0) : null;

  // Energy horizons (HT), kept alongside the TTC figures for the cost tiles.
  const monthEnergyCost = Number(cur.cost) || 0;
  const dailyAvgEnergy = days > 0 ? monthEnergyCost / days : null;
  const annualEnergy = Number.isFinite(audit.totalCost) ? audit.totalCost : null;

  return {
    monthLabel: `${cur.label} ${cur.year}`,
    rate,
    subscribedPower: audit.subscribedPower,
    peakKva: cur.peakKva,
    utilization: cur.utilization,
    days,
    daysInMonth,
    dayProgress,

    consumptionKwh,
    sessionKwh,
    energyCost,

    feesPrime,
    feesPenalty,
    feesTotal,
    taxes,
    bill,
    liveDelta,
    liveAt,

    forecast,
    progress: forecast > 0 ? Math.min(bill / forecast, 1) : 0,

    prev: prev
      ? { label: `${prev.label} ${prev.year}`, bill: prevBill, days: prevDays, energyKwh: prev.energyKwh }
      : null,
    prevBill,
    prevBillAtSameDay,
    paceDelta,
    savings,
    forecastDelta,

    todayKwh,
    dailyIncrease,
    dailyAvgBill,
    weeklyCost,
    annualBill,

    /** Live context consumed by the insight surfaces (alerts, savings). */
    livePf: pf,
    productionGap,

    monthEnergyCost,
    dailyAvgEnergy,
    annualEnergy,
    /** Energy cost per produced unit, when the ledger carries production. */
    dtPerUnit: cur.dtPerUnit != null ? cur.dtPerUnit : null,

    /** Ledger shaped for the monthly cost chart: closed months + the live one. */
    ledger: months.map((m, i) => ({
      label: m.label,
      year: m.year,
      bill: monthBillEstimate(m),
      energyKwh: m.energyKwh,
      live: i === months.length - 1
    }))
  };
}

/**
 * Executive efficiency score: how well the plant converts subscribed capacity
 * and power quality into production-grade consumption. Two honest signals from
 * data the platform already has, weighted and renormalised when one is missing
 * (a frozen feed has no live cos φ; an empty ledger has no demand history).
 *
 *  - power factor: cos φ against the 0.96 industrial target (penalty under 0.85)
 *  - demand discipline: peak demand against the subscribed power — paying for
 *    150 kVA and calling 60 wastes the subscription; calling 165 incurs penalty.
 */
export function efficiencyScore({ pf, loaded = true, peakKva, subscribedPower } = {}) {
  const parts = [];

  if (loaded && pf != null && Number.isFinite(pf)) {
    parts.push({
      key: 'pf',
      label: 'Power factor',
      weight: 0.55,
      value: Math.min(1, Math.max(0, Math.abs(pf) / 0.96))
    });
  }

  if (peakKva != null && Number.isFinite(peakKva) && subscribedPower > 0) {
    const utilization = peakKva / subscribedPower;
    parts.push({
      key: 'demand',
      label: 'Demand vs subscription',
      weight: 0.45,
      value: Math.max(0, 1 - Math.abs(1 - utilization))
    });
  }

  if (!parts.length) return null;

  const weight = parts.reduce((s, p) => s + p.weight, 0);
  const score = parts.reduce((s, p) => s + p.value * p.weight, 0) / weight;

  return {
    score,
    parts,
    grade:
      score >= 0.9 ? { label: 'Excellent', state: 'energy' }
      : score >= 0.75 ? { label: 'Good', state: 'brand' }
      : score >= 0.6 ? { label: 'Watch', state: 'amber' }
      : { label: 'Action needed', state: 'red' }
  };
}
