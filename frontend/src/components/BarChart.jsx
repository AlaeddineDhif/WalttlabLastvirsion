import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Filler,
  Legend
} from 'chart.js';
import { fmt } from '../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler, Legend);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

function gradientFor(rgb) {
  return (context) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return `rgba(${rgb},0.35)`;
    const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    grad.addColorStop(0, `rgba(${rgb},0.55)`);
    grad.addColorStop(1, `rgba(${rgb},0.08)`);
    return grad;
  };
}

const baseTooltip = {
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  borderWidth: 1,
  titleColor: '#0f172a',
  bodyColor: '#334155',
  padding: 10,
  boxPadding: 4
};

/**
 * Bar chart with an optional dashed threshold line rendered as a second dataset,
 * plus per-bar colour overrides so breached months can be highlighted.
 */
export default function BarChart({
  label,
  labels,
  values,
  colors = null,
  rgb = '2,132,199',
  color = '#0284c7',
  unit = '',
  decimals = 0,
  threshold = null,
  thresholdLabel = 'Ps',
  horizontal = false,
  height = 'h-64'
}) {
  // Long category names (machine names, post labels) are unreadable on a
  // vertical axis, so callers can transpose the chart instead of rotating or
  // truncating them.
  const valueAxis = {
    beginAtZero: true,
    ticks: {
      font: { size: 9 },
      color: '#94a3b8',
      maxTicksLimit: 6,
      callback: (v) => fmt(v, 0)
    },
    grid: { color: 'rgba(100,116,139,0.15)' },
    title: { display: true, text: unit, font: { size: 9 }, color: '#94a3b8' }
  };
  const categoryAxis = {
    ticks: { maxRotation: 0, font: { size: 9 }, color: '#94a3b8' },
    grid: { display: false }
  };

  const options = useMemo(() => {
    // On a transposed chart the magnitude lives on x, not y: reading parsed.y
    // would return the category index.
    const valueOf = (ctx) => (horizontal ? ctx.parsed.x : ctx.parsed.y);
    return {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${fmt(valueOf(ctx), ctx.dataset.decimals)} ${ctx.dataset.unit}`
          }
        }
      },
      scales: horizontal
        ? { x: { ...valueAxis, position: 'top' }, y: categoryAxis }
        : { x: categoryAxis, y: { ...valueAxis, position: 'right' } }
    };
  }, [unit, horizontal]);

  const data = useMemo(() => {
    const datasets = [
      {
        label: label || 'Value',
        data: values,
        backgroundColor: colors || gradientFor(rgb),
        borderColor: colors || color,
        borderWidth: 1.4,
        borderRadius: 3,
        maxBarThickness: 34,
        decimals,
        unit
      }
    ];
    // The threshold is a vertical rule, which only reads correctly against a
    // vertical bar axis; transposing it would draw a meaningless polyline.
    if (threshold != null && !horizontal) {
      datasets.push({
        label: thresholdLabel,
        data: labels.map(() => threshold),
        type: 'line',
        borderColor: '#dc2626',
        borderWidth: 1.6,
        borderDash: [5, 4],
        pointRadius: 0,
        pointHoverRadius: 3,
        fill: false,
        decimals,
        unit,
        order: 0
      });
    }
    return { labels, datasets };
  }, [labels, values, colors, rgb, color, label, decimals, unit, threshold, thresholdLabel]);

  return (
    <div className={`relative ${height}`}>
      <Bar data={data} options={options} />
    </div>
  );
}
