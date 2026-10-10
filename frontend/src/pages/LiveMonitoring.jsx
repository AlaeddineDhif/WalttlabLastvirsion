import { useMemo, useState } from 'react';
import { Activity, TrendingUp, Building2 } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import TelemetryLog from '../components/TelemetryLog';
import ComboChart from '../components/ComboChart';
import { SectionCard, Bar } from '../components/StatTile';
import { METRICS } from '../lib/metrics';
import { useTelemetry } from '../context/TelemetryContext';
import { fmt, fmtKwh } from '../lib/format';

const TABS = [
  { id: 'voltage', label: 'Voltage' },
  { id: 'current', label: 'Current' },
  { id: 'power', label: 'Active power' },
  { id: 'energy', label: 'Energy' },
  { id: 'frequency', label: 'Frequency' },
  { id: 'cosPhi', label: 'Power factor' }
];

export default function LiveMonitoring() {
  const { metrics, charts, packet, broker, feed } = useTelemetry();
  const [tab, setTab] = useState('power');

  const active = TABS.find((t) => t.id === tab) || TABS[0];
  const metric = METRICS.find((m) => m.key === active.id) || METRICS[0];

  const frozen = feed.isFrozen;
  const live = packet?.live;
  const depts = live?.byDepartment || [];
  const maxKva = useMemo(() => Math.max(...depts.map((d) => d.kva), 1), [depts]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {METRICS.map((m) => (
          <MetricCard
            key={m.key}
            metric={m}
            value={metrics[m.key] ?? null}
            time={packet?.ts}
            penalty={m.key === 'cosPhi' && metrics.cosPhi != null && Math.abs(metrics.cosPhi) < 0.85}
            frozen={frozen}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <SectionCard
          title="Live trend"
          subtitle={
            frozen
              ? `${active.label} · last ${charts[active.id]?.length || 0} packets · frozen`
              : `${active.label} · last ${charts[active.id]?.length || 0} packets`
          }
          icon={TrendingUp}
          className="2xl:col-span-2"
          actions={
            <div className="flex flex-wrap gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide transition ${
                    t.id === tab
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-72">
            {charts[active.id]?.length ? (
              <div className={frozen ? 'h-full opacity-60' : 'h-full'}>
                <TrendChart
                  points={charts[active.id]}
                  color={metric.color}
                  rgb={metric.rgb}
                  label={metric.title}
                  unit={metric.unit}
                  decimals={metric.chartDecimals}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Awaiting telemetry packets…
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Departmental load split"
          subtitle={live ? `${fmt(live.kva, 1)} kVA · ${fmt(live.kw, 1)} kW at ${String(live.hour).padStart(2, '0')}:00` : 'Waiting for the virtual plant'}
          icon={Building2}
        >
          {!live ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              {packet ? 'Live packets carry no departmental split' : 'Awaiting telemetry packets…'}
            </div>
          ) : (
            <div className="space-y-3">
              {depts.map((d) => (
                <div key={d.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }}></span>
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular text-slate-600">
                      {fmt(d.kva, 1)} kVA
                    </span>
                  </div>
                  <Bar value={d.kva} max={maxKva} color={d.color} />
                  <div className="mt-1 flex justify-between font-mono text-[9px] text-slate-400">
                    <span>{fmt(d.kw, 1)} kW · cos φ {fmt(d.pf, 2)}</span>
                    <span>
                      {d.kwhPerUnit != null ? `${fmt(d.kwhPerUnit, 2)} kWh/pc` : 'auxiliary'}
                    </span>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Units / hour</p>
                  <p className="text-base font-bold tabular text-slate-900">{fmt(live.unitsPerHour, 1)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Auxiliary</p>
                  <p className="text-base font-bold tabular text-slate-900">{fmt(live.auxiliaryKva, 1)} kVA</p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <SectionCard
          title="Energy vs. production"
          subtitle="Last 24 hourly samples — consumption against units produced"
          icon={Activity}
          className="2xl:col-span-2"
        >
          {charts.power?.length > 2 ? (
            <ComboChart
              labels={charts.power.slice(-24).map((p) => new Date(p.t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}
              bars={charts.energy.slice(-24).map((p) => p.v)}
              barLabel="Cumulative energy"
              barUnit="kWh"
              barRgb="79,70,229"
              barColor="#4f46e5"
              line={charts.power.slice(-24).map((p) => p.v)}
              lineLabel="Active power"
              lineUnit="kW"
              lineColor="#0284c7"
              lineDecimals={2}
              height="h-64"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              Collecting samples…
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <TelemetryLog packet={packet} broker={broker} />
          <SectionCard
            title="Session readout"
            subtitle={frozen ? 'Frozen at the last received packet' : 'Values from the latest packet'}
            icon={Activity}
          >
            <dl className="space-y-2 font-mono text-[11px]">
              <Row label="Packets received" value={fmt(broker.messageCount || 0, 0)} />
              <Row label="Cumulative energy" value={frozen ? '--' : fmtKwh(metrics.energy, 1)} />
              <Row
                label="Active power"
                value={frozen || metrics.power == null ? '--' : `${fmt(metrics.power / 1000, 2)} kW`}
              />
              <Row
                label="Live apparent power"
                value={frozen || packet?.kva == null ? '--' : `${fmt(packet.kva, 1)} kVA`}
              />
              <Row
                label="Power factor"
                value={frozen || metrics.cosPhi == null ? '--' : fmt(Math.abs(metrics.cosPhi), 2)}
              />
              <Row
                label="Units cumulative"
                value={frozen || packet?.units == null ? '--' : fmt(packet.units, 0)}
              />
            </dl>
          </SectionCard>
        </div>
      </div>
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
