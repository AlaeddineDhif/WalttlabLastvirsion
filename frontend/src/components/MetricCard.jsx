import Gauge from './Gauge';
import { fmt, formatTime } from '../lib/format';
import { CHIP, tagFor } from '../lib/tags';

/**
 * Gauge tile for one live quantity. Contract unchanged (metric, value, penalty,
 * idle, frozen): only the surface was modernised — icon chip, tighter type and
 * the platform-wide card silhouette.
 */
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
  const ink = frozen ? 'text-slate-400' : showPenalty ? 'text-red-700' : 'text-slate-900';

  return (
    <div
      className={`wl-card p-4 transition-colors ${
        showPenalty ? 'pf-penalty' : frozen ? 'border-slate-200 bg-canvasAlt' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`flex min-w-0 items-center gap-2 text-[12px] font-medium ${
            frozen ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: frozen ? '#CBD5E1' : color }} />
          <span className="truncate">{title}</span>
        </span>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${CHIP[tag.state]}`}
        >
          {tag.label}
        </span>
      </div>

      <div className="mx-auto mb-1 mt-2 w-full max-w-[220px]">
        <Gauge
          value={shown.value}
          min={min}
          max={effectiveMax}
          color={showPenalty ? '#dc2626' : frozen ? '#CBD5E1' : color}
          zones={zones}
        />
      </div>

      <div className="flex items-end justify-between leading-none">
        <div>
          <div className={`text-[22px] font-semibold tabular ${ink}`}>{fmt(shown.value, shown.decimals)}</div>
          <div className="mt-1 text-[11px] font-medium text-slate-500">{shown.unit}</div>
        </div>
        <div className="text-right text-[10px] leading-4 text-slate-400">
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
