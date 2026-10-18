import { useMemo } from 'react';
import { Clock4, Waves, Zap } from 'lucide-react';
import { fmt, fmtKwhUnit } from '../lib/format';

/**
 * Savings opportunities — the "where can I save?" answer, quantified.
 *
 * Four levers a plant manager can actually pull, each priced from data the
 * platform already holds:
 *
 *  1. Peak demand     — the overdraw penalty the backend tariff model already
 *                       computed for this month, or wasted prime when the
 *                       subscription is heavily underused.
 *  2. Power factor    — the reactive share of apparent energy when cos φ sits
 *                       under the 0.96 target (penalty under 0.85).
 *  3. Idle equipment  — the gap between the minimum and the average live demand
 *                       observed in the telemetry window.
 *  4. Production hours— the best-vs-worst SEC day gap from the production
 *                       ledger, priced at the declared tariff.
 *
 * Figures are directional estimates, labelled as such; they are decision
 * support, not invoices.
 */
export default function SavingsInsights({ model, powerSeries = [], frozen = false }) {
  const insights = useMemo(() => {
    if (!model) return [];
    const out = [];
    const rate = model.rate;

    // 1 — Peak demand / subscribed power
    if (model.feesPenalty > 0) {
      out.push({
        key: 'peak-penalty',
        icon: Zap,
        title: 'Eliminate the overdraw penalty',
        amount: model.feesPenalty,
        unit: 'DT/mo',
        basis: `peak ${fmt(model.peakKva, 1)} kVA over Ps ${fmt(model.subscribedPower, 0)} kVA · backend tariff figure`,
        action: 'Peak-shave the heaviest start-ups or step up the subscribed power.'
      });
    } else if (model.utilization != null && model.utilization < 0.7) {
      const wastedPrime = model.feesPrime * (1 - model.utilization / 0.7);
      if (wastedPrime > 1) {
        out.push({
          key: 'peak-headroom',
          icon: Zap,
          title: 'Right-size the subscribed power',
          amount: wastedPrime,
          unit: 'DT/mo',
          basis: `utilisation ${fmt(model.utilization * 100, 0)}% of Ps · prime paid for idle headroom (estimate)`,
          action: 'A lower subscribed-power tranche could cut the monthly prime.'
        });
      }
    }

    // 2 — Power factor
    const pf = Number.isFinite(model.livePf) ? model.livePf : null;
    if (pf != null && pf > 0.1 && pf < 0.96) {
      const reactiveShare = 1 - pf;
      out.push({
        key: 'pf',
        icon: Waves,
        title: 'Improve the power factor',
        amount: model.energyCost * reactiveShare * 0.25,
        unit: 'DT/mo',
        basis: `cos φ ${fmt(pf, 3)} · ~${fmt(reactiveShare * 100, 0)}% reactive share · directional estimate`,
        action: 'Capacitor correction toward 0.96 removes the reactive surcharge risk.'
      });
    }

    // 3 — Idle / base load from the live window
    if (!frozen && powerSeries.length >= 8) {
      const values = powerSeries.filter((v) => Number.isFinite(v));
      if (values.length >= 8) {
        const min = Math.min(...values);
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        if (avg > 0 && min / avg < 0.55) {
          const idleKw = avg - min;
          // 16 h/day assumed non-productive window for the directional estimate.
          const idleDt = idleKw * 16 * 30 * rate;
          out.push({
            key: 'idle',
            icon: Clock4,
            title: 'Cut idle consumption',
            amount: idleDt,
            unit: 'DT/mo',
            basis: `base load ${fmt(min, 1)} kW vs average ${fmt(avg, 1)} kW · ~16 h/day off-production (estimate)`,
            action: 'Audit compressors, ventilation and lighting left on off-shift.'
          });
        }
      }
    }

    // 4 — Production hours (best-vs-worst day pattern)
    if (model.productionGap != null && model.productionGap.kwh > 0) {
      out.push({
        key: 'production',
        icon: Clock4,
        title: 'Optimize production hours',
        amount: model.productionGap.dt,
        unit: 'DT/mo',
        basis: `${fmtKwhUnit(model.productionGap.kwh, 0)} gap between best and worst SEC days · simulated ledger`,
        action: 'Reproduce the best day’s schedule on the weakest days.'
      });
    }

    return out.sort((a, b) => b.amount - a.amount);
  }, [model, powerSeries, frozen]);

  const total = insights.reduce((s, i) => s + (Number.isFinite(i.amount) ? i.amount : 0), 0);

  return (
    <section className="wl-card h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="wl-section-title">Savings opportunities</h2>
          <p className="text-[10.5px] text-slate-400">Quantified levers, ranked by potential</p>
        </div>
        {insights.length > 0 && (
          <span className="font-mono text-[10px] text-slate-500">≈ {fmt(total, 0)} DT/mo</span>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {insights.length === 0 ? (
          <div className="px-4 py-6 text-center text-[11px] text-slate-400">
            {frozen
              ? 'Live telemetry frozen — savings levers recompute when the feed resumes.'
              : 'No significant savings lever detected on the current data.'}
          </div>
        ) : (
          insights.map((ins) => {
            const Icon = ins.icon;
            return (
              <div key={ins.key} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800">{ins.title}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] leading-4 text-slate-400">{ins.basis}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-semibold leading-none tabular text-slate-900">
                      {fmt(ins.amount, 0)}
                    </div>
                    <div className="font-mono text-[9px] text-slate-400">{ins.unit}</div>
                  </div>
                </div>
                <p className="mt-1.5 pl-[22px] text-[10.5px] leading-4 text-slate-500">{ins.action}</p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
