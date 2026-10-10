import { useEffect, useMemo, useState } from 'react';
import { Sun, Sunset, MoonStar, Package, Database, Wallet, Gauge, GitCompareArrows } from 'lucide-react';
import ComboChart from '../components/ComboChart';
import { SectionCard, StatTile } from '../components/StatTile';
import { useTelemetry } from '../context/TelemetryContext';
import { fmt, clockNow } from '../lib/format';

const ENERGY_RATE = 0.25;

const SHIFTS = [
  {
    id: 'matin',
    label: 'Poste Matin',
    short: 'Matin',
    slot: '06:00 – 14:00',
    accent: '#10b981',
    ink: '#047857',
    rgb: '16,185,129',
    Icon: Sun
  },
  {
    id: 'soir',
    label: 'Poste Soir',
    short: 'Soir',
    slot: '14:00 – 22:00',
    accent: '#06b6d4',
    ink: '#0e7490',
    rgb: '6,182,212',
    Icon: Sunset
  },
  {
    id: 'nuit',
    label: 'Poste Nuit',
    short: 'Nuit',
    slot: '22:00 – 06:00',
    accent: '#8b5cf6',
    ink: '#6d28d9',
    rgb: '139,92,246',
    Icon: MoonStar
  }
];

const NUMBER_INPUT =
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-center font-mono text-3xl font-bold tabular text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

function shiftIdForHour(hour) {
  if (hour >= 6 && hour < 14) return 'matin';
  if (hour >= 14 && hour < 22) return 'soir';
  return 'nuit';
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function ShiftEnergyCorrelation() {
  const { metrics, clock, feed } = useTelemetry();

  const [units, setUnits] = useState({});
  const [baselines, setBaselines] = useState({});

  const currentShiftId = shiftIdForHour(clock.getHours());

  // A frozen counter still holds a finite value, so `Number.isFinite` is a
  // presence check, not a liveness check. Only a live feed can extend a shift.
  const meterLive = feed.isLive || feed.isSimulated;
  const meterFrozen = !meterLive;

  useEffect(() => {
    if (meterFrozen || !Number.isFinite(metrics.energy)) return;
    setBaselines((prev) =>
      prev[currentShiftId] == null ? { ...prev, [currentShiftId]: metrics.energy } : prev
    );
  }, [meterFrozen, metrics.energy, currentShiftId]);

  const rows = useMemo(
    () =>
      SHIFTS.map((shift) => {
        const base = baselines[shift.id];
        // While the feed is down the counter is parked, so a subtraction would
        // report a confident 0.00 kWh. Report nothing instead.
        const energy =
          meterLive && Number.isFinite(base) && Number.isFinite(metrics.energy)
            ? Math.max(0, metrics.energy - base)
            : null;
        const produced = toNumber(units[shift.id]);
        const cost = energy != null ? energy * ENERGY_RATE : null;
        const sec =
          energy != null && energy > 0 && produced != null && produced > 0 ? energy / produced : null;
        return { ...shift, produced, energy, cost, sec, live: shift.id === currentShiftId };
      }),
    [baselines, meterLive, metrics.energy, units, currentShiftId]
  );

  const totals = useMemo(() => {
    // Absent production must stay null: coercing it to 0 would claim the line ran
    // and made nothing.
    const entered = rows.filter((r) => r.produced != null);
    const produced = entered.length ? entered.reduce((acc, r) => acc + r.produced, 0) : null;
    const metered = rows.filter((r) => r.energy != null);
    const energy = metered.length ? metered.reduce((acc, r) => acc + r.energy, 0) : null;
    return {
      produced,
      hasProduction: produced != null,
      energy,
      cost: energy != null ? energy * ENERGY_RATE : null,
      sec: energy != null && energy > 0 && produced != null && produced > 0 ? energy / produced : null
    };
  }, [rows]);

  const chartData = useMemo(
    () => ({
      labels: rows.map((r) => r.short),
      bars: rows.map((r) => r.produced || 0),
      line: rows.map((r) => r.energy),
      palette: rows.map((r) => `rgba(${r.rgb},${r.live ? 0.9 : 0.6})`)
    }),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          Production corrélée à l'énergie du poste · tarif {fmt(ENERGY_RATE, 3)} DT/kWh
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 shadow-card ${
              meterFrozen
                ? 'border-slate-200 bg-slate-50 text-slate-500'
                : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                meterFrozen ? 'bg-slate-300' : 'bg-emerald-500 pulse-dot'
              }`}
            ></span>
            {meterFrozen
              ? `compteur figé${Number.isFinite(metrics.energy) ? ` · ${fmt(metrics.energy, 1)} kWh` : ''}`
              : `${fmt(metrics.energy, 1)} kWh`}
          </span>
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 tabular text-slate-700 shadow-card">
            {clockNow(clock)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Database}
          accent="#0284c7"
          label="Énergie totale"
          value={fmt(totals.energy, 1)}
          sub="kWh · 3 postes"
        />
        <StatTile
          icon={Wallet}
          accent="#d97706"
          label="Coût total"
          value={fmt(totals.cost, 2)}
          sub="DT"
        />
        <StatTile
          icon={Package}
          accent="#059669"
          label="Production totale"
          value={totals.hasProduction ? fmt(totals.produced, 0) : '--'}
          sub={totals.hasProduction ? 'pièces' : 'aucune saisie'}
        />
        <StatTile
          icon={Gauge}
          accent="#7c3aed"
          label="SEC global"
          value={totals.sec == null ? '--' : fmt(totals.sec, 3)}
          sub="kWh / pièce"
          tone={totals.sec == null ? 'default' : 'good'}
        />
      </div>

      <SectionCard
        title="Production vs. énergie par poste"
        subtitle="Pièces produites en histogramme, kWh consommés en courbe"
        icon={GitCompareArrows}
      >
        {!totals.hasProduction ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-400">
            Saisissez les pièces produites pour tracer la corrélation.
          </div>
        ) : (
          <ComboChart
            labels={chartData.labels}
            bars={chartData.bars}
            barLabel="Production"
            barUnit="pièces"
            barPalette={chartData.palette}
            barColor="rgba(100,116,139,0.45)"
            line={chartData.line}
            lineLabel="Énergie"
            lineUnit="kWh"
            lineColor="#0891b2"
            lineDecimals={1}
            height="h-72"
          />
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {rows.map((row) => (
          <ShiftCard
            key={row.id}
            row={row}
            frozen={meterFrozen}
            onChange={(value) => setUnits((prev) => ({ ...prev, [row.id]: value }))}
          />
        ))}
      </div>

      {meterFrozen && (
        <p className="text-center font-mono text-[10px] text-slate-400">
          {feed.ageSec == null
            ? 'En attente du compteur d’énergie'
            : `Compteur figé — aucun paquet reçu depuis ${feed.ageSec} s`}
        </p>
      )}
    </div>
  );
}

function ShiftCard({ row, onChange, frozen }) {
  const { Icon, accent, ink, label, slot, live, produced, energy, cost, sec } = row;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-card transition ${
        frozen ? 'border-slate-200' : live ? 'border-emerald-300' : 'border-slate-200'
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      ></div>

      <div className="mb-4 flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}1a`, color: ink }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[12px] font-bold text-slate-900">{label}</p>
          <p className="font-mono text-[9px] text-slate-400">{slot}</p>
        </div>
        {live && (
          <span
            className={`ml-auto flex items-center gap-1 rounded-md border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider ${
              frozen
                ? 'border-slate-200 bg-slate-50 text-slate-400'
                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
            }`}
          >
            <span className={`h-1 w-1 rounded-full ${frozen ? 'bg-slate-300' : 'bg-emerald-500 pulse-dot'}`}></span>
            {frozen ? 'gelé' : 'en cours'}
          </span>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-center text-[9px] font-bold uppercase tracking-wider text-slate-500">
          Réalisé
        </span>
        <input
          type="number"
          min="0"
          step="1"
          value={produced ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={NUMBER_INPUT}
        />
      </label>

      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 font-mono text-[11px]">
        <Stat label="Énergie" value={energy} decimals={2} unit="kWh" color={ink} frozen={frozen} />
        <Stat label="Coût" value={cost} decimals={2} unit="DT" color="#b45309" frozen={frozen} />
        <Stat label="SEC" value={sec} decimals={3} unit="kWh/pc" color="#0369a1" frozen={frozen} />
      </dl>
    </div>
  );
}

function Stat({ label, value, decimals, unit, color, frozen }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd
        className="font-semibold tabular"
        style={{ color: value == null || frozen ? '#cbd5e1' : color }}
      >
        {value == null || frozen ? '--' : fmt(value, decimals)}
        {value != null && !frozen && (
          <span className="ml-1 text-[9px] font-normal text-slate-400">{unit}</span>
        )}
      </dd>
    </div>
  );
}
