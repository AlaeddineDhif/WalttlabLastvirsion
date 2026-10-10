import Gauge from './Gauge';
import { fmt, formatTime } from '../lib/format';
import { CHIP, tagFor } from '../lib/tags';

export default function MetricCard({ metric, value, time, penalty, idle, frozen }) {
  const { key, title, icon: Icon, color, min, max, zones, display, rangeLabel } = metric;
  const shown = display(value);

  // A frozen feed must never produce a verdict: the last reading may be perfectly
  // healthy, or it may be a penalty breach, and we can no longer tell.
  const showPenalty = !frozen && !idle && penalty;
  const tag = frozen
    ? { label: 'Figé', state: 'slate' }
    : idle
      ? { label: 'Hors charge', state: 'slate' }
      : tagFor(key, value === null || value === undefined ? null : Math.abs(value));

  const effectiveMax = Math.max(max, typeof shown.value === 'number' ? shown.value * 1.2 : 0);
  const ink = frozen ? 'text-slate-400' : showPenalty ? 'text-rose-700' : 'text-slate-900';

  return (
    <div
      className={`rounded-xl border p-4 shadow-card transition-colors ${
        showPenalty ? 'pf-penalty' : frozen ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${
            frozen ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <Icon className="h-4 w-4" style={{ color: frozen ? '#cbd5e1' : color }} />
          {title}
        </span>
        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${CHIP[tag.state]}`}>
          {tag.label}
        </span>
      </div>

      <div className="mx-auto mb-2 mt-1 w-full max-w-[240px] opacity-60">
        <Gauge
          value={shown.value}
          min={min}
          max={effectiveMax}
          color={showPenalty ? '#dc2626' : frozen ? '#cbd5e1' : color}
          zones={zones}
        />
      </div>

      <div className="flex items-end justify-between leading-none">
        <div>
          <div className={`text-[28px] font-bold tabular ${ink}`}>{fmt(shown.value, shown.decimals)}</div>
          <div className="mt-1 text-[11px] text-slate-500">{shown.unit}</div>
        </div>
        <div className="text-right text-[10px] leading-4 text-slate-500">
          <div className="tabular font-medium">{rangeLabel(effectiveMax)}</div>
          <div className="tabular">
            {frozen && shown.value != null ? 'gelé ' : ''}
            {formatTime(time)}
          </div>
        </div>
      </div>
    </div>
  );
}
