import { useMemo } from 'react';
import { BarChart3, Cpu, Factory, Layers, PieChart, TriangleAlert, Zap } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import BarChart from '../components/BarChart';
import DonutChart from '../components/DonutChart';
import { CHIP } from '../lib/tags';
import { fmt } from '../lib/format';
import {
  BY_WORKSHOP,
  KPIS,
  MACHINES,
  OTHER_MACHINES,
  OTHER_MACHINES_KWH,
  PERIOD,
  SIMULATION_NOTE,
  TOP_MACHINES,
  TOP_MACHINE,
  TOTAL_KWH
} from '../lib/distributionData';

const KPI_ICONS = { total: Zap, topWorkshop: Factory, topMachine: Cpu, perWorkshop: Layers };

export default function DistributionEnergetique() {
  const donut = useMemo(
    () => ({
      labels: BY_WORKSHOP.map((w) => w.label),
      values: BY_WORKSHOP.map((w) => w.kwh),
      colors: BY_WORKSHOP.map((w) => w.color)
    }),
    []
  );

  const ranked = useMemo(() => TOP_MACHINES, []);
  const colorOf = useMemo(
    () => (id) => BY_WORKSHOP.find((w) => w.id === id)?.color || '#64748b',
    []
  );

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={PieChart}
        title="Distribution énergétique"
        subtitle={`Part de chaque atelier dans la consommation du mois, et poids de chaque poste machine. Période simulée : ${PERIOD.label}.`}
        scope="kWh · %"
        accent="#059669"
        status="Données simulées"
        statusClass={CHIP.amber}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {KPIS.map((k) => {
          const Icon = KPI_ICONS[k.key];
          return (
            <StatTile
              key={k.key}
              icon={Icon}
              label={k.label}
              value={fmt(k.value, 0)}
              sub={`${k.unit} · ${k.sub}`}
              accent={k.accent}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <SectionCard
          title="Répartition par Atelier"
          subtitle={`${BY_WORKSHOP.length} ateliers · ${fmt(TOTAL_KWH, 0)} kWh`}
          icon={PieChart}
        >
          <DonutChart
            labels={donut.labels}
            values={donut.values}
            colors={donut.colors}
            unit="kWh"
            decimals={0}
            centerValue={fmt(TOTAL_KWH, 0)}
            centerLabel="kWh · mois"
            height="h-56"
          />

          <ul className="mt-4 space-y-1.5">
            {BY_WORKSHOP.map((w) => (
              <li key={w.id} className="flex items-center gap-2 text-[11px]">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: w.color }}
                ></span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{w.label}</span>
                <span className="tabular shrink-0 font-mono text-slate-500">
                  {fmt(w.kwh, 0)}
                </span>
                <span className="tabular w-12 shrink-0 text-right font-semibold text-slate-900">
                  {fmt(w.share * 100, 1)}%
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          className="2xl:col-span-2"
          title="Consommation par poste / machine"
          subtitle={`${TOP_MACHINES.length} postes les plus énergivores sur ${MACHINES.length} · ${fmt(OTHER_MACHINES_KWH, 0)} kWh sur les ${OTHER_MACHINES.length} autres`}
          icon={BarChart3}
        >
          <BarChart
            horizontal
            label="kWh"
            labels={ranked.map((m) => m.label)}
            values={ranked.map((m) => m.kwh)}
            colors={ranked.map((m) => colorOf(m.workshop))}
            color="#059669"
            rgb="5,150,105"
            unit="kWh"
            decimals={0}
            height="h-[22rem]"
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
            {BY_WORKSHOP.map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-sm"
                  style={{ background: w.color }}
                ></span>
                {w.short}
              </span>
            ))}
          </div>

          {/*
            A canvas carries no text: without this the plotted values exist only as
            pixels, invisible to assistive tech and to any non-visual consumer.
          */}
          <table className="sr-only">
            <caption>Consommation par poste, période simulée {PERIOD.label}</caption>
            <thead>
              <tr>
                <th scope="col">Poste</th>
                <th scope="col">Atelier</th>
                <th scope="col">Énergie (kWh)</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m) => (
                <tr key={m.id}>
                  <th scope="row">{m.label}</th>
                  <td>{BY_WORKSHOP.find((w) => w.id === m.workshop)?.label || '--'}</td>
                  <td>{fmt(m.kwh, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} Poste le plus consommateur : {TOP_MACHINE.label} (
        {fmt(TOP_MACHINE.kwh, 0)} kWh).
      </p>
    </div>
  );
}
