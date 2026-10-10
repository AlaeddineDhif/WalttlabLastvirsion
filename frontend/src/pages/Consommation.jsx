import { useMemo } from 'react';
import { Activity, Radio } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import TrendChart from '../components/TrendChart';
import TelemetryLog from '../components/TelemetryLog';
import { SectionCard } from '../components/StatTile';
import { METRICS } from '../lib/metrics';
import { useTelemetry, NO_LOAD_AMP } from '../context/TelemetryContext';
import { fmt, formatTime } from '../lib/format';

const KEYS = ['voltage', 'current', 'power', 'cosPhi'];
const CARDS = METRICS.filter((m) => KEYS.includes(m.key));
const PF_PENALTY = 0.85;

const FLOW = {
  connected: { cls: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Connecté' },
  connecting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Connexion' },
  reconnecting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Reconnexion' },
  offline: { cls: 'border-slate-300 bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Hors ligne' },
  error: { cls: 'border-rose-300 bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Erreur' }
};

export default function Consommation() {
  const { metrics, charts, packet, broker, feed } = useTelemetry();

  const flow = FLOW[broker.state] || FLOW.connecting;
  const frozen = feed.isFrozen;
  const pf = metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi);
  // Derived verdicts need a live current reading: a frozen non-zero current would
  // otherwise keep asserting "hors charge" or "pénalité" on a dead measurement.
  const noLoad = frozen || !(Math.abs(metrics.current || 0) > NO_LOAD_AMP);
  const ageSec = feed.ageSec;

  const derived = useMemo(() => {
    if (frozen) return { kva: null, kw: null, kvar: null };
    const v = metrics.voltage;
    const a = metrics.current;
    const sVa = Number.isFinite(v) && Number.isFinite(a) ? v * a : null;
    const pW = Number.isFinite(metrics.power) ? metrics.power : sVa != null && pf != null ? sVa * pf : null;
    const qVar = sVa != null && pf != null ? sVa * Math.sqrt(Math.max(0, 1 - pf * pf)) : null;
    return {
      kva: sVa == null ? null : sVa / 1000,
      kw: pW == null ? null : pW / 1000,
      kvar: qVar == null ? null : qVar / 1000
    };
  }, [frozen, metrics.voltage, metrics.current, metrics.power, pf]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {CARDS.map((m) => (
          <MetricCard
            key={m.key}
            metric={m}
            value={metrics[m.key] ?? null}
            time={packet?.ts}
            penalty={m.key === 'cosPhi' && !noLoad && pf != null && pf < PF_PENALTY}
            idle={m.key === 'cosPhi' && noLoad}
            frozen={frozen}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:col-span-2">
          {CARDS.map((m) => (
            <SectionCard
              key={m.key}
              title={m.title}
              subtitle={
                frozen
                  ? `${charts[m.key]?.length || 0} derniers packets · historique figé`
                  : `${charts[m.key]?.length || 0} derniers packets`
              }
              icon={m.icon}
              actions={
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-bold tabular text-slate-700">
                  {fmt(metrics[m.key] == null ? null : m.display(metrics[m.key]).value, m.decimals)}{' '}
                  <span className="text-[9px] font-semibold text-slate-400">{m.unit}</span>
                </span>
              }
            >
              <div className="h-48">
                {charts[m.key]?.length ? (
                  <div className={frozen ? 'h-full opacity-60' : 'h-full'}>
                    <TrendChart
                      points={charts[m.key]}
                      color={m.color}
                      rgb={m.rgb}
                      label={m.title}
                      unit={m.unit}
                      decimals={m.chartDecimals}
                    />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    En attente de paquets…
                  </div>
                )}
              </div>
            </SectionCard>
          ))}
        </div>

        <div className="space-y-4">
          <SectionCard
            title="État du flux temps réel"
            subtitle={packet ? `Dernier packet ${formatTime(packet.ts)}` : 'Aucun packet reçu'}
            icon={Radio}
          >
            <div className="space-y-3">
              <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${flow.cls}`}>
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                  <span className={`h-2 w-2 rounded-full pulse-dot ${flow.dot}`}></span>
                  {flow.label}
                </span>
                <span className="font-mono text-[10px]">
                  {frozen ? 'flux figé' : ageSec == null ? 'en attente' : `il y a ${ageSec} s`}
                </span>
              </div>

              <dl className="space-y-2 font-mono text-[11px]">
                <Row label="Paquets reçus" value={fmt(broker.messageCount || 0, 0)} />
                <Row
                  label="Fréquence"
                  value={frozen || metrics.frequency == null ? '--' : `${fmt(metrics.frequency, 2)} Hz`}
                />
                <Row
                  label="Énergie cumulée"
                  value={frozen || metrics.energy == null ? '--' : `${fmt(metrics.energy, 2)} kWh`}
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
            <dl className="space-y-2 font-mono text-[11px]">
              <Row label="Puissance active P" value={derived.kw == null ? '--' : `${fmt(derived.kw, 3)} kW`} />
              <Row label="Puissance apparente S" value={derived.kva == null ? '--' : `${fmt(derived.kva, 3)} kVA`} />
              <Row label="Puissance réactive Q" value={derived.kvar == null ? '--' : `${fmt(derived.kvar, 3)} kvar`} />
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
          </SectionCard>

          <TelemetryLog packet={packet} broker={broker} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone = 'default' }) {
  const color =
    tone === 'critical' ? 'text-rose-700' : tone === 'good' ? 'text-emerald-700' : 'text-slate-800';
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-semibold tabular ${color}`}>{value}</dd>
    </div>
  );
}
