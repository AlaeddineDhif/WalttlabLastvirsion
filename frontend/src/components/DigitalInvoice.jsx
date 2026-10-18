import { useMemo } from 'react';
import { fmt, formatTime } from '../lib/format';
import BrandLogo from './BrandLogo';

/**
 * Digital invoice — the STEG invoice logic, rebuilt as a product surface.
 *
 * Not a paper replica: no faux page, no barcode theatre. The real invoice's
 * information architecture (customer & contract, consumption, energy charge,
 * subscription prime, overdraw penalty, taxes, total) is preserved because that
 * is how every plant manager in Tunisia reads electricity — but every line is
 * live, sourced from the billing snapshot, and ends in a forecast instead of a
 * payment deadline.
 *
 * Customer identity comes from the authenticated session; the contract block
 * from the backend tariff model (Ps, rate); the meter block from the live feed.
 */
export default function DigitalInvoice({ model, user, broker, frozen = false }) {
  const contractRows = useMemo(() => {
    if (!model) return [];
    return [
      { label: 'Customer', value: user?.username ? `${user.username} · main site` : 'WatLab site' },
      { label: 'Contract', value: 'STEG · industrial BT/MT' },
      { label: 'Subscribed power', value: `${fmt(model.subscribedPower, 0)} kVA` },
      { label: 'Energy tariff', value: `${fmt(model.rate, 3)} DT/kWh` },
      { label: 'Billing period', value: `${model.monthLabel} · day ${model.days}/${model.daysInMonth}` },
      { label: 'Meter', value: broker?.clientId ? `WatLab ESP32 · ${broker.clientId}` : 'WatLab ESP32' }
    ];
  }, [model, user, broker]);

  if (!model) return null;

  return (
    <section className="wl-card">
      {/* Invoice identity row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <BrandLogo size="invoice" />
          <div>
            <h2 className="wl-section-title">Estimated invoice</h2>
            <p className="font-mono text-[10px] text-slate-400">
              {model.monthLabel} · STEG structure · live
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-400">Estimate</span>
          <span className="wl-chip border-slate-200 bg-slate-50 text-slate-500">
            <span className={`h-1.5 w-1.5 rounded-full ${frozen ? 'bg-slate-400' : 'bg-energy-500 pulse-dot'}`}></span>
            {frozen ? 'Snapshot' : 'Live'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-4 py-4 lg:grid-cols-[1fr_1.15fr]">
        {/* Left: customer, contract & meter */}
        <div>
          <div className="wl-kpi-label mb-2">Customer &amp; contract</div>
          <dl className="divide-y divide-slate-100">
            {contractRows.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-[11.5px] text-slate-500">{label}</dt>
                <dd className="truncate text-[12px] font-medium tabular text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Meter reading */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
            <span className="font-mono text-[10px] text-slate-400">Last meter reading</span>
            <span className="font-mono text-[11px] font-medium tabular text-slate-700">
              {fmt(model.consumptionKwh, 1)} kWh · {model.liveAt ? formatTime(model.liveAt) : '--:--:--'}
            </span>
          </div>

          {/* Historical comparison */}
          <div className="mt-4">
            <div className="wl-kpi-label mb-2">Historical comparison</div>
            <div className="grid grid-cols-2 gap-2">
              <CompareBlock
                label={model.prev ? `${model.prev.label} bill` : 'Last month'}
                value={model.prevBill == null ? '--' : fmt(model.prevBill, 0)}
                tone="slate"
              />
              <CompareBlock
                label="Same day last month"
                value={model.prevBillAtSameDay == null ? '--' : fmt(model.prevBillAtSameDay, 0)}
                tone="slate"
              />
              <CompareBlock
                label="Pace vs last month"
                value={
                  model.savings == null
                    ? '--'
                    : `${model.savings > 0 ? '+' : '−'}${fmt(Math.abs(model.savings), 0)} DT`
                }
                tone={model.savings == null ? 'slate' : model.savings > 0 ? 'warn' : 'good'}
              />
              <CompareBlock
                label="12-month average"
                value={
                  model.ledger.length
                    ? fmt(
                        model.ledger.reduce((s, m) => s + (m.bill || 0), 0) / model.ledger.length,
                        0
                      ) + ' DT'
                    : '--'
                }
                tone="slate"
              />
            </div>
          </div>
        </div>

        {/* Right: charges, taxes, total */}
        <div>
          <div className="wl-kpi-label mb-1">Charges</div>
          <div className="divide-y divide-slate-100">
            <ChargeLine
              label="Energy consumption"
              detail={`${fmt(model.consumptionKwh, 0)} kWh × ${fmt(model.rate, 3)} DT/kWh`}
              value={`${fmt(model.energyCost, 1)} DT`}
            />
            <ChargeLine
              label="Subscription prime"
              detail={`contracted ${fmt(model.subscribedPower, 0)} kVA`}
              value={`${fmt(model.feesPrime, 1)} DT`}
            />
            <ChargeLine
              label="Overdraw penalty"
              detail={
                model.feesPenalty > 0
                  ? `peak ${fmt(model.peakKva, 1)} kVA exceeds contract`
                  : 'no overdraw this month'
              }
              muted={model.feesPenalty <= 0}
              value={`${fmt(model.feesPenalty, 1)} DT`}
            />
            <ChargeLine
              label="Taxes & duties"
              detail="TVA 19% · UI-side estimate"
              value={`${fmt(model.taxes, 1)} DT`}
            />
          </div>

          {/* Total + forecast */}
          <div className="mt-3 border-t border-slate-200 pt-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-semibold text-slate-700">Estimated total (TTC)</span>
              <span className="flex items-end gap-1.5">
                <span className="text-[24px] font-semibold leading-none tabular text-slate-900">
                  {fmt(model.bill, 0)}
                </span>
                <span className="mb-0.5 text-[11px] font-medium text-slate-400">DT</span>
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100">
              <MiniCell
                label="Projected end of month"
                value={model.forecast == null ? '--' : `${fmt(model.forecast, 0)} DT`}
                tone={model.forecastDelta != null && model.forecastDelta > 0 ? 'warn' : 'good'}
              />
              <MiniCell
                label="Daily increase"
                value={`+${fmt(model.dailyIncrease, 0)} DT`}
                tone="slate"
              />
              <MiniCell
                label="Cost per unit"
                value={model.dtPerUnit != null ? `${fmt(model.dtPerUnit, 3)} DT/pc` : '—'}
                tone="slate"
              />
            </div>
          </div>

          <p className="mt-2.5 text-[9px] leading-4 text-slate-400">
            Digital estimate generated from the WatLab meter and the STEG tariff model.
            Fixed fees are backend tariff figures; taxes are a UI-side estimate (TVA 19%)
            until the billing engine exposes a tax breakdown.
          </p>
        </div>
      </div>
    </section>
  );
}

function ChargeLine({ label, detail, value, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className={`text-[12px] ${muted ? 'text-slate-400' : 'text-slate-600'}`}>{label}</div>
        <div className="font-mono text-[9.5px] text-slate-400">{detail}</div>
      </div>
      <div
        className={`shrink-0 tabular ${
          muted ? 'text-[13px] font-medium text-slate-400' : 'text-[13px] font-semibold text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CompareBlock({ label, value, tone }) {
  const valueCls =
    tone === 'good'
      ? 'text-energy-700'
      : tone === 'warn'
        ? 'text-amber-700'
        : 'text-slate-800';
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <div className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-[14px] font-semibold tabular ${valueCls}`}>{value}</div>
    </div>
  );
}

function MiniCell({ label, value, tone }) {
  const cls =
    tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-energy-700' : 'text-slate-800';
  return (
    <div className="px-3 py-2">
      <div className="text-[9px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 text-[12.5px] font-semibold tabular ${cls}`}>{value}</div>
    </div>
  );
}
