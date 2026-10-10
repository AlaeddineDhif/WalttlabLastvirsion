import { useMemo, useState } from 'react';
import { Siren, TriangleAlert, TrendingUp, Zap } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import LineChart from '../components/LineChart';
import { CHIP } from '../lib/tags';
import { fmt, fmtDT, fmtKva, fmtPct } from '../lib/format';
import {
  AVG_PEAK,
  CONTRACT,
  DEPASSEMENT_COUNT,
  DEFAULT_GRANULARITY,
  GRANULARITIES,
  HEADROOM,
  HIGHEST_SAFE_DAY,
  KPIS,
  PEAK_DAY,
  PERIOD,
  PRIME_ANNUAL,
  PRIME_MONTHLY,
  SIMULATION_NOTE,
  TOLERANCE_KVA,
  UTILISATION,
  chartProps,
  granularity
} from '../lib/puissanceData';

const KPI_ICONS = { ps: Zap, peak: TrendingUp, count: Siren };

export default function SurveillanceDepassement() {
  const [level, setLevel] = useState(DEFAULT_GRANULARITY);
  const current = useMemo(() => granularity(level), [level]);
  const chart = useMemo(() => chartProps(level), [level]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={Siren}
        title="Surveillance du dépassement"
        subtitle={`Pointe appelée jour par jour comparée à la puissance souscrite Ps, ${PERIOD.label}. Tout point au-dessus de la ligne rouge est un dépassement : il alimente le registre repris par les Alertes.`}
        scope="kVA · %"
        accent="#059669"
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
              tone={k.tone}
            />
          );
        })}
      </div>

      <SectionCard
        title="Pointe appelée vs puissance souscrite"
        subtitle={`${current.points.length} points · ${current.hint}`}
        icon={TrendingUp}
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
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700">
              <span aria-hidden="true" className="h-0.5 w-3 bg-rose-500"></span>
              Ps {fmt(CONTRACT.ps, 1)} kVA
            </span>
          </div>
        }
      >
        <LineChart
          labels={chart.labels}
          values={chart.values}
          label="Pointe appelée"
          unit={chart.unit}
          decimals={1}
          color="#059669"
          rgb="5,150,105"
          reference={chart.reference}
          referenceLabel={`Puissance souscrite Ps ${fmt(CONTRACT.ps, 1)} kVA`}
          referenceColor={chart.referenceColor}
          highlightAbove={chart.highlightAbove}
          highlightColor="#dc2626"
          zeroBased
          height="h-80"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-rose-600"></span>
            Dépassement de Ps
          </span>
          <span>Moyenne des pointes : {fmtKva(AVG_PEAK)}</span>
          <span>
            Marge max utilisée : {fmtKva(HEADROOM)} ({HIGHEST_SAFE_DAY.label})
          </span>
          <span>
            Prime STEG : {fmtDT(PRIME_MONTHLY)}/mois · {fmtDT(PRIME_ANNUAL)}/an
          </span>
          <span>Tolérance : {fmtKva(TOLERANCE_KVA)}</span>
        </div>

        {/*
          The peaks live on a canvas, so without this table the year of demand would
          exist only as pixels. It repeats the limit, so a reader can check any row
          against Ps without reading the axis.
        */}
        <table className="sr-only">
          <caption>
            Pointe appelée par {current.label.toLowerCase()} comparée à Ps ={' '}
            {fmt(CONTRACT.ps, 1)} kVA — période simulée {PERIOD.label}
          </caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">Pointe (kVA)</th>
              <th scope="col">Moyenne (kVA)</th>
              <th scope="col">Dépassement de Ps</th>
            </tr>
          </thead>
          <tbody>
            {current.points.map((p) => (
              <tr key={p.key}>
                <th scope="row">{p.label}</th>
                <td>{fmt(p.peakKva, 1)}</td>
                <td>{fmt(p.averageKva, 1)}</td>
                <td>{p.peakKva > CONTRACT.ps ? 'Oui' : 'Non'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/*
        Overview statistics only. The registered overruns themselves live in the
        Alertes sub-module: this screen describes the year, that one describes the
        days that went over the line.
      */}
      <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-600">
        <TrendingUp className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600" />
        <span>
          Pointe maximale de l’année : {fmtKva(PEAK_DAY.peakKva)} le {PEAK_DAY.label} à{' '}
          {String(PEAK_DAY.hour).padStart(2, '0')}h00, soit {fmtPct(UTILISATION)} de Ps. Les{' '}
          {DEPASSEMENT_COUNT} jour{DEPASSEMENT_COUNT > 1 ? 's' : ''} au-dessus de la ligne rouge
          sont détaillés dans le module Alertes.
        </span>
      </p>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} Prime {fmtDT(CONTRACT.primeRatePerKvaPerMonth)}/kVA/mois et pénalité{' '}
        {fmtDT(CONTRACT.penaltyRatePerKvaPerMonth)}/kVA/mois, alignés sur le moteur tarifaire du
        backend.
      </p>
    </div>
  );
}
