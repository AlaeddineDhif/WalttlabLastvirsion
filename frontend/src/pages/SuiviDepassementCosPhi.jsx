import { useMemo, useState } from 'react';
import { Sigma, TrendingUp, TriangleAlert } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import LineChart from '../components/LineChart';
import { CHIP } from '../lib/tags';
import { fmt, fmtCosPhi, fmtKvarh } from '../lib/format';
import { CHART_PRIMARY, CHART_PRIMARY_RGB } from '../lib/brand';
import {
  ALERT_SUMMARY,
  AVG_COSPHI,
  AXIS,
  BREACH_COUNT,
  CONTRACT,
  DEFAULT_GRANULARITY,
  GRANULARITIES,
  HOURS_BELOW,
  KPIS,
  MIN_COSPHI,
  MONTHLY,
  PERIOD,
  SIMULATION_NOTE,
  chartProps,
  granularity
} from '../lib/cosPhiData';

const KPI_ICONS = { threshold: Sigma, min: TrendingUp, count: TriangleAlert };

/**
 * Suivi de dépassement: the year of power factor, the contractual floor, and the
 * breaches counted.
 *
 * The breach register itself is deliberately absent. The Alertes sub-module owns
 * the day-by-day cards, and printing them here too would put the same five alerts
 * on two screens that a reader has to choose between — the exact duplication the
 * Puissance souscrite split exists to prevent. This screen describes the year; the
 * other one describes the days that went under the line.
 */
export default function SuiviDepassementCosPhi() {
  const [level, setLevel] = useState(DEFAULT_GRANULARITY);
  const current = useMemo(() => granularity(level), [level]);
  const chart = useMemo(() => chartProps(level), [level]);

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={TrendingUp}
        title="Suivi de dépassement"
        subtitle={`Facteur de puissance jour par jour comparé au seuil contractuel de ${fmt(CONTRACT.threshold, 2)}, ${PERIOD.label}. Tout point sous la ligne rouge est un franchissement : il alimente le registre repris par les Alertes.`}
        scope="cos φ · durée"
        accent={CHART_PRIMARY}
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
        title="Facteur de puissance vs seuil contractuel"
        subtitle={`${current.points.length} points · ${current.hint}`}
        icon={Sigma}
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
                    title={g.hint}
                    className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      active
                        ? 'border-brand-200 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-red-700">
              <span aria-hidden="true" className="h-0.5 w-3 bg-red-500"></span>
              Seuil {fmt(CONTRACT.threshold, 2)}
            </span>
          </div>
        }
      >
        <LineChart
          labels={chart.labels}
          values={chart.values}
          label="Cos φ"
          unit="cos φ"
          decimals={2}
          color={CHART_PRIMARY}
          rgb={CHART_PRIMARY_RGB}
          reference={chart.reference}
          referenceLabel={chart.referenceLabel}
          referenceColor={chart.referenceColor}
          highlightBelow={chart.highlightBelow}
          highlightColor="#dc2626"
          yMin={chart.yMin}
          yMax={chart.yMax}
          height="h-80"
        />

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-600"></span>
            Sous le seuil de {fmt(CONTRACT.threshold, 2)}
          </span>
          <span>Moyenne annuelle : {fmtCosPhi(AVG_COSPHI)}</span>
          <span>
            Creux le plus bas : {fmtCosPhi(MIN_COSPHI.cosPhi)} ({MIN_COSPHI.label})
          </span>
          <span>
            Énergie réactive hors bande : {fmtKvarh(ALERT_SUMMARY.billableKvarh)}
          </span>
          <span>Durée cumulée sous seuil : {HOURS_BELOW} h</span>
        </div>

        {/*
          The curve lives on a canvas, so without this table the year of power factor
          would exist only as pixels. It repeats the floor, so a reader can check any
          row against the threshold without reading the axis.
        */}
        <table className="sr-only">
          <caption>
            Facteur de puissance par {current.label.toLowerCase()} comparé au seuil de{' '}
            {fmt(CONTRACT.threshold, 2)} — période simulée {PERIOD.label}
          </caption>
          <thead>
            <tr>
              <th scope="col">Période</th>
              <th scope="col">Cos φ</th>
              <th scope="col">Sous le seuil</th>
            </tr>
          </thead>
          <tbody>
            {current.points.map((p) => {
              const value = level === 'mois' ? p.minCosPhi : p.cosPhi;
              return (
                <tr key={p.key}>
                  <th scope="row">{p.label}</th>
                  <td>{fmtCosPhi(value)}</td>
                  <td>{value < CONTRACT.threshold ? 'Oui' : 'Non'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </SectionCard>

      {/*
        Overview statistics only, and a pointer rather than a preview: the
        registered breaches themselves live in the Alertes sub-module.
      */}
      <p className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[11px] leading-4 text-slate-600">
        <TrendingUp className="mt-px h-3.5 w-3.5 shrink-0 text-brand-600" />
        <span>
          Cos φ le plus bas de l’année : {fmtCosPhi(MIN_COSPHI.cosPhi)} le {MIN_COSPHI.label}, soit{' '}
          {fmtCosPhi(CONTRACT.threshold - MIN_COSPHI.cosPhi)} sous le seuil contractuel. Les{' '}
          {BREACH_COUNT} jour{BREACH_COUNT > 1 ? 's' : ''} sous la ligne rouge,	totalis{' '}
          {fmtKvarh(ALERT_SUMMARY.billableKvarh)} de réactif facturable et sont détaillés dans le
          module Alertes.
        </span>
      </p>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} Seuil {fmt(CONTRACT.threshold, 2)} et tarifs de puissance alignés sur le
        moteur tarifaire du backend ; le tarif réactif de{' '}
        {fmt(CONTRACT.reactiveRatePerKvarh, 2)} DT/kvarh est une hypothèse propre à cette vue, le
        moteur STEG ne facturant aujourd’hui que la prime et le dépassement de puissance.
      </p>

      {/* Month-by-month floor, kept as a compact strip: the curve answers "when",
          this answers "which months carry the risk". */}
      <SectionCard
        title="Creux par mois"
        subtitle={`Minimum mensuel de cos φ · ${MONTHLY.filter((m) => m.breached).length} mois sous le seuil`}
        icon={Sigma}
      >
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {MONTHLY.map((m) => {
            const breached = m.minCosPhi < CONTRACT.threshold;
            return (
              <li
                key={m.key}
                className={`rounded-lg border px-2 py-1.5 text-center ${
                  breached ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {m.label}
                </div>
                <div
                  className={`tabular font-mono text-[12px] font-bold ${
                    breached ? 'text-red-700' : 'text-slate-800'
                  }`}
                >
                  {fmtCosPhi(m.minCosPhi)}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 font-mono text-[10px] text-slate-500">
          Axe figé entre {fmt(AXIS.min, 2)} et {fmt(AXIS.max, 2)} : la position de la ligne rouge est
          comparable d’un mois à l’autre.
        </p>
      </SectionCard>
    </div>
  );
}
