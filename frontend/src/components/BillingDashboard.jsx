import { useMemo } from 'react';
import CostHistoryChart from './CostHistoryChart';
import { fmt } from '../lib/format';

/**
 * Energy Cost & Billing — the money horizon board.
 *
 * Six cells answer every "what does this cost?" question a manager asks in a
 * week, and the annual chart underneath shows the year's trajectory with the
 * live month highlighted and its projection floating above it.
 *
 * Every figure derives from the shared billing model (month-to-date snapshot +
 * live overlay), so these tiles always agree with the bill panel.
 */
const TILES = [
  { key: 'today', label: 'Today', basis: 'metered so far today' },
  { key: 'week', label: 'This week', basis: '7-day run rate' },
  { key: 'month', label: 'This month', basis: 'energy HT · to date' },
  { key: 'year', label: 'Year', basis: 'rolling 12 months · TTC est.' },
  { key: 'bill', label: 'Estimated bill', basis: 'TTC · incl. taxes & fees' },
  { key: 'forecast', label: 'Forecast', basis: 'projected end of month' }
];

export default function BillingDashboard({ model, loading = false }) {
  const values = useMemo(() => {
    if (!model) return null;
    return {
      today: model.dailyIncrease,
      week: model.weeklyCost,
      month: model.monthEnergyCost,
      year: model.annualBill,
      bill: model.bill,
      forecast: model.forecast
    };
  }, [model]);

  return (
    <section className="wl-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="wl-section-title">Energy cost &amp; billing</h2>
          <p className="truncate text-[10.5px] text-slate-400">
            What the energy costs on every horizon
            {model?.rate != null ? ` · ${fmt(model.rate, 3)} DT/kWh` : ''}
          </p>
        </div>
        {model && <span className="font-mono text-[10px] text-slate-400">{model.monthLabel}</span>}
      </div>

      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        {TILES.map(({ key, label, basis }) => {
          const value = values ? values[key] : null;
          return (
            <div key={key} className="px-4 py-3">
              <div className="wl-kpi-label truncate text-[9.5px]">{label}</div>
              <div className="mt-1 flex items-end gap-1">
                {loading && value == null ? (
                  <div className="skeleton h-6 w-16"></div>
                ) : (
                  <>
                    {key === 'forecast' && <span className="mb-0.5 text-[11px] font-medium text-slate-300">≈</span>}
                    <span className="text-[19px] font-semibold leading-none tabular text-slate-900">
                      {fmt(value, 0)}
                    </span>
                    <span className="mb-0.5 text-[10px] font-medium text-slate-400">DT</span>
                  </>
                )}
              </div>
              <div className="mt-1 truncate font-mono text-[9px] text-slate-400">{basis}</div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-100 px-4 py-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[12px] font-semibold text-slate-700">Energy cost over time</h3>
          <p className="font-mono text-[9.5px] text-slate-400">
            estimated bill per month · TTC incl. taxes &amp; fees · current month live
          </p>
        </div>
        {model ? (
          <CostHistoryChart ledger={model.ledger} forecast={model.forecast} height="h-72" />
        ) : (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            {loading ? 'Loading annual ledger…' : 'Awaiting billing snapshot…'}
          </div>
        )}
      </div>
    </section>
  );
}
