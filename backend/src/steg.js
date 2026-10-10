export const DEFAULT_TRANCHES = [50, 100, 150, 200, 250, 300, 400, 500, 630, 800, 1000, 1250, 1600];

const round2 = (n) => Math.round(n * 100) / 100;
const round1 = (n) => Math.round(n * 10) / 10;
const pct = (u) => Math.round(u * 100) + '%';

function pickTranche(need, tranches) {
  const sorted = [...tranches].sort((a, b) => a - b);
  const found = sorted.find((t) => t >= need);
  return found ?? Math.ceil(need / 50) * 50;
}

/**
 * STEG subscription audit engine.
 * Contracted power (Ps) is compared with the peak reached apparent power (Pai).
 * STEG allows a 10% free overrun (tolerance); beyond that a "supplement de
 * puissance" penalty is billed per excess kVA per month. The engine also prices
 * the fixed subscription prime and recommends the optimal standard tranche.
 */
export function computeAudit({
  contractedPower = 150,
  peakPower = 0,
  primeRatePerKvaPerMonth = 8.4,
  penaltyRatePerKvaPerMonth = 12.5,
  tolerance = 0.1,
  tranches = DEFAULT_TRANCHES
}) {
  const peak = Math.max(0, peakPower);
  const utilization = contractedPower > 0 ? round2(peak / contractedPower) : 0;
  const overrun = round2(Math.max(0, peak - contractedPower));
  const toleranceKva = round1(contractedPower * tolerance);
  const taxable = round2(Math.max(0, overrun - toleranceKva));
  const exceeded = peak > contractedPower;
  const monthlyPenalty = round2(taxable * penaltyRatePerKvaPerMonth);
  const annualPenalty = round2(monthlyPenalty * 12);
  const annualPrime = round2(contractedPower * primeRatePerKvaPerMonth * 12);

  let status = 'ok';
  let recommendation;

  if (taxable > 0.5) {
    status = 'critical';
    const target = pickTranche(peak * 1.15, tranches);
    const extraPrime = round2(Math.max(0, (target - contractedPower) * primeRatePerKvaPerMonth * 12));
    const savings = round2(Math.max(0, annualPenalty - extraPrime));
    recommendation = {
      type: 'upgrade',
      current: contractedPower,
      suggested: target,
      savings,
      headroom: round1(target - peak),
      message:
        `Peak demand Pai (${round1(peak)} kVA) exceeds the contracted power Ps ` +
        `(${contractedPower} kVA) beyond the ${pct(tolerance)} free allowance. ` +
        `STEG bills the excess at ${penaltyRatePerKvaPerMonth} DT/kVA/month ` +
        `(≈ ${fmtDT(monthlyPenalty)}/month). Subscribing ${target} kVA removes the penalty.`
    };
  } else if (exceeded || utilization >= 0.9) {
    status = 'watch';
    const target = pickTranche(peak * 1.15, tranches);
    const suggested = target > contractedPower ? target : contractedPower;
    recommendation = {
      type: 'watch',
      current: contractedPower,
      suggested,
      savings: 0,
      headroom: round1(contractedPower - peak),
      message: exceeded
        ? `Pai (${round1(peak)} kVA) slightly exceeds Ps (${contractedPower} kVA) but stays within ` +
          `the ${pct(tolerance)} free tolerance (${toleranceKva} kVA). No penalty today — ` +
          `plan capacity before peak demand grows.`
        : `Utilization is ${pct(utilization)} of contracted power (Ps = ${contractedPower} kVA). ` +
          `You are near the limit; monitor peak demand closely.`
    };
  } else if (utilization < 0.6 && contractedPower > tranches[0]) {
    const candidates = tranches.filter((t) => t < contractedPower && t >= peak * 1.15);
    const target = candidates[candidates.length - 1] ?? contractedPower;
    const savings = round2(Math.max(0, (contractedPower - target) * primeRatePerKvaPerMonth * 12));
    recommendation = {
      type: 'downgrade',
      current: contractedPower,
      suggested: target,
      savings,
      headroom: round1(target - peak),
      message:
        `Utilization is only ${pct(utilization)} of the subscribed ${contractedPower} kVA. ` +
        `Downgrading the subscription to ${target} kVA saves ≈ ${fmtDT(savings)}/year on the ` +
        `fixed STEG prime (${primeRatePerKvaPerMonth} DT/kVA/month) without penalty risk.`
    };
  } else {
    recommendation = {
      type: 'adequate',
      current: contractedPower,
      suggested: contractedPower,
      savings: 0,
      headroom: round1(contractedPower - peak),
      message:
        `Subscription is well sized for current demand (utilization ${pct(utilization)}). ` +
        `Continue daily peak-demand monitoring to stay within the ${pct(tolerance)} allowance.`
    };
  }

  return {
    contractedPower,
    peak,
    utilization,
    overrun,
    toleranceKva,
    taxable,
    exceeded,
    status,
    monthlyPenalty,
    annualPenalty,
    annualPrime,
    recommendation
  };
}

export function fmtDT(v) {
  return (Math.round(v * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + ' DT';
}