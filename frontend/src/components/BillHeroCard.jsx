import { ArrowDownRight, ArrowUpRight, CalendarClock, CircleAlert } from 'lucide-react';
import { fmt, formatTime } from '../lib/format';

function InvoiceLine({ label, value, note, tone = 'default' }) {
  const valueCls =
    tone === 'muted' ? 'text-[13px] font-medium text-slate-400' : 'text-[13px] font-semibold text-slate-900';
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="min-w-0">
        <span className={`text-[12px] ${tone === 'muted' ? 'text-slate-400' : 'text-slate-600'}`}>
          {label}
        </span>
        {note && <span className="ml-1.5 font-mono text-[9.5px] text-slate-400">{note}</span>}
      </span>
      <span className={`shrink-0 tabular ${valueCls}`}>{value}</span>
    </div>
  );
}

/**
 * The billing headline panel — the one card a factory owner reads first.
 *
 * Structured like the real STEG invoice (energy, subscription prime, overdraw
 * penalty, VAT) but alive: every figure is the month-to-date value from the
 * billing snapshot plus what the meter has burned since the last refresh, so
 * the total moves while production runs.
 *
 * Taxes are an explicit UI-side estimate (TVA 19%) until the API grows a tax
 * breakdown; the fixed fees are real backend tariff figures.
 */
export default function BillHeroCard({ model, loading = false, frozen = false }) {
  if (loading && !model) {
    return (
      <section className="wl-card">
        <div className="space-y-3 p-4">
          <div className="skeleton h-4 w-40"></div>
          <div className="skeleton h-3 w-full"></div>
          <div className="skeleton h-10 w-48"></div>
        </div>
      </section>
    );
  }

  if (!model) {
    return (
      <section className="wl-card">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="wl-section-title">Estimated bill</h2>
          <p className="text-[10.5px] text-slate-400">Awaiting billing snapshot…</p>
        </div>
        <div className="px-4 py-10 text-center text-sm text-slate-400">
          The live bill, taxes and monthly projection appear here as soon as the
          billing engine answers.
        </div>
      </section>
    );
  }

  const aheadOfTime = model.savings != null && model.savings > 0;

  return (
    <section className="wl-card h-full">
      {/* ---- Header ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="wl-section-title">Estimated bill</h2>
          <p className="font-mono text-[10px] text-slate-400">
            {model.monthLabel} · STEG {fmt(model.rate, 3)} DT/kWh
          </p>
        </div>
        <span className="wl-chip border-slate-200 bg-slate-50 text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${frozen ? 'bg-slate-400' : 'bg-energy-500 pulse-dot'}`}></span>
          {frozen ? 'Snapshot' : 'Live'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 px-4 py-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ---- Invoice structure (left) ---- */}
        <div>
          <div className="wl-kpi-label mb-1">Charges · month to date</div>
          <div className="divide-y divide-slate-100">
            <InvoiceLine
              label="Energy consumption"
              note={`${fmt(model.consumptionKwh, 0)} kWh`}
              value={`${fmt(model.energyCost, 0)} DT`}
            />
            <InvoiceLine
              label="Subscription prime"
              note={`Ps ${fmt(model.subscribedPower, 0)} kVA`}
              value={`${fmt(model.feesPrime, 0)} DT`}
            />
            <InvoiceLine
              label="Overdraw penalty"
              note={model.feesPenalty > 0 ? `peak ${fmt(model.peakKva, 1)} kVA` : 'none this month'}
              tone={model.feesPenalty > 0 ? 'default' : 'muted'}
              value={`${fmt(model.feesPenalty, 0)} DT`}
            />
            <InvoiceLine
              label="Taxes & duties"
              note="TVA 19% · estimate"
              value={`${fmt(model.taxes, 0)} DT`}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5">
            <span className="text-[12px] font-semibold text-slate-700">Current bill (TTC)</span>
            <span className="text-[17px] font-semibold tabular text-slate-900">
              {fmt(model.bill, 0)} <span className="text-[11px] font-medium text-slate-400">DT</span>
            </span>
          </div>
        </div>

        {/* ---- Live figures (right) ---- */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="wl-kpi-label">Total right now</span>
            {!frozen && <span className="h-1.5 w-1.5 rounded-full bg-energy-500 pulse-dot"></span>}
          </div>

          <div className="mt-1 flex items-end gap-2">
            <span className="text-[34px] font-semibold leading-none tabular text-slate-900">
              {fmt(model.bill, 0)}
            </span>
            <span className="mb-1 text-[12px] font-medium text-slate-400">DT</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-400">
            {model.liveDelta > 0.005 ? (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <ArrowUpRight className="h-3 w-3" />
                +{fmt(model.liveDelta, 2)} DT since you opened
              </span>
            ) : (
              <span>no live increase yet</span>
            )}
            <span>
              {frozen
                ? 'feed frozen'
                : model.liveAt
                  ? `meter ${formatTime(model.liveAt)}`
                  : 'awaiting meter'}
            </span>
          </div>

          {/* Day progress with the elapsed-month marker */}
          <div className="relative mt-3.5">
            <div className="h-1.5 w-full overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm bg-brand-500"
                style={{ width: `${Math.round(model.progress * 100)}%` }}
              ></div>
            </div>
            <div
              className="absolute -top-0.5 h-2.5 w-px bg-slate-500"
              style={{ left: `${Math.round(model.dayProgress * 100)}%` }}
              title={`day ${model.days} of ${model.daysInMonth}`}
            ></div>
            <div className="mt-1 flex items-center justify-between font-mono text-[9.5px] text-slate-400">
              <span>{fmt(model.progress * 100, 0)}% of forecast incurred</span>
              <span>
                day {model.days}/{model.daysInMonth}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <div className="wl-kpi-label text-[9px]">Projected end of month</div>
              <div className="mt-0.5 flex items-end gap-1">
                <CalendarClock className="mb-0.5 h-3.5 w-3.5 text-slate-400" />
                <span className="text-[16px] font-semibold leading-none tabular text-slate-900">
                  {model.forecast == null ? '--' : fmt(model.forecast, 0)}
                </span>
                <span className="mb-0.5 text-[10px] font-medium text-slate-400">DT</span>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 px-2.5 py-2">
              <div className="wl-kpi-label text-[9px]">Daily increase today</div>
              <div className="mt-0.5 flex items-end gap-1">
                <span className="text-[16px] font-semibold leading-none tabular text-slate-900">
                  +{fmt(model.dailyIncrease, 0)}
                </span>
                <span className="mb-0.5 text-[10px] font-medium text-slate-400">DT</span>
              </div>
            </div>
          </div>

          {model.savings != null && (
            <div
              className={`mt-3 flex items-center gap-2 text-[10.5px] font-medium ${
                aheadOfTime ? 'text-red-700' : 'text-energy-700'
              }`}
            >
              {aheadOfTime ? (
                <CircleAlert className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 shrink-0" />
              )}
              {aheadOfTime
                ? `${fmt(model.savings, 0)} DT above last month's pace at day ${model.days}`
                : `${fmt(Math.abs(model.savings), 0)} DT below last month's pace at day ${model.days}`}
            </div>
          )}
        </div>
      </div>

      <p className="border-t border-slate-100 px-4 py-2 text-[9px] leading-4 text-slate-400">
        Fixed fees are the backend tariff figures (subscription prime, overdraw penalty).
        Taxes are a UI-side estimate (TVA 19%). Projection = current bill ÷ elapsed days ×{' '}
        {model.daysInMonth}.
      </p>
    </section>
  );
}
