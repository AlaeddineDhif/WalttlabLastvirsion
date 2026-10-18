import { useMemo } from 'react';
import { fmt, formatTime } from '../lib/format';
import { CHIP } from '../lib/tags';

/**
 * Mini trend: direction and magnitude of the last step of a series.
 * `goodDirection` flips the colouring for measures where rising is good (a
 * recovering power factor) versus costly (rising consumption).
 */
function useTrend(series, goodDirection = 'flat') {
  return useMemo(() => {
    const values = (series || []).filter((v) => Number.isFinite(v));
    if (values.length < 2) return null;
    const prev = values[values.length - 2];
    const last = values[values.length - 1];
    const delta = last - prev;
    const ref = Math.abs(prev) || 1;
    const rel = delta / ref;
    if (Math.abs(rel) < 0.002) return { dir: 'flat', delta, rel };
    const rising = delta > 0;
    const positive = goodDirection === 'up' ? rising : !rising;
    return { dir: rising ? 'up' : 'down', delta, rel, tone: positive ? 'good' : 'warn' };
  }, [series, goodDirection]);
}

/** Pure-SVG sparkline: no chart.js registration, no axis, no legend. */
function Sparkline({ series, color }) {
  const { path, last } = useMemo(() => {
    const values = (series || []).filter((v) => Number.isFinite(v)).slice(-48);
    if (values.length < 2) return { path: null, last: null };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.abs(max) || 1;
    const W = 100;
    const H = 30;
    const step = W / (values.length - 1);
    const pts = values.map((v, i) => [i * step, H - ((v - min) / span) * (H - 6) - 3]);
    const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    return { path: d, last: pts[pts.length - 1] };
  }, [series]);

  if (!path) {
    return (
      <div className="flex h-[30px] w-full items-end">
        <div className="h-px w-full bg-slate-100"></div>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-[30px] w-full" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r="1.8" fill={color} />
    </svg>
  );
}

/**
 * KPI stat panel — one number, one trend, one optional status. Flat, bordered,
 * dense: reads like a Grafana stat panel, not a marketing tile.
 */
export default function KpiCard({
  label,
  value,
  unit,
  series = null,
  color = '#16A34A',
  status = null,
  hint = null,
  time = null,
  frozen = false,
  goodDirection = 'flat',
  progress = null
}) {
  const trend = useTrend(series, goodDirection);
  const trendTone =
    trend?.tone === 'good' ? 'text-energy-700' : trend?.tone === 'warn' ? 'text-amber-700' : 'text-slate-400';

  return (
    <div className={`wl-card p-3.5 ${frozen ? 'bg-canvasAlt' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="wl-kpi-label truncate">{label}</span>
        {status && (
          <span
            className={`shrink-0 rounded border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${
              CHIP[status.state] || CHIP.slate
            }`}
          >
            {status.label}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`truncate text-[24px] font-semibold leading-none tabular ${
              frozen ? 'text-slate-400' : 'text-slate-900'
            }`}
          >
            {value}
            {unit && <span className="ml-1 text-[11px] font-medium text-slate-400">{unit}</span>}
          </div>
          {hint && <div className="mt-1 truncate text-[10px] text-slate-400">{hint}</div>}
        </div>

        {trend && (
          <span
            className={`shrink-0 text-[10px] font-semibold tabular ${trendTone}`}
            title={`${trend.delta >= 0 ? '+' : ''}${fmt(trend.delta, 2)} (${fmt(trend.rel * 100, 2)} %)`}
          >
            {trend.dir === 'up' ? '\u2191' : trend.dir === 'down' ? '\u2193' : ''}
            {fmt(Math.abs(trend.rel * 100), 1)}%
          </span>
        )}
      </div>

      {progress != null && (
        <div className="mt-2">
          <div className="h-1 w-full overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-full rounded-sm bg-brand-500"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-1.5">
        <Sparkline series={frozen ? null : series} color={frozen ? '#CBD5E1' : color} />
      </div>

      {time != null && (
        <div className="mt-1 font-mono text-[9px] text-slate-400">
          {frozen && 'frozen · '}
          {formatTime(time)}
        </div>
      )}
    </div>
  );
}
