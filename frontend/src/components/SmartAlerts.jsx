import { useMemo } from 'react';
import { CircleCheck } from 'lucide-react';
import { fmt } from '../lib/format';

/**
 * Smart alerts — rule-based warnings a manager should act on today.
 *
 * Every rule runs on data the platform already has (billing snapshot + live
 * telemetry); nothing is fetched or invented. Each alert states the evidence
 * next to the verdict, so it can be argued with.
 *
 * Rules:
 *  - HIGH_CONSUMPTION   month pace above last month's same-day pace by >5%
 *  - POWER_FACTOR       live cos φ under the 0.96 target (penalty under 0.85)
 *  - BILL_FORECAST      projected month-end bill above last month's bill
 *  - UNUSUAL_PATTERN    today's cost more than 35% above the daily average
 */
export default function SmartAlerts({ model, pf, loaded, frozen }) {
  const alerts = useMemo(() => {
    if (!model) return [];
    const out = [];

    // 1 — Consumption pace
    if (model.savings != null) {
      const rel = model.prevBillAtSameDay > 0 ? model.savings / model.prevBillAtSameDay : 0;
      if (rel > 0.05) {
        out.push({
          key: 'consumption',
          severity: rel > 0.15 ? 'critical' : 'watch',
          title: 'High consumption pace',
          evidence: `${fmt(rel * 100, 1)}% above ${model.prev ? model.prev.label : 'last month'} at day ${model.days} · +${fmt(model.savings, 0)} DT`,
          advice: 'Review the heaviest shifts and check for out-of-schedule loads.'
        });
      }
    }

    // 2 — Power factor
    if (!frozen && loaded && pf != null && pf < 0.96) {
      out.push({
        key: 'pf',
        severity: pf < 0.85 ? 'critical' : 'watch',
        title: pf < 0.85 ? 'Power factor penalty zone' : 'Power factor below target',
        evidence: `cos φ ${fmt(pf, 3)} · target ≥ 0.960 · penalty under 0.850`,
        advice: 'Correct with capacitor banks to avoid reactive-energy surcharges.'
      });
    }

    // 3 — Bill forecast
    if (model.forecastDelta != null && model.forecastDelta > 0 && model.prevBill > 0) {
      const rel = model.forecastDelta / model.prevBill;
      if (rel > 0.03) {
        out.push({
          key: 'forecast',
          severity: rel > 0.12 ? 'critical' : 'watch',
          title: 'Bill trending above last month',
          evidence: `projection ${fmt(model.forecast, 0)} DT vs ${fmt(model.prevBill, 0)} DT (${fmt(rel * 100, 1)}%)`,
          advice: 'Peak-shaving the last days of the month can still bend the curve.'
        });
      }
    }

    // 4 — Unusual daily pattern
    if (model.dailyAvgBill != null && model.dailyIncrease > 0) {
      const rel = model.dailyIncrease / model.dailyAvgBill - 1;
      if (rel > 0.35) {
        out.push({
          key: 'pattern',
          severity: rel > 0.7 ? 'critical' : 'watch',
          title: 'Unusual consumption today',
          evidence: `${fmt(model.dailyIncrease, 0)} DT today vs ${fmt(model.dailyAvgBill, 0)} DT daily average (+${fmt(rel * 100, 0)}%)`,
          advice: 'Check whether an extra line, compressor or overtime shift is running.'
        });
      }
    }

    return out;
  }, [model, pf, loaded, frozen]);

  return (
    <section className="wl-card h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="wl-section-title">Alerts</h2>
          <p className="text-[10.5px] text-slate-400">Bill, power quality and pattern warnings</p>
        </div>
        {alerts.length > 0 && (
          <span className="font-mono text-[10px] text-slate-500">{alerts.length} active</span>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2.5 px-4 py-5">
            <CircleCheck className="h-4 w-4 shrink-0 text-energy-600" />
            <div>
              <p className="text-[12px] font-medium text-slate-700">Everything within targets</p>
              <p className="text-[10.5px] text-slate-400">
                Consumption pace, power factor and bill forecast are within normal ranges.
              </p>
            </div>
          </div>
        ) : (
          alerts.map((a) => {
            const critical = a.severity === 'critical';
            return (
              <div
                key={a.key}
                className={`px-4 py-3 ${critical ? 'border-l-2 border-l-red-500' : 'border-l-2 border-l-amber-500'}`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                  <span className="text-[12px] font-semibold text-slate-800">{a.title}</span>
                  <span
                    className={`font-mono text-[9px] font-semibold uppercase tracking-wide ${
                      critical ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {critical ? 'action' : 'watch'}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10px] leading-4 text-slate-500">{a.evidence}</p>
                <p className="mt-1 text-[10.5px] leading-4 text-slate-600">{a.advice}</p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
