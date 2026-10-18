import { useMemo } from 'react';
import { fmt } from '../lib/format';

/**
 * Monthly forecast — where the bill is heading and whether that is acceptable.
 *
 * The progress bar carries two signals at once: the fill is how much of the
 * projected bill is already incurred, the dark tick is how much of the month
 * has elapsed. Spend ahead of the tick means the month is running hot.
 *
 * The goal is the only budget the platform can honestly infer without a user
 * input: last month's bill. Beating it is the built-in objective.
 */
export default function ForecastCard({ model, loading = false }) {
  const verdict = useMemo(() => {
    if (!model || model.forecastDelta == null) return null;
    const over = model.forecastDelta > 0;
    return {
      over,
      amount: Math.abs(model.forecastDelta),
      text: over ? 'projected overrun' : 'projected saving',
      tone: over ? 'text-amber-700' : 'text-energy-700'
    };
  }, [model]);

  if (loading && !model) {
    return (
      <section className="wl-card h-full p-4">
        <div className="skeleton h-4 w-36"></div>
        <div className="skeleton mt-4 h-9 w-44"></div>
        <div className="skeleton mt-4 h-1.5 w-full"></div>
        <div className="skeleton mt-4 h-14 w-full"></div>
      </section>
    );
  }

  if (!model) return null;

  return (
    <section className="wl-card h-full">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="wl-section-title">Monthly forecast</h2>
          <p className="font-mono text-[10px] text-slate-400">
            day {model.days}/{model.daysInMonth} · run-rate projection
          </p>
        </div>
        {verdict && (
          <span
            className={`text-[11px] font-semibold tabular ${verdict.tone}`}
            title={verdict.over ? 'trending above last month' : 'on track to beat last month'}
          >
            {verdict.over ? '+' : '−'}
            {fmt(verdict.amount, 0)} DT
          </span>
        )}
      </div>

      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="wl-kpi-label text-[9.5px]">Current bill</div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-[18px] font-semibold leading-none tabular text-slate-700">
                {fmt(model.bill, 0)}
              </span>
              <span className="mb-0.5 text-[10px] font-medium text-slate-400">DT</span>
            </div>
          </div>
          <div>
            <div className="wl-kpi-label text-[9.5px]">Predicted end of month</div>
            <div className="mt-1 flex items-end gap-1">
              <span className="text-[24px] font-semibold leading-none tabular text-slate-900">
                {model.forecast == null ? '--' : fmt(model.forecast, 0)}
              </span>
              <span className="mb-1 text-[10px] font-medium text-slate-400">DT</span>
            </div>
          </div>
          <div>
            <div className="wl-kpi-label text-[9.5px]">Difference</div>
            <div className="mt-1 flex items-end gap-1">
              <span
                className={`text-[18px] font-semibold leading-none tabular ${
                  model.forecastDelta == null
                    ? 'text-slate-400'
                    : model.forecastDelta > 0
                      ? 'text-amber-700'
                      : 'text-energy-700'
                }`}
              >
                {model.forecastDelta == null
                  ? '--'
                  : `${model.forecastDelta > 0 ? '+' : ''}${fmt(model.forecastDelta, 0)}`}
              </span>
              <span className="mb-0.5 text-[10px] font-medium text-slate-400">DT</span>
            </div>
          </div>
        </div>

        {/* Progress: fill = bill incurred, tick = month elapsed */}
        <div className="relative mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-full rounded-sm bg-brand-500"
              style={{ width: `${Math.round(model.progress * 100)}%` }}
            ></div>
          </div>
          <div
            className="absolute -top-0.5 w-px bg-slate-600"
            style={{ height: 14, left: `${Math.round(model.dayProgress * 100)}%` }}
            title={`day ${model.days} of ${model.daysInMonth}`}
          ></div>
          <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-slate-400">
            <span>{fmt(model.progress * 100, 0)}% of projected bill incurred</span>
            <span>{fmt(model.dayProgress * 100, 0)}% of month elapsed</span>
          </div>
        </div>

        {/* Goal: the only honest budget without user input — last month */}
        {model.prevBill != null && verdict && (
          <div className="mt-3.5 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
              <span className="text-[11px] font-medium text-slate-500">
                Goal · stay under last month ({model.prev.label}: {fmt(model.prevBill, 0)} DT)
              </span>
              <span className={`text-[14px] font-semibold tabular ${verdict.tone}`}>
                {verdict.over ? '+' : '−'}
                {fmt(verdict.amount, 0)} DT
              </span>
            </div>
            <div className="mt-0.5 font-mono text-[9.5px] text-slate-400">
              {verdict.text}
              {model.dailyAvgBill != null ? ` · ${fmt(model.dailyAvgBill, 0)} DT/day average` : ''}
            </div>
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9.5px] text-slate-400">
          <span>daily avg {fmt(model.dailyAvgBill, 0)} DT</span>
          <span className="text-center">
            {Math.max(0, model.daysInMonth - model.days)} days left
          </span>
          <span className="text-right">
            to spend {model.forecast == null ? '--' : fmt(Math.max(0, model.forecast - model.bill), 0)} DT
          </span>
        </div>
      </div>
    </section>
  );
}
