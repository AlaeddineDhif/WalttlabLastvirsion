import { useMemo, useState } from 'react';
import { Coins, Package, Receipt, TriangleAlert, Wallet } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import LineChart from '../components/LineChart';
import { CHIP } from '../lib/tags';
import { fmt, fmtPct, fmtTnd, fmtTndUnit } from '../lib/format';
import {
  BEST,
  DEFAULT_GRANULARITY,
  GRANULARITIES,
  KPIS,
  PERIOD,
  SIMULATION_NOTE,
  SPREAD,
  TARIFF,
  TOTAL_COST,
  TOTAL_PRODUCTION,
  UNIT_COST,
  WORST,
  granularity
} from '../lib/costData';

const KPI_ICONS = { production: Package, cost: Wallet, unitCost: Receipt };

export default function RatioCout() {
  const [level, setLevel] = useState(DEFAULT_GRANULARITY);
  const current = useMemo(() => granularity(level), [level]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={Coins}
        title="Ratio coût"
        subtitle={`Coût de l’énergie rapporté à la production, ${PERIOD.label}. Chaque point = coût énergétique de la période ÷ quantité produite : au-dessus de la moyenne, la période coûte cher à fabriquer.`}
        scope="TND · TND/pc"
        accent="#0d9488"
        status="Données simulées"
        statusClass={CHIP.amber}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.key];
          return (
            <StatTile
              key={k.key}
              icon={Icon}
              label={k.label}
              value={fmt(k.value, k.decimals)}
              sub={`${k.unit} · ${k.sub}`}
              accent={k.accent}
            />
          );
        })}
      </div>

      <SectionCard
        title="Coût énergétique par unité produite"
        subtitle={`${current.points.length} points · ${current.hint}`}
        icon={Coins}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-label="Granularité de la période"
            >
              {GRANULARITIES.map((g) => {
                const active = g.key === level;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setLevel(g.key)}
                    aria-pressed={active}
                    title={`${g.points.length} points, ${g.hint}`}
                    className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      active
                        ? 'border-teal-200 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
              Tarif {TARIFF.provider} {TARIFF.energyRate.toFixed(3)} {TARIFF.unit}
            </span>
          </div>
        }
      >
        <LineChart
          labels={current.points.map((p) => p.label)}
          values={current.points.map((p) => p.unitCost)}
          label="Coût par unité"
          unit="TND/pc"
          decimals={3}
          color="#0d9488"
          rgb="13,148,136"
          reference={UNIT_COST}
          referenceLabel="Moyenne du mois"
          height="h-72"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
          <span>
            Meilleur jour : {BEST.label} · {fmtTndUnit(BEST.unitCost)}
          </span>
          <span>
            Jour le plus cher : {WORST.label} · {fmtTndUnit(WORST.unitCost)}
          </span>
          <span>Écart max/min : {fmtPct(SPREAD, 0)}</span>
          <span>Moyenne mois : {fmtTndUnit(UNIT_COST)}</span>
        </div>

        {/*
          The series lives on a canvas, so without this table the cost per unit of
          every period would exist only as pixels. It also keeps the values readable
          whatever granularity is selected.
        */}
        <table className="sr-only">
          <caption>
            Coût énergétique par unité produite, par {current.label.toLowerCase()} — période
            simulée {PERIOD.label}
          </caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">Production (pcs)</th>
              <th scope="col">Énergie (kWh)</th>
              <th scope="col">Coût (TND)</th>
              <th scope="col">Coût par unité (TND/pc)</th>
            </tr>
          </thead>
          <tbody>
            {current.points.map((p) => (
              <tr key={p.key}>
                <th scope="row">
                  {p.label}
                  {p.detail ? ` (${p.detail})` : ''}
                </th>
                <td>{fmt(p.production, 0)}</td>
                <td>{fmt(p.energy, 0)}</td>
                <td>{fmt(p.cost, 2)}</td>
                <td>{fmt(p.unitCost, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} Coût par unité = {fmtTnd(TOTAL_COST)} /{' '}
        {fmt(TOTAL_PRODUCTION, 0)} pcs = {fmtTndUnit(UNIT_COST)}.
      </p>
    </div>
  );
}
