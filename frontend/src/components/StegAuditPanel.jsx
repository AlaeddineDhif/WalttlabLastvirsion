import { useMemo, useState } from 'react';
import { Building2, TrendingUp, AlertTriangle, RefreshCcw, ShieldAlert, ArrowUpRight, ArrowDownRight, CheckCircle2, Scale } from 'lucide-react';
import useAudit from '../hooks/useAudit';
import { fmt, fmtKva, fmtDT } from '../lib/format';
import { STATUS } from '../lib/tags';

const RECOMMENDATION_META = {
  upgrade: { cls: 'border-rose-200 bg-rose-50 text-rose-700', icon: ArrowUpRight, label: 'Recommended action' },
  downgrade: { cls: 'border-sky-200 bg-sky-50 text-sky-700', icon: ArrowDownRight, label: 'Recommended action' },
  watch: { cls: 'border-amber-200 bg-amber-50 text-amber-700', icon: AlertTriangle, label: 'Review' },
  adequate: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: CheckCircle2, label: 'All good' }
};

function DemandBar({ contractedPower, peak, tolerance }) {
  const scale = Math.max(contractedPower * 1.45, peak * 1.15, 10);
  const contractedWidth = (contractedPower / scale) * 100;
  const toleranceWidth = ((contractedPower * (1 + tolerance) - contractedPower) / scale) * 100;
  const peakLeft = (peak / scale) * 100;

  return (
    <div>
      <div className="relative h-9 w-full rounded-lg bg-slate-100">
        <div
          className="absolute left-0 top-0 h-full rounded-l-lg bg-slate-800"
          style={{ width: `${Math.min(contractedWidth, 100)}%` }}
        />
        <div
          className="absolute top-0 h-full bg-amber-300/70"
          style={{ left: `${Math.min(contractedWidth, 100)}%`, width: `${toleranceWidth}%` }}
        />
        {peak > 0 && (
          <div
            className="absolute top-0 z-10 h-full w-1.5 -translate-x-1/2 rounded bg-rose-600"
            style={{ left: `${Math.min(peakLeft, 100)}%` }}
          >
            <span className="absolute right-1/2 top-[-18px] translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold text-rose-700">
              Pai
            </span>
          </div>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-800" /> Ps {contractedPower.toFixed(0)} kVA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" /> {Math.round(tolerance * 100)}% tolerance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Pai {fmtKva(peak)} peak
        </span>
      </div>
    </div>
  );
}

export default function StegAuditPanel() {
  const { data, loading, busy, setSubscription, resetPeak } = useAudit();
  const [draftPower, setDraftPower] = useState('');
  const [saved, setSaved] = useState(false);

  const draftValue = useMemo(() => Number(draftPower), [draftPower]);
  const dirty = data ? Number(draftPower) !== data.contractedPower : false;

  const apply = () => {
    if (!Number.isFinite(draftValue) || draftValue <= 0) return;
    setSubscription(draftValue).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    });
  };

  if (loading && !data) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-sm text-slate-500">Loading tariff audit…</p>
      </section>
    );
  }
  if (!data) return null;

  const { audit, tariff, peak, contractedPower } = data;
  const st = STATUS[audit.status] || STATUS.ok;
  const meta = RECOMMENDATION_META[audit.recommendation.type] || RECOMMENDATION_META.adequate;
  const RecIcon = meta.icon;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <h2 className="text-[13px] font-bold tracking-wide text-slate-900">STEG Tariff &amp; Subscription Audit</h2>
          <span className={`ml-1 flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {st.label}
          </span>
        </div>
        <button
          onClick={resetPeak}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Reset measurement period
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Contracted power Ps</span>
            <Scale className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="10"
              value={draftPower}
              placeholder={String(contractedPower)}
              onChange={(e) => setDraftPower(e.target.value)}
              className="w-24 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-lg font-bold text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <span className="text-sm font-medium text-slate-500">kVA</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={apply}
              disabled={!dirty || busy}
              className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40"
            >
              {busy ? 'Saving…' : saved ? 'Saved' : 'Apply'}
            </button>
            <span className="font-mono text-[10px] text-slate-400">
              prime {fmtDT(tariff.primeRatePerKvaPerMonth)}/kVA/mo
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Peak reached Pai</span>
          <div className="mt-1 text-2xl font-bold tabular text-slate-900">{fmtKva(peak.kva)}</div>
          <div className="mt-0.5 font-mono text-[10px] text-slate-400">{peak.at ? new Date(peak.at).toLocaleTimeString() : '--:--:--'}</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Utilization</span>
          <div className="mt-1 flex items-end gap-1.5">
            <span className="text-2xl font-bold tabular text-slate-900">{fmt(audit.utilization * 100, 0)}%</span>
            <span className="mb-0.5 text-xs text-slate-500">of Ps</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${audit.utilization >= 1 ? 'bg-rose-500' : audit.utilization >= 0.9 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(audit.utilization * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {audit.exceeded ? 'Overrun beyond Ps' : 'Margin to Ps'}
          </span>
          <div className={`mt-1 text-2xl font-bold tabular ${audit.exceeded ? 'text-rose-700' : 'text-emerald-700'}`}>
            {fmtKva(audit.exceeded ? audit.overrun : Math.max(0, audit.recommendation.headroom))}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-slate-400">
            tolerance exempt: {fmtKva(audit.toleranceKva)}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <DemandBar contractedPower={contractedPower} peak={peak.kva} tolerance={tariff.tolerance} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div
          className={`rounded-lg border p-4 ${
            audit.status === 'critical'
              ? 'border-rose-200 bg-rose-50'
              : audit.status === 'watch'
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            {audit.status === 'critical' ? <ShieldAlert className="h-4 w-4 text-rose-600" /> : <TrendingUp className="h-4 w-4" />}
            {audit.status === 'critical' ? 'Penalty risk estimation' : 'Exposure status'}
          </div>
          {audit.status === 'critical' ? (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Taxable excess</div>
                <div className="text-lg font-bold tabular text-rose-700">{fmtKva(audit.taxable)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Monthly exposure</div>
                <div className="text-lg font-bold tabular text-rose-700">{fmtDT(audit.monthlyPenalty)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Annual exposure*</div>
                <div className="text-lg font-bold tabular text-rose-700">{fmtDT(audit.annualPenalty)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Current prime (yr)</div>
                <div className="text-lg font-bold tabular text-slate-800">{fmtDT(audit.annualPrime)}</div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-700">{audit.recommendation.message}</p>
          )}
        </div>

        <div className={`rounded-lg border p-4 ${meta.cls}`}>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
            <RecIcon className="h-4 w-4" /> {meta.label}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-800">
              Current: <span className="font-bold tabular">{contractedPower} kVA</span>
            </span>
            <span className="text-slate-400">→</span>
            <span className="text-slate-800">
              Recommended: <span className="font-bold tabular">{audit.recommendation.suggested} kVA</span>
            </span>
            <span
              className={`ml-auto rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${
                audit.recommendation.savings > 0 ? 'border-current bg-white/60' : 'border-current bg-white/60'
              }`}
            >
              {audit.recommendation.savings > 0
                ? `≈ ${fmtDT(audit.recommendation.savings)}/yr saved`
                : 'no immediate cost'}
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-5 text-slate-700">{audit.recommendation.message}</p>
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-slate-400">
        *Annual exposure assumes the measured peak persists across the billing year. Tariff: prime
        {fmtDT(tariff.primeRatePerKvaPerMonth)}/kVA/month · penalty supply {fmtDT(tariff.penaltyRatePerKvaPerMonth)}/kVA/month · energy
        {fmtDT(tariff.energyRatePerKwh)}/kWh. Parameters are configurable via backend env (STEG_*).
      </p>
    </section>
  );
}