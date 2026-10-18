import { useMemo, useState } from 'react';
import { DatabaseZap, Building2, Gauge, Factory, Cpu, Zap, Power } from 'lucide-react';
import BarChart from '../components/BarChart';
import ComboChart from '../components/ComboChart';
import { SectionCard, StatTile, Bar, LoadingBlock } from '../components/StatTile';
import PageHeader from '../components/PageHeader';
import useWorkload from '../hooks/useWorkload';
import { useTelemetry } from '../context/TelemetryContext';
import { fmt, fmtKwh, fmtKwhUnit } from '../lib/format';
import { CHART_PRIMARY, CHART_PRIMARY_RGB } from '../lib/brand';

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

export default function VirtualPlant() {
  const { data, loading } = useWorkload(4000);
  const { packet, demo, toggleDemo } = useTelemetry();
  const [dept, setDept] = useState('');

  if (loading && !data) return <LoadingBlock label="Loading virtual plant…" />;
  if (!data) return <LoadingBlock label="Virtual plant unavailable — is the backend running?" />;

  const live = data.live;
  const depts = live.byDepartment || [];
  const scoped = dept ? depts.filter((d) => d.id === dept) : depts;
  const maxKva = Math.max(...scoped.map((d) => d.kva), 1);

  const peakProfileHour = useMemo(() => {
    let best = 0;
    data.profile.forEach((v, i) => {
      if (v > data.profile[best]) best = i;
    });
    return { hour: best, value: data.profile[best] };
  }, [data.profile]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Virtual plant"
        description="Deterministic simulated plant feeding the analytics modules when no hardware is connected"
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={Power}
          accent={CHART_PRIMARY}
          label="Generator state"
          value={data.running ? 'Running' : 'Paused'}
          sub={data.running ? `ticking every ${fmt(data.intervalMs / 1000, 1)} s` : 'feed idle or real MQTT detected'}
          tone={data.running ? 'good' : 'default'}
        />
        <StatTile
          icon={Gauge}
          accent={CHART_PRIMARY}
          label="Installed capacity"
          value={fmt(data.installedKva, 0)}
          sub={`kVA · ${fmt(data.effectiveKva, 0)} kVA effective`}
        />
        <StatTile
          icon={Zap}
          accent="#d97706"
          label="Utilisation factor"
          value={`${fmt(data.utilization * 100, 0)} %`}
          sub="of effective capacity"
        />
        <StatTile
          icon={Factory}
          accent={CHART_PRIMARY}
          label="Live demand"
          value={fmt(live.kva, 1)}
          sub={`kVA · ${fmt(live.kw, 1)} kW at ${String(live.hour).padStart(2, '0')}:00`}
        />
        <StatTile
          icon={Cpu}
          accent="#16A34A"
          label="Live output"
          value={fmt(live.unitsPerHour, 1)}
          sub={`pieces/h · cos φ ${fmt(live.pf, 2)}`}
        />
        <StatTile
          icon={DatabaseZap}
          accent="#0f172a"
          label="Modelled day"
          value={fmtKwh(data.modelledDayEnergy, 0)}
          sub={`kWh · ${fmt(data.dayUnits, 0)} pieces`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <SectionCard
          title="24-hour load profile"
          subtitle="Shape of the simulated working day — the driver behind every generated figure"
          icon={DatabaseZap}
          className="2xl:col-span-2"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-300 bg-white p-0.5">
                <button
                  onClick={() => setDept('')}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                    !dept ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All
                </button>
                {depts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDept(d.id)}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                      dept === d.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {d.short || d.name.split(' ')[0]}
                  </button>
                ))}
              </div>
              <button
                onClick={toggleDemo}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                  demo
                    ? 'border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {demo ? 'Stop feed' : 'Start feed'}
              </button>
            </div>
          }
        >
          {scoped.length ? (
            <ComboChart
              labels={HOUR_LABELS}
              bars={scoped.map((d) => d.kva)}
              barLabel={scoped.length === 1 ? `${scoped[0].name} demand` : 'Departmental demand'}
              barUnit="kVA"
              barRgb={CHART_PRIMARY_RGB}
              barColor={CHART_PRIMARY}
              line={data.profile}
              lineLabel="Plant load shape"
              lineUnit="×"
              lineColor="#475569"
              lineDecimals={2}
              height="h-72"
            />
          ) : (
            <div className="flex h-72 items-center justify-center text-sm text-slate-400">
              Awaiting a live plant sample…
            </div>
          )}
          <p className="mt-2 font-mono text-[10px] text-slate-500">
            busiest hour {String(peakProfileHour.hour).padStart(2, '0')}:00 at{' '}
            {fmt(peakProfileHour.value * 100, 0)}% of capacity · {data.season} season factor{' '}
            {fmt(data.demand * 100, 0)}% · surge {fmt(data.surge * 100, 0)}%
          </p>
        </SectionCard>

        <SectionCard
          title="Generator internals"
          subtitle="How the synthetic plant is parameterised"
          icon={DatabaseZap}
        >
          <dl className="space-y-2 font-mono text-[11px]">
            <Row label="Installed capacity" value={`${fmt(data.installedKva, 0)} kVA`} />
            <Row label="Effective capacity" value={`${fmt(data.effectiveKva, 0)} kVA`} />
            <Row label="Utilisation target" value={`${fmt(data.utilization * 100, 1)} %`} />
            <Row label="Demand factor now" value={`${fmt(data.demand * 100, 1)} %`} />
            <Row label="Surge factor now" value={`${fmt(data.surge * 100, 1)} %`} />
            <Row label="Season" value={data.season} />
            <Row label="Tick interval" value={`${fmt(data.intervalMs, 0)} ms`} />
            <Row label="Auxiliary draw" value={`${fmt(live.auxiliaryKva, 1)} kVA`} />
            <Row label="Energy today" value={fmtKwh(data.energy, 1)} />
            <Row label="Pieces today" value={fmt(data.units, 0)} />
            <Row label="Departments" value={fmt(data.departments.length, 0)} />
            <Row
              label="Workshops"
              value={fmt(data.departments.reduce((a, d) => a + d.workshops.length, 0), 0)}
            />
          </dl>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[10px] leading-4 text-slate-400">
            The generator is deterministic: the same date always yields the same energy, peak and output figures, so
            the audit and production pages stay consistent between restarts.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Plant topology"
        subtitle="Five departments, fifteen workshops — rated capacity, load shape and expected intensity"
        icon={Building2}
      >
        <div className="space-y-3">
          {data.departments.map((d) => {
            const liveDept = depts.find((x) => x.id === d.id);
            return (
              <div key={d.id} className="rounded-lg border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="flex items-center gap-2 text-[12px] font-bold text-slate-800">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }}></span>
                    {d.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    season ±{fmt(d.seasonAmp * 100, 0)}% · weekend ×{fmt(d.weekendFactor, 2)}
                    {liveDept && (
                      <>
                        {' '}
                        · <span className="font-bold text-slate-700">{fmt(liveDept.kva, 1)} kVA now</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 xl:grid-cols-3">
                  {d.workshops.map((w) => {
                    const liveW = liveDept?.workshops.find((x) => x.id === w.id);
                    return (
                      <div key={w.id} className="rounded-lg border border-slate-200 p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] font-semibold text-slate-800">{w.name}</span>
                            <span className="block font-mono text-[9px] text-slate-400">{w.shape} load</span>
                          </span>
                          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-600">
                            {fmt(w.peakKva, 0)} kVA
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 font-mono text-[9px] text-slate-500">
                          <div className="flex justify-between">
                            <span>cos φ {fmt(w.pf, 2)}</span>
                            <span>{w.kwhPerUnit == null ? 'auxiliary' : fmtKwhUnit(w.kwhPerUnit, 2)}</span>
                          </div>
                          {liveW && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">live</span>
                              <span className="font-semibold text-slate-700">
                                {fmt(liveW.kva, 1)} kVA
                                {liveW.unitsPerHour != null && ` · ${fmt(liveW.unitsPerHour, 1)} pc/h`}
                              </span>
                            </div>
                          )}
                        </div>
                        {liveW && (
                          <div className="mt-1.5">
                            <Bar value={liveW.kva} max={w.peakKva} color={d.color} height="h-1" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Live departmental output"
        subtitle="What each department is producing right now, in pieces per hour"
        icon={Cpu}
      >
        {scoped.length ? (
          <BarChart
            label="Units per hour"
            labels={scoped.map((d) => d.name)}
            values={scoped.map((d) => d.unitsPerHour ?? 0)}
            colors={scoped.map((d) => d.color)}
            unit="pieces/h"
            decimals={1}
            height="h-64"
          />
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-slate-400">No live sample yet.</div>
        )}
      </SectionCard>

      <SectionCard
        title="Generated packet"
        subtitle="The enriched telemetry frame the virtual plant publishes to the MQTT topic"
        icon={DatabaseZap}
      >
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-600">
          {packet ? JSON.stringify(packet, null, 2) : 'Awaiting packets…'}
        </pre>
      </SectionCard>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold tabular text-slate-800">{value}</dd>
    </div>
  );
}
