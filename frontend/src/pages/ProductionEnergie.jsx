import { useMemo } from 'react';
import { GitCompareArrows, Package, Scale, TriangleAlert, Zap } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import ComboChart from '../components/ComboChart';
import { CHIP } from '../lib/tags';
import { fmt, fmtKwhUnit } from '../lib/format';
import {
  BEST_SEC,
  KPIS,
  PERIOD,
  PEAK_PRODUCTION,
  SEC_GLOBAL,
  SERIES,
  SIMULATION_NOTE,
  TOTAL_ENERGY,
  TOTAL_PRODUCTION,
  WORST_SEC
} from '../lib/productionData';

const KPI_ICONS = { sec: Scale, production: Package, energy: Zap, worstSec: TriangleAlert };

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
      <ModuleHeader
        icon={GitCompareArrows}
        title="Production & Consommation"
        subtitle={`Volumes produits et énergie consommée jour par jour, ${PERIOD.label}. La barre se lit à gauche, la courbe à droite : les pics de production se lisent directement sur l’énergie appelée.`}
        scope="pcs · kWh · kWh/pc"
        accent="#0f172a"
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
              value={fmt(k.value, k.key === 'production' || k.key === 'energy' ? 0 : 3)}
              sub={`${k.unit} · ${k.sub}`}
              accent={k.accent}
            />
          );
        })}
      </div>

      <SectionCard
        title="Production vs énergie consommée"
        subtitle={`${SERIES.length} jours · ${fmt(TOTAL_PRODUCTION, 0)} pcs pour ${fmt(TOTAL_ENERGY, 0)} kWh`}
        icon={GitCompareArrows}
        actions={
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
            SEC {fmtKwhUnit(SEC_GLOBAL)}
          </span>
        }
      >
        <ComboChart
          labels={chart.labels}
          bars={chart.production}
          barLabel="Production"
          barUnit="pcs"
          barRgb="5,150,105"
          barColor="#059669"
          line={chart.energy}
          lineLabel="Énergie"
          lineUnit="kWh"
          lineColor="#0f172a"
          lineDecimals={0}
          height="h-80"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
          <span>
            Pic production : {PEAK_PRODUCTION.label} · {fmt(PEAK_PRODUCTION.production, 0)} pcs
          </span>
          <span>
            SEC max : {WORST_SEC.label} · {fmtKwhUnit(WORST_SEC.sec)}
          </span>
          <span>
            SEC min : {BEST_SEC.label} · {fmtKwhUnit(BEST_SEC.sec)}
          </span>
        </div>

        {/*
          The axes are painted on a canvas, so without this table the daily
          production, energy and SEC exist only as pixels.
        */}
        <table className="sr-only">
          <caption>
            Production, énergie et SEC par jour — période simulée {PERIOD.label}
          </caption>
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

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} SEC global = {fmt(TOTAL_ENERGY, 0)} kWh / {fmt(TOTAL_PRODUCTION, 0)} pcs ={' '}
        {fmtKwhUnit(SEC_GLOBAL)}.
      </p>
    </div>
  );
}
