import { useState } from 'react';
import { Factory, Play, CheckCircle2, PlusCircle, Package, Database, Wallet, Percent } from 'lucide-react';
import useProduction from '../hooks/useProduction';
import { fmt, fmtDT, fmtDate } from '../lib/format';

function Tile({ icon: Icon, label, value, accent }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular ${accent || 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

const FIELD =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

/**
 * Production & unit-energy-cost console.
 *
 * A batch snapshots the live meter as a baseline, then correlates the kWh
 * consumed with the pieces produced when it completes. Manual records cover
 * shifts the meter cannot see. Nothing here invents a number: an unmeasured
 * quantity stays `--`.
 */
export default function ProductionPanel({ currentEnergy }) {
  const { data, busy, actionError, startBatch, completeBatch, addRecord } = useProduction();

  const [batchLabel, setBatchLabel] = useState('Shift A · Assembly Line 1');
  const [units, setUnits] = useState('');
  const [overrideEnergy, setOverrideEnergy] = useState('');
  const [recLabel, setRecLabel] = useState('Shift A · Assembly Line 1');
  const [recUnits, setRecUnits] = useState('');
  const [recEnergy, setRecEnergy] = useState('');

  if (!data) {
    return (
      <section className="wl-card p-5">
        <p className="text-sm text-slate-500">Loading production telemetry…</p>
      </section>
    );
  }

  const { batch, records, summary, energyRatePerKwh } = data;
  const meterNow = currentEnergy != null ? currentEnergy : batch.currentEnergy;
  const consumedNow =
    currentEnergy != null && batch.startEnergy != null && Number.isFinite(batch.startEnergy)
      ? Math.max(0, currentEnergy - batch.startEnergy)
      : batch.energyConsumed;

  const onStart = () => {
    if (!batchLabel.trim()) return;
    startBatch(batchLabel.trim());
  };

  const onComplete = () => {
    const u = Number(units);
    const ov = overrideEnergy === '' ? null : Number(overrideEnergy);
    completeBatch(u, ov).then((ok) => {
      if (ok) {
        setUnits('');
        setOverrideEnergy('');
      }
    });
  };

  const onManual = () => {
    const u = Number(recUnits);
    const e = Number(recEnergy);
    addRecord(recLabel.trim(), u, e).then((ok) => {
      if (ok) {
        setRecUnits('');
        setRecEnergy('');
      }
    });
  };

  return (
    <section className="wl-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-slate-400" />
          <h2 className="wl-section-title">Production &amp; unit energy cost</h2>
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          tariff {fmtDT(energyRatePerKwh)}/kWh
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile icon={Package} label="Units produced" value={fmt(summary.totalUnits, 0)} />
        <Tile icon={Database} label="Energy consumed" value={`${fmt(summary.totalEnergyKwh, 1)} kWh`} />
        <Tile icon={Wallet} label="Total energy cost" value={fmtDT(summary.totalCost)} />
        <Tile
          icon={Percent}
          label="Unit energy cost"
          value={summary.avgUnitCost != null ? fmtDT(summary.avgUnitCost) + ' /pièce' : '--'}
          accent="text-brand-700"
        />
      </div>

      {actionError && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {actionError}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {!batch.active ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 text-[12px] font-semibold text-slate-700">
              Start a production batch
            </div>
            <p className="mb-3 text-xs leading-5 text-slate-500">
              The meter reading <span className="font-mono font-semibold text-slate-700">{meterNow != null ? fmt(meterNow, 1) : '--'} kWh</span> is
              snapshotted as baseline. When the batch completes, the consumed kWh is correlated with the units produced.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={batchLabel}
                onChange={(e) => setBatchLabel(e.target.value)}
                className={`min-w-0 flex-1 ${FIELD}`}
                placeholder="Shift label (line, shift…)"
              />
              <button
                onClick={onStart}
                disabled={busy || !batchLabel.trim()}
                className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" /> Start batch
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-brand-200 bg-brand-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500 pulse-dot" /> Batch in progress
            </div>
            <div className="mb-3 text-sm font-semibold text-slate-900">{batch.label}</div>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div className="rounded-md border border-slate-200 bg-white p-2">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Baseline</div>
                <div className="tabular text-slate-900">{batch.startEnergy != null ? fmt(batch.startEnergy, 1) : '--'} kWh</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Meter now</div>
                <div className="tabular text-slate-900">{meterNow != null ? fmt(meterNow, 1) : '--'} kWh</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-2">
                <div className="text-[9px] uppercase tracking-wide text-slate-500">Consumed</div>
                <div className="tabular font-semibold text-brand-700">{consumedNow != null ? fmt(consumedNow, 2) : '--'} kWh</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-medium text-slate-600">
                  Units produced (pieces)
                </span>
                <input
                  type="number"
                  min="1"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g. 420"
                  className={FIELD}
                />
              </label>
              <button
                onClick={onComplete}
                disabled={busy || !Number(units) || Number(units) <= 0}
                className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Complete &amp; compute
              </button>
            </div>
          </div>
        )}

        <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
            <PlusCircle className="h-3.5 w-3.5" /> Log a manual record
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={recLabel}
              onChange={(e) => setRecLabel(e.target.value)}
              className={FIELD}
              placeholder="Label / line"
            />
            <input
              type="number"
              min="1"
              value={recUnits}
              onChange={(e) => setRecUnits(e.target.value)}
              className={FIELD}
              placeholder="Units (pieces)"
            />
            <input
              type="number"
              min="0"
              step="any"
              value={recEnergy}
              onChange={(e) => setRecEnergy(e.target.value)}
              className={`sm:col-span-2 ${FIELD}`}
              placeholder="Consumed energy (kWh) — manual"
            />
          </div>
          <button
            onClick={onManual}
            disabled={busy || !Number(recUnits) || Number(recUnits) <= 0 || !Number.isFinite(Number(recEnergy))}
            className="mt-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-40"
          >
            Add record
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="wl-table min-w-[640px]">
          <thead className="wl-thead bg-slate-50">
            <tr>
              <th className="wl-th">Batch / Shift</th>
              <th className="wl-th text-right">Units</th>
              <th className="wl-th text-right">Energy kWh</th>
              <th className="wl-th text-right">Cost DT</th>
              <th className="wl-th text-right">Unit cost DT/pièce</th>
              <th className="wl-th text-right">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-400">
                  No production batches recorded yet.
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="bg-white hover:bg-slate-50">
                <td className="max-w-[220px] truncate px-3 py-2 font-sans font-medium text-slate-700">{r.label}</td>
                <td className="px-3 py-2 text-right tabular text-slate-800">{fmt(r.units, 0)}</td>
                <td className="px-3 py-2 text-right tabular text-slate-600">{fmt(r.energyKwh, 2)}</td>
                <td className="px-3 py-2 text-right tabular text-slate-600">{fmtDT(r.cost)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular text-energy-700">
                  {r.unitCost != null ? fmtDT(r.unitCost) + ' /pièce' : '--'}
                </td>
                <td className="px-3 py-2 text-right text-slate-500">{fmtDate(r.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
