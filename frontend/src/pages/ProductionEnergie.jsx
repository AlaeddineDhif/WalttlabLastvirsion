import { useMemo } from 'react';
import { GitCompareArrows, ReceiptText, Scale, TriangleAlert } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PageHeader, { PageStat } from '../components/PageHeader';
import { SectionCard } from '../components/StatTile';
import ComboChart from '../components/ComboChart';
import BarChart from '../components/BarChart';
import LineChart from '../components/LineChart';
import { fmt, fmtDTUnit, fmtKwhUnit } from '../lib/format';
import { CHART_PRIMARY, CHART_PRIMARY_RGB, CHART_SECONDARY } from '../lib/brand';
import { TARIFF, TOTAL_COST, UNIT_COST, DAILY } from '../lib/costData';
import {
  BEST_SEC,
  PERIOD,
  PEAK_PRODUCTION,
  SEC_GLOBAL,
  SERIES,
  SIMULATION_NOTE,
  TOTAL_ENERGY,
  TOTAL_PRODUCTION,
  WORST_SEC
} from '../lib/productionData';

/**
 * Production Analytics, manager edition.
 *
 * The page answers one question the old layout buried: how efficiently does the
 * plant turn energy into output, and what is that inefficiency worth?
 *
 *  - Efficiency = the energy the plant WOULD have used running every day at its
 *    own best day's SEC, over the energy it actually used. 100% is the plant's
 *    own demonstrated best practice — a fair, self-referenced target.
 *  - Savings potential = the kWh gap priced at the declared tariff.
 *
 * All figures derive from the same simulated dataset that reconciles with the
 * Distribution module, so nothing here can drift from the other views.
 */
const EFFICIENCY = (BEST_SEC.sec * TOTAL_PRODUCTION) / TOTAL_ENERGY;
const SAVINGS_KWH = TOTAL_ENERGY - BEST_SEC.sec * TOTAL_PRODUCTION;
const SAVINGS_DT = SAVINGS_KWH * TARIFF.energyRate;
const WORST_GAP_DT = (WORST_SEC.sec - BEST_SEC.sec) * WORST_SEC.production * TARIFF.energyRate;

const DAILY_EFF = SERIES.map((d) => (d.sec > 0 ? BEST_SEC.sec / d.sec : null));

const KPIS = [
  {
    key: 'sec',
    label: 'Specific energy (SEC)',
    value: fmt(SEC_GLOBAL, 3),
    unit: 'kWh/pc',
    series: SERIES.map((d) => d.sec),
    color: '#16a34a',
    good: 'down',
    status: {
      label: `${fmt((SEC_GLOBAL / BEST_SEC.sec - 1) * 100, 0)}% above best day`,
      state: 'amber'
    },
    hint: `best day ${fmtKwhUnit(BEST_SEC.sec)}`
  },
  {
    key: 'efficiency',
    label: 'Production efficiency',
    value: fmt(EFFICIENCY * 100, 0),
    unit: '%',
    series: DAILY_EFF,
    color: '#16A34A',
    good: 'up',
    status:
      EFFICIENCY >= 0.85
        ? { label: 'strong', state: 'energy' }
        : { label: 'improvable', state: 'amber' },
    hint: 'vs your own best-day practice'
  },
  {
    key: 'production',
    label: 'Production',
    value: fmt(TOTAL_PRODUCTION, 0),
    unit: 'pcs',
    series: SERIES.map((d) => d.production),
    color: '#0f172a',
    good: 'flat',
    status: { label: PERIOD.label, state: 'slate' },
    hint: `peak ${fmt(PEAK_PRODUCTION.production, 0)} pcs · ${PEAK_PRODUCTION.label}`
  },
  {
    key: 'energy',
    label: 'Consumption',
    value: fmt(TOTAL_ENERGY, 0),
    unit: 'kWh',
    series: SERIES.map((d) => d.energy),
    color: '#16A34A',
    good: 'down',
    status: { label: `${PERIOD.hours} h`, state: 'slate' },
    hint: `${fmtKwhUnit(SEC_GLOBAL)} per piece`
  },
  {
    key: 'cost',
    label: 'Energy cost',
    value: fmt(TOTAL_COST, 0),
    unit: 'TND',
    series: SERIES.map((d) => d.energy * TARIFF.energyRate),
    color: CHART_PRIMARY,
    good: 'down',
    status: { label: `${TARIFF.energyRate.toFixed(3)} TND/kWh`, state: 'slate' },
    hint: 'energy HT · simulated tariff'
  },
  {
    key: 'unitCost',
    label: 'Cost per unit',
    value: fmtDTUnit(UNIT_COST, 3),
    unit: '',
    series: DAILY.map((d) => d.unitCost),
    color: CHART_SECONDARY,
    good: 'down',
    status: { label: `${PERIOD.days} days avg`, state: 'slate' },
    hint: 'energy cost ÷ output'
  }
];

export default function ProductionEnergie() {
  const chart = useMemo(
    () => ({
      labels: SERIES.map((d) => d.label),
      production: SERIES.map((d) => d.production),
      energy: SERIES.map((d) => d.energy)
    }),
    []
  );

  return (
    <div className="space-y-4">
      {/* ---------------- Page header ---------------- */}
      <PageHeader
        title="Production analytics"
        description={`${PERIOD.label} · ${SERIES.length} days · SEC, cost per unit and savings potential vs the plant's own best day`}
      >
        <PageStat label="Efficiency" value={fmt(EFFICIENCY * 100, 0)} unit="%" tone="energy" />
        <PageStat label="Savings potential" value={fmt(SAVINGS_DT, 0)} unit="DT" />
        <PageStat label="Best-day SEC" value={fmt(BEST_SEC.sec, 3)} unit="kWh/pc" />
      </PageHeader>

      {/* ---------------- KPI strip ---------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {KPIS.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            unit={k.unit}
            series={k.series}
            color={k.color}
            status={k.status}
            hint={k.hint}
            goodDirection={k.good}
          />
        ))}
      </div>

      {/* ---------------- Main correlation + savings opportunity ---------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8 2xl:col-span-9">
          <SectionCard
            title="Production vs consumption"
            subtitle={`${fmt(TOTAL_PRODUCTION, 0)} pcs · ${fmt(TOTAL_ENERGY, 0)} kWh · SEC ${fmtKwhUnit(SEC_GLOBAL)}`}
            icon={GitCompareArrows}
          >
            <ComboChart
              labels={chart.labels}
              bars={chart.production}
              barLabel="Production"
              barUnit="pcs"
              barRgb={CHART_PRIMARY_RGB}
              barColor={CHART_PRIMARY}
              line={chart.energy}
              lineLabel="Énergie"
              lineUnit="kWh"
              lineColor="#16A34A"
              lineDecimals={0}
              height="h-96"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
              <span>Pic production : {PEAK_PRODUCTION.label} · {fmt(PEAK_PRODUCTION.production, 0)} pcs</span>
              <span>SEC max : {WORST_SEC.label} · {fmtKwhUnit(WORST_SEC.sec)}</span>
              <span>SEC min : {BEST_SEC.label} · {fmtKwhUnit(BEST_SEC.sec)}</span>
            </div>

            <table className="sr-only">
              <caption>Production, énergie et SEC par jour — {PERIOD.label}</caption>
              <thead>
                <tr>
                  <th scope="col">Jour</th>
                  <th scope="col">Production (pcs)</th>
                  <th scope="col">Énergie (kWh)</th>
                  <th scope="col">SEC (kWh/pc)</th>
                </tr>
              </thead>
              <tbody>
                {SERIES.map((d) => (
                  <tr key={d.day}>
                    <th scope="row">{d.label}</th>
                    <td>{fmt(d.production, 0)}</td>
                    <td>{fmt(d.energy, 0)}</td>
                    <td>{fmt(d.sec, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>

        {/* Savings opportunity, quantified from the plant's own best practice */}
        <div className="xl:col-span-4 2xl:col-span-3">
          <section className="wl-card h-full">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="wl-section-title">Savings opportunity</h2>
              <p className="text-[10.5px] text-slate-400">If every day matched your best day</p>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-end gap-2">
                <span className="text-[26px] font-semibold leading-none tabular text-slate-900">
                  {fmt(SAVINGS_DT, 0)}
                </span>
                <span className="mb-0.5 text-[11px] font-medium text-slate-400">DT / mois</span>
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-slate-400">
                {fmt(SAVINGS_KWH, 0)} kWh · {fmt((SAVINGS_KWH / TOTAL_ENERGY) * 100, 1)}% of the
                month’s consumption
              </p>

              <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                <BestWorstRow
                  day={BEST_SEC.label}
                  title="Best day practice"
                  value={fmtKwhUnit(BEST_SEC.sec)}
                  note={`${fmt(BEST_SEC.production, 0)} pcs · ${fmt(BEST_SEC.energy, 0)} kWh`}
                  tone="good"
                />
                <BestWorstRow
                  day={WORST_SEC.label}
                  title="Weakest day"
                  value={fmtKwhUnit(WORST_SEC.sec)}
                  note={`≈ ${fmt(WORST_GAP_DT, 0)} DT above best practice that day`}
                  tone="warn"
                />
              </div>

              <div className="mt-4">
                <div className="wl-kpi-label text-[9.5px]">Target</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  Hold SEC under{' '}
                  <span className="font-semibold text-slate-900">{fmtKwhUnit(BEST_SEC.sec * 1.1)}</span>{' '}
                  on weekdays and the month closes near{' '}
                  <span className="font-semibold text-slate-900">
                    {fmt(BEST_SEC.sec * 1.1 * TOTAL_PRODUCTION * TARIFF.energyRate, 0)} DT
                  </span>
                  .
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ---------------- Daily intensity charts ---------------- */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard
          title="SEC per day"
          subtitle="Specific energy consumption vs the monthly average"
          icon={Scale}
          actions={
            <span className="font-mono text-[10px] text-slate-400">
              best {fmtKwhUnit(BEST_SEC.sec)}
            </span>
          }
        >
          <BarChart
            label="SEC"
            labels={SERIES.map((d) => d.label)}
            values={SERIES.map((d) => d.sec)}
            rgb="22,163,74"
            color="#16a34a"
            unit="kWh/pc"
            decimals={3}
            threshold={SEC_GLOBAL}
            thresholdLabel="Moyenne"
            height="h-72"
          />
        </SectionCard>

        <SectionCard
          title="Cost per unit per day"
          subtitle={`Daily energy cost ÷ daily output · ${TARIFF.energyRate.toFixed(3)} ${TARIFF.unit}`}
          icon={ReceiptText}
          actions={
            <span className="font-mono text-[10px] text-slate-400">
              avg {fmtDTUnit(UNIT_COST, 3)}
            </span>
          }
        >
          <LineChart
            labels={DAILY.map((d) => d.label)}
            values={DAILY.map((d) => d.unitCost)}
            label="Coût / pièce"
            unit="TND/pc"
            decimals={3}
            rgb={CHART_PRIMARY_RGB}
            color={CHART_PRIMARY}
            reference={UNIT_COST}
            referenceLabel="Moyenne période"
            highlightAbove={UNIT_COST}
            highlightColor="#dc2626"
            height="h-72"
          />
        </SectionCard>
      </div>

      <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[10.5px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} SEC global = {fmt(TOTAL_ENERGY, 0)} kWh / {fmt(TOTAL_PRODUCTION, 0)} pcs ={' '}
        {fmtKwhUnit(SEC_GLOBAL)}.
      </p>
    </div>
  );
}

function BestWorstRow({ day, title, value, note, tone }) {
  const good = tone === 'good';
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[11.5px] font-medium text-slate-700">{title}</span>
          <span className="font-mono text-[9.5px] uppercase tracking-wide text-slate-400">{day}</span>
        </div>
        <div className="font-mono text-[9.5px] text-slate-400">{note}</div>
      </div>
      <span
        className={`shrink-0 text-[14px] font-semibold tabular ${good ? 'text-energy-700' : 'text-amber-700'}`}
      >
        {value}
      </span>
    </div>
  );
}
