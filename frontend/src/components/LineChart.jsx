import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { fmt } from '../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

const THEMES = {
  light: {
    legend: '#475569',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipTitle: '#0f172a',
    tooltipBody: '#334155',
    grid: 'rgba(100,116,139,0.15)',
    tick: '#94a3b8',
    reference: '#94a3b8'
  },
  dark: {
    legend: '#94a3b8',
    tooltipBg: 'rgba(2,6,23,0.95)',
    tooltipBorder: 'rgba(51,65,85,0.9)',
    tooltipTitle: '#f1f5f9',
    tooltipBody: '#cbd5e1',
    grid: 'rgba(148,163,184,0.16)',
    tick: '#64748b',
    reference: '#64748b'
  }
};

function gradientFor(rgb) {
  return (context) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return `rgba(${rgb},0.18)`;
    const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    grad.addColorStop(0, `rgba(${rgb},0.28)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    return grad;
  };
}

/**
 * One measure over an ordered set of periods, on a single value axis.
 *
 * Two modes, because a line over a narrow ratio and a line over a power demand
 * are not the same picture:
 *
 * - `zeroBased={false}` (default) suits ratios that live in a narrow band (a cost
 *   per unit, a rate, a yield). A zero baseline would flatten 0.30 → 0.47 into a
 *   straight line and hide the drift the view exists to show.
 * - `zeroBased` suits quantities the reader compares against a fixed limit, where
 *   the distance from zero is the whole point.
 *
 * In the first case the caller prints the min and max beside the chart and repeats
 * every point in a textual table, so the zoomed scale is never the only place the
 * magnitude appears.
 *
 * `reference` draws a horizontal limit line and `highlightAbove` marks the points
 * that cross it, in `highlightColor`. The segments leading into a crossing are
 * recoloured too, so a limit that is briefly grazed still reads as a crossing.
 *
 * `highlightBelow` is the mirror case, for measures whose limit is a floor — a
 * power factor that must not fall under 0.80 dips below the line instead of
 * rising above it, and the marker has to follow the breach, not the direction.
 *
 * `yMin`/`yMax` pin the value axis. A ratio that lives in a narrow band (0.70 →
 * 1.00) otherwise gets whatever padding the auto-scale picks, which moves the
 * threshold line and the curve relative to the card and makes two screenshots of
 * the same period disagree. Pinning both ends also switches off `grace`, since
 * padding on an axis that is already pinned only shrinks the plot area.
 */
export default function LineChart({
  labels,
  values,
  label,
  unit,
  decimals = 3,
  color = '#0d9488',
  rgb = '13,148,136',
  reference = null,
  referenceLabel = 'Moyenne période',
  referenceColor = null,
  referenceDash = [5, 4],
  highlightAbove = null,
  highlightBelow = null,
  highlightColor = '#dc2626',
  zeroBased = false,
  yMin = null,
  yMax = null,
  height = 'h-72',
  theme = 'light'
}) {
  const palette = THEMES[theme] || THEMES.light;
  const limitColor = referenceColor || palette.reference;
  const bounded = yMin !== null && yMax !== null;
  const overLimit = (v) => highlightAbove !== null && v > highlightAbove;
  const underLimit = (v) => highlightBelow !== null && v < highlightBelow;
  const crossed = (v) => overLimit(v) || underLimit(v);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: reference !== null,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            font: { size: 10 },
            color: palette.legend,
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: palette.tooltipBg,
          borderColor: palette.tooltipBorder,
          borderWidth: 1,
          titleColor: palette.tooltipTitle,
          bodyColor: palette.tooltipBody,
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y, decimals)} ${unit}`
          }
        }
      },
      scales: {
        x: {
          // 365 day labels will not fit side by side: skip labels instead of
          // rotating or shrinking them, so nothing ever overflows the card.
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            font: { size: 9 },
            color: palette.tick
          },
          grid: { display: false }
        },
        y: {
          position: 'left',
          beginAtZero: zeroBased,
          // Pinned ends win over the auto-scale; grace would only shrink the plot.
          min: yMin,
          max: yMax,
          grace: bounded ? '0%' : '12%',
          ticks: {
            font: { size: 9 },
            color: palette.tick,
            maxTicksLimit: 6,
            callback: (v) => fmt(v, decimals)
          },
          grid: { color: palette.grid },
          title: { display: true, text: unit, font: { size: 9 }, color }
        }
      }
    }),
    [bounded, color, decimals, palette, reference, unit, yMax, yMin, zeroBased]
  );

  const data = useMemo(() => {
    const main = {
      label,
      data: values,
      borderColor: color,
      backgroundColor: gradientFor(rgb),
      borderWidth: 2,
      tension: 0.3,
      // A handful of points must stay visible as markers; a dense series would
      // turn into a solid band of dots. Points over the limit are always shown.
      pointRadius: (ctx) =>
        crossed(values[ctx.dataIndex]) ? 5 : values.length <= 8 ? 2.5 : 0,
      pointBackgroundColor: (ctx) =>
        crossed(values[ctx.dataIndex]) ? highlightColor : color,
      pointBorderColor: (ctx) =>
        crossed(values[ctx.dataIndex]) ? '#ffffff' : color,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: (ctx) =>
        crossed(values[ctx.dataIndex]) ? highlightColor : color,
      fill: true,
      spanGaps: true
    };

    if (highlightAbove !== null || highlightBelow !== null) {
      main.segment = {
        borderColor: (ctx) => (crossed(ctx.p1.parsed.y) ? highlightColor : color),
        borderWidth: (ctx) => (crossed(ctx.p1.parsed.y) ? 2.6 : 2)
      };
    }


    const datasets = [main];

    if (reference !== null) {
      datasets.push({
        label: referenceLabel,
        data: values.map(() => reference),
        borderColor: limitColor,
        borderWidth: 1.6,
        borderDash: referenceDash,
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0
      });
    }

    return { labels, datasets };
  }, [
    color,
    highlightAbove,
    highlightBelow,
    highlightColor,
    label,
    labels,
    limitColor,
    reference,
    referenceDash,
    referenceLabel,
    rgb,
    values
  ]);

  return (
    <div className={`relative ${height}`}>
      <Line data={data} options={options} />
    </div>
  );
}
