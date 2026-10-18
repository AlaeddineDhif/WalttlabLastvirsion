import { useMemo } from 'react';
import { Activity, Coins, ReceiptText, TrendingUp } from 'lucide-react';
import DigitalInvoice from '../components/DigitalInvoice';
import ForecastCard from '../components/ForecastCard';
import BillForecastChart from '../components/BillForecastChart';
import LedgerChart from '../components/LedgerChart';
import { SectionCard } from '../components/StatTile';
import PageHeader, { PageStat } from '../components/PageHeader';
import { useTelemetry } from '../context/TelemetryContext';
import useAuditHistory from '../hooks/useAuditHistory';
import { buildBillingModel } from '../lib/billingModel';
import { fmt } from '../lib/format';
import { CHART_PRIMARY, CHART_PRIMARY_RGB, CHART_SECONDARY, CHART_SECONDARY_RGB } from '../lib/brand';

/**
 * Billing & Cost — the money page.
 *
 * One screen answers every billing question: what do I owe right now (the
 * digital invoice), where is the month heading (the forecast), how the year
 * has been going (three evolutions), and what the invoice will look like
 * (charges, taxes, fees, payment status).
 *
 * All figures flow from the shared billing model — the same numbers the
 * dashboard shows, never a second opinion.
 */
export default function BillingCost({ user }) {
  const { metrics, packet, feed, broker } = useTelemetry();
  const { data: audit, loading } = useAuditHistory();

  const frozen = feed.isFrozen;

  const model = useMemo(
    () =>
      buildBillingModel(audit, {
        liveAt: packet?.ts || null,
        pf: metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi)
      }),
    [audit, packet, metrics.cosPhi]
  );

  if (!model) {
    return (
      <div className="wl-card flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
        <div className="skeleton h-10 w-10 rounded-lg"></div>
        <p className="text-sm font-semibold text-slate-600">
          {loading ? 'Loading billing snapshot…' : 'Awaiting billing snapshot…'}
        </p>
        <p className="max-w-sm text-[11px] text-slate-400">
          The digital invoice, forecast and cost evolutions appear here as soon as
          the billing engine answers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ---------------- Page header ---------------- */}
      <PageHeader
        title="Billing &amp; cost"
        description={`Estimated STEG invoice, live charges and 12-month cost evolution · ${model.monthLabel}`}
        actions={
          <>
            <PageStat label="Bill now" value={fmt(model.bill, 0)} unit="DT" />
            <PageStat
              label="Projected"
              value={model.forecast == null ? '--' : fmt(model.forecast, 0)}
              unit="DT"
            />
            <PageStat label="Daily burn" value={`+${fmt(model.dailyIncrease, 0)}`} unit="DT" />
          </>
        }
      />

      {/* ---------------- The digital invoice ---------------- */}
      <DigitalInvoice model={model} user={user} broker={broker} frozen={frozen} />

      {/* ---------------- Billing summary strip ---------------- */}
      <div className="wl-card grid grid-cols-2 divide-x divide-y divide-slate-100 md:grid-cols-3 xl:grid-cols-6 xl:divide-y-0">
        <SummaryTile label="Current bill" value={fmt(model.bill, 0)} sub="TTC · month to date" />
        <SummaryTile
          label="Month forecast"
          value={model.forecast == null ? '--' : fmt(model.forecast, 0)}
          sub={`day ${model.days}/${model.daysInMonth} run rate`}
        />
        <SummaryTile label="Taxes" value={fmt(model.taxes, 0)} sub="TVA 19% · estimate" />
        <SummaryTile
          label="Energy cost"
          value={fmt(model.energyCost, 0)}
          sub={`${fmt(model.rate, 3)} DT/kWh · HT`}
        />
        <SummaryTile
          label="Fixed fees"
          value={fmt(model.feesTotal, 0)}
          sub={`prime ${fmt(model.feesPrime, 0)} · penalty ${fmt(model.feesPenalty, 0)}`}
        />
        <SummaryTile
          label="Payment status"
          value="Estimate"
          sub="month in progress · not issued"
          muted
        />
      </div>

      {/* ---------------- Forecast + trajectory ---------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5 2xl:col-span-4">
          <ForecastCard model={model} loading={loading} />
        </div>
        <div className="xl:col-span-7 2xl:col-span-8">
          <SectionCard
            title="Bill trajectory"
            subtitle={`${model.monthLabel} · run rate to date, projection to month end${model.prev ? `, ${model.prev.label} reference` : ''}`}
            icon={TrendingUp}
          >
            <BillForecastChart model={model} height="h-[364px]" />
          </SectionCard>
        </div>
      </div>

      {/* ---------------- The three evolutions ---------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Bill evolution"
          subtitle="Estimated bill per month · TTC"
          icon={ReceiptText}
        >
          <LedgerChart ledger={model.ledger} measure="bill" label="Bill" unit="DT" color={CHART_PRIMARY} rgb={CHART_PRIMARY_RGB} height="h-64" />
        </SectionCard>

        <SectionCard
          title="Cost evolution"
          subtitle="Energy charge per month · HT"
          icon={Coins}
        >
          <LedgerChart ledger={model.ledger} measure="cost" label="Energy cost" unit="DT" decimals={0} color={CHART_SECONDARY} rgb={CHART_SECONDARY_RGB} height="h-64" />
        </SectionCard>

        <SectionCard
          title="Consumption evolution"
          subtitle="Metered energy per month"
          icon={Activity}
        >
          <LedgerChart ledger={model.ledger} measure="energy" label="Energy" unit="kWh" color="#16A34A" rgb="22,163,74" height="h-64" />
        </SectionCard>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, sub, muted = false }) {
  return (
    <div className="px-4 py-3">
      <div className="wl-kpi-label truncate text-[9.5px]">{label}</div>
      <div className="mt-1 flex items-end gap-1">
        <span
          className={`tabular leading-none ${
            muted ? 'wl-chip border border-slate-200 bg-canvasAlt py-0.5 text-[12px] font-semibold text-slate-600' : 'text-[19px] font-semibold text-slate-900'
          }`}
        >
          {value}
        </span>
        {!muted && <span className="mb-0.5 text-[10px] font-medium text-slate-400">DT</span>}
      </div>
      <div className="mt-1 truncate font-mono text-[9px] text-slate-400">{sub}</div>
    </div>
  );
}
