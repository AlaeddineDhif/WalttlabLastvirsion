import { useEffect, useMemo, useRef } from 'react';
import { Activity, ChevronDown, Database, Radio } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import BillHeroCard from '../components/BillHeroCard';
import ForecastCard from '../components/ForecastCard';
import BillingDashboard from '../components/BillingDashboard';
import BillForecastChart from '../components/BillForecastChart';
import SmartAlerts from '../components/SmartAlerts';
import SavingsInsights from '../components/SavingsInsights';
import TrendChart from '../components/TrendChart';
import TelemetryLog from '../components/TelemetryLog';
import { SectionCard } from '../components/StatTile';
import PageHeader from '../components/PageHeader';
import { METRICS } from '../lib/metrics';
import { useTelemetry, NO_LOAD_AMP } from '../context/TelemetryContext';
import useAuditHistory from '../hooks/useAuditHistory';
import { buildBillingModel, efficiencyScore } from '../lib/billingModel';
import { BEST_SEC, WORST_SEC } from '../lib/productionData';
import { fmt, formatTime } from '../lib/format';
import { CHART_PRIMARY, CHART_SECONDARY, CHART_MUTED } from '../lib/brand';

/**
 * The detail instruments a manager never opens but an engineer never forgives
 * us for removing: electrical quality and feed diagnostics, demoted below every
 * money surface and collapsed by default.
 */
const DETAIL_METRICS = ['voltage', 'current', 'frequency', 'cosPhi'].map((k) =>
  METRICS.find((m) => m.key === k)
);
const PF_PENALTY = 0.85;

/**
 * The production efficiency gap, priced: what the worst SEC day would have
 * cost at the best day's practice. Comes from the simulated production ledger
 * and is labelled as such wherever rendered.
 */
const PRODUCTION_GAP = (() => {
  const kwh = (WORST_SEC.sec - BEST_SEC.sec) * WORST_SEC.production;
  return { kwh, dt: kwh * 0.25 }; // tariff rate of the simulated ledger
})();

const FLOW = {
  connected: { cls: 'border-energy-300 bg-energy-50 text-energy-700', dot: 'bg-energy-500', label: 'Connecté' },
  connecting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Connexion' },
  reconnecting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Reconnexion' },
  offline: { cls: 'border-slate-300 bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Hors ligne' },
  error: { cls: 'border-red-300 bg-red-50 text-red-700', dot: 'bg-red-500', label: 'Erreur' }
};

/** Manager verdict chip: is the plant running cheaper or dearer than last month? */
function paceChip(rel) {
  if (rel == null) return { label: 'no baseline', state: 'slate' };
  if (Math.abs(rel) < 0.015) return { label: 'on last month pace', state: 'slate' };
  return rel > 0
    ? { label: `+${fmt(rel * 100, 1)}% vs last month`, state: 'amber' }
    : { label: `${fmt(rel * 100, 1)}% vs last month`, state: 'energy' };
}

export default function Consommation() {
  const { metrics, charts, packet, broker, feed } = useTelemetry();
  const { data: audit, loading: billingLoading } = useAuditHistory();

  const flow = FLOW[broker.state] || FLOW.connecting;
  const frozen = feed.isFrozen;
  const pf = metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi);
  const noLoad = frozen || !(Math.abs(metrics.current || 0) > NO_LOAD_AMP);

  /**
   * Live bill overlay: kWh metered since the last billing snapshot. The
   * baseline re-anchors on every snapshot refresh, so the overlay never
   * double-counts what the backend has already folded into the month total.
   */
  const baselineRef = useRef(null);
  useEffect(() => {
    baselineRef.current = metrics.energy;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audit]);

  const sessionKwh = useMemo(() => {
    const base = baselineRef.current;
    const live = metrics.energy;
    if (base == null || live == null || !Number.isFinite(base) || !Number.isFinite(live)) return 0;
    return live >= base ? live - base : 0;
  }, [metrics.energy]);

  const model = useMemo(
    () =>
      buildBillingModel(audit, {
        sessionKwh,
        liveAt: packet?.ts || null,
        pf,
        productionGap: PRODUCTION_GAP
      }),
    [audit, sessionKwh, packet, pf]
  );

  const efficiency = useMemo(
    () =>
      efficiencyScore({
        pf,
        loaded: !noLoad,
        peakKva: model ? model.peakKva : null,
        subscribedPower: model ? model.subscribedPower : null
      }),
    [pf, noLoad, model]
  );

  /** Pace vs last month for consumption and cost (same energy ratio, two units). */
  const pace = useMemo(() => {
    if (!model || !model.prev || model.prev.energyKwh == null || !model.prevDays) return null;
    const baseline = (model.prev.energyKwh * model.days) / model.prevDays;
    return baseline > 0 ? (model.consumptionKwh - baseline) / baseline : null;
  }, [model]);

  const utilization = model && model.subscribedPower > 0 ? model.peakKva / model.subscribedPower : null;
  const demandStatus =
    utilization == null
      ? { label: '--', state: 'slate' }
      : utilization > 1
        ? { label: `over Ps · ${fmt(utilization * 100, 0)}%`, state: 'red' }
        : utilization >= 0.9
          ? { label: `near limit · ${fmt(utilization * 100, 0)}%`, state: 'amber' }
          : { label: `headroom · ${fmt(utilization * 100, 0)}%`, state: 'energy' };

  const billSeries = useMemo(
    () => (model ? model.ledger.map((m) => m.bill) : []),
    [model]
  );
  const costSeries = useMemo(() => {
    const rate = model ? model.rate : null;
    if (rate == null) return [];
    return (charts.energy || []).map((p) => (p.v == null ? null : p.v * rate));
  }, [charts.energy, model]);

  const kpis = model
    ? [
        {
          key: 'consumption',
          label: 'Energy Consumption',
          value: fmt(model.consumptionKwh, 0),
          unit: 'kWh',
          series: charts.energy?.map((p) => p.v) || [],
          color: '#16a34a',
          status: paceChip(pace),
          hint: `month to date · +${fmt(model.sessionKwh, 1)} kWh live`,
          goodDirection: 'down'
        },
        {
          key: 'demand',
          label: 'Power Demand',
          value: metrics.power == null ? '--' : fmt(metrics.power / 1000, 1),
          unit: 'kW',
          series: charts.power?.map((p) => p.v) || [],
          color: '#475569',
          status: demandStatus,
          hint: `Ps ${fmt(model.subscribedPower, 0)} kVA · peak ${fmt(model.peakKva, 1)} kVA`,
          goodDirection: 'down'
        },
        {
          key: 'cost',
          label: 'Energy Cost',
          value: fmt(model.energyCost, 0),
          unit: 'DT',
          series: costSeries,
          color: CHART_PRIMARY,
          status: paceChip(pace),
          hint: `energy HT · ${fmt(model.rate, 3)} DT/kWh`,
          goodDirection: 'down'
        },
        {
          key: 'bill',
          label: 'Estimated Bill',
          value: fmt(model.bill, 0),
          unit: 'DT',
          series: billSeries,
          color: CHART_SECONDARY,
          status: { label: `day ${model.days}/${model.daysInMonth}`, state: 'brand' },
          hint: 'TTC · incl. taxes & fees',
          progress: model.progress,
          goodDirection: 'down'
        },
        {
          key: 'forecast',
          label: 'Monthly Forecast',
          value: model.forecast == null ? '--' : fmt(model.forecast, 0),
          unit: 'DT',
          series: billSeries,
          color: CHART_MUTED,
          status:
            model.forecastDelta == null
              ? { label: '--', state: 'slate' }
              : model.forecastDelta > 0
                ? { label: `+${fmt(model.forecastDelta, 0)} DT vs last month`, state: 'amber' }
                : { label: `${fmt(model.forecastDelta, 0)} DT vs last month`, state: 'energy' },
          hint: model.prev ? `last month: ${fmt(model.prevBill, 0)} DT` : 'run-rate projection',
          goodDirection: 'down'
        },
        {
          key: 'efficiency',
          label: 'Efficiency Score',
          value: efficiency ? fmt(efficiency.score * 100, 0) : '--',
          unit: '%',
          series: charts.cosPhi?.map((p) => p.v) || [],
          color: '#22c55e',
          status: efficiency
            ? { label: efficiency.grade.label, state: efficiency.grade.state }
            : { label: '--', state: 'slate' },
          hint: 'cos φ + demand vs subscription',
          goodDirection: 'up'
        }
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* ---------------- Page header ---------------- */}
      <PageHeader
        title="Dashboard"
        description={
          model
            ? `Live bill, cost forecast and efficiency · ${model.monthLabel} · STEG ${fmt(model.rate, 3)} DT/kWh`
            : 'Live bill, cost forecast and efficiency'
        }
        actions={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${frozen ? 'bg-slate-400' : 'bg-energy-500 pulse-dot'}`}
              ></span>
              {frozen ? 'Feed frozen' : feed.isSimulated ? 'Simulated feed' : 'Live feed'}
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {packet ? `last packet ${formatTime(packet.ts)}` : 'awaiting telemetry'}
            </span>
          </div>
        }
      />

      {/* ---------------- KPI strip: consumption, demand, money ---------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            series={k.series}
            color={k.color}
            status={k.status}
            hint={k.hint}
            frozen={false}
            goodDirection={k.goodDirection}
            progress={k.progress ?? null}
          />
        ))}
      </div>

      {/* ---------------- The bill dominates the fold ---------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7 2xl:col-span-8">
          <BillHeroCard model={model} loading={billingLoading} frozen={frozen} />
        </div>
        <div className="xl:col-span-5 2xl:col-span-4">
          <ForecastCard model={model} loading={billingLoading} />
        </div>
      </div>

      {/* ---------------- Energy Cost & Billing ---------------- */}
      <BillingDashboard model={model} loading={billingLoading} />

      {/* ---------------- Intelligence: alerts + savings ---------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SmartAlerts model={model} pf={pf} loaded={!noLoad} frozen={frozen} />
        <SavingsInsights model={model} powerSeries={charts.power?.map((p) => p.v) || []} frozen={frozen} />
      </div>

      {/* ---------------- The two large money charts ---------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="Consumption Trend"
          subtitle={
            frozen
              ? `live meter · ${charts.energy?.length || 0} packets · feed frozen`
              : `live meter · ${charts.energy?.length || 0} packets`
          }
          icon={Database}
        >
          <div className={frozen ? 'h-80 opacity-60' : 'h-80'}>
            {charts.energy?.length ? (
              <TrendChart
                points={charts.energy}
                color="#16a34a"
                rgb="22,163,74"
                label="Energy"
                unit="kWh"
                decimals={2}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                <Database className="h-6 w-6 text-slate-300" />
                <p className="text-sm">En attente de paquets…</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Bill Forecast Trend"
          subtitle={
            model
              ? `${model.monthLabel} · run rate vs ${model.prev ? model.prev.label : 'no baseline'}`
              : 'awaiting billing snapshot'
          }
          icon={Activity}
        >
          {model ? (
            <BillForecastChart model={model} height="h-80" />
          ) : (
            <div className="flex h-80 flex-col items-center justify-center gap-2 text-slate-400">
              <Activity className="h-6 w-6 text-slate-300" />
              <p className="text-sm">Awaiting billing snapshot…</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ---------------- Advanced electrical detail (demoted) ---------------- */}
      <details className="wl-card overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition hover:bg-canvasAlt/60">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Activity className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <h2 className="wl-section-title">Electrical detail</h2>
              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                Advanced — voltage, current, frequency, power factor, derived powers and feed diagnostics
              </p>
            </div>
          </div>
          <ChevronDown className="wl-chevron h-4 w-4 shrink-0 text-slate-400" />
        </summary>

        <div className="space-y-4 border-t border-slate-100 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {DETAIL_METRICS.map((m) => (
              <div key={m.key}>
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-slate-500">
                  <span className="font-semibold">{m.title}</span>
                  <span className="tabular">
                    {fmt(
                      metrics[m.key] == null ? null : m.display(metrics[m.key]).value,
                      m.chartDecimals
                    )}{' '}
                    <span className="text-slate-400">{m.unit}</span>
                  </span>
                </div>
                <div className={frozen ? 'h-40 opacity-60' : 'h-40'}>
                  {charts[m.key]?.length ? (
                    <TrendChart
                      points={charts[m.key]}
                      color={m.color}
                      rgb={m.rgb}
                      label={m.title}
                      unit={m.unit}
                      decimals={m.chartDecimals}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-slate-200 text-[11px] text-slate-400">
                      En attente de paquets…
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <SectionCard
              title="État du flux temps réel"
              subtitle={packet ? `Dernier packet ${formatTime(packet.ts)}` : 'Aucun packet reçu'}
              icon={Radio}
            >
              <div className="space-y-3">
                <div className={`flex items-center justify-between rounded-md border px-3 py-2.5 ${flow.cls}`}>
                  <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <span className={`h-2 w-2 rounded-full pulse-dot ${flow.dot}`}></span>
                    {flow.label}
                  </span>
                  <span className="font-mono text-[10px]">
                    {frozen ? 'flux figé' : feed.ageSec == null ? 'en attente' : `il y a ${feed.ageSec} s`}
                  </span>
                </div>
                <dl className="space-y-2 font-mono text-[11px]">
                  <Row label="Paquets reçus" value={fmt(broker.messageCount || 0, 0)} />
                  <Row
                    label="Fréquence"
                    value={frozen || metrics.frequency == null ? '--' : `${fmt(metrics.frequency, 2)} Hz`}
                  />
                  <Row label="Source" value={packet?.src || '--'} />
                  <Row label="Horodatage ESP" value={packet?.ts ? formatTime(packet.ts) : '--'} />
                </dl>
              </div>
            </SectionCard>

            <SectionCard
              title="Grandeurs dérivées"
              subtitle={frozen ? 'Indisponible : flux figé' : 'Calculées depuis V, I et cos φ'}
              icon={Activity}
            >
              <DerivedRows metrics={metrics} pf={pf} frozen={frozen} noLoad={noLoad} />
            </SectionCard>

            <TelemetryLog packet={packet} broker={broker} />
          </div>
        </div>
      </details>
    </div>
  );
}

function DerivedRows({ metrics, pf, frozen, noLoad }) {
  const v = metrics.voltage;
  const a = metrics.current;
  const sVa = Number.isFinite(v) && Number.isFinite(a) ? v * a : null;
  const pW = Number.isFinite(metrics.power) ? metrics.power : sVa != null && pf != null ? sVa * pf : null;
  const qVar = sVa != null && pf != null ? sVa * Math.sqrt(Math.max(0, 1 - pf * pf)) : null;
  return (
    <dl className="space-y-2 font-mono text-[11px]">
      <Row label="Puissance active P" value={pW == null ? '--' : `${fmt(pW / 1000, 3)} kW`} />
      <Row label="Puissance apparente S" value={sVa == null ? '--' : `${fmt(sVa / 1000, 3)} kVA`} />
      <Row label="Puissance réactive Q" value={qVar == null ? '--' : `${fmt(qVar / 1000, 3)} kvar`} />
      <Row
        label="Facteur de puissance"
        value={
          frozen
            ? '--'
            : pf == null
              ? '--'
              : noLoad
                ? `${fmt(pf, 3)} · hors charge`
                : `${fmt(pf, 3)} ${pf >= PF_PENALTY ? '· correct' : '· pénalité'}`
        }
        tone={frozen || pf == null || noLoad ? 'default' : pf >= PF_PENALTY ? 'good' : 'critical'}
      />
    </dl>
  );
}

function Row({ label, value, tone = 'default' }) {
  const color =
    tone === 'critical' ? 'text-red-700' : tone === 'good' ? 'text-energy-600' : 'text-slate-800';
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold tabular ${color}`}>{value}</dd>
    </div>
  );
}
