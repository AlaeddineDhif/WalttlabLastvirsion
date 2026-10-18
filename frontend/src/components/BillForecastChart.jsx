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
import { CHART_PRIMARY, CHART_PRIMARY_RGB } from '../lib/brand';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

/**
 * Bill trajectory for the current month.
 *
 * Three lines tell the whole billing story:
 *   - the run rate so far (solid brand green, filled underneath);
 *   - the projection to month end (dashed continuation of the same line);
 *   - last month's cumulative bill (grey dashed) as the comparison baseline.
 *
 * The cumulative lines are linear run rates, because the billing snapshot is a
 * month-to-date aggregate rather than a daily ledger — honest, and labelled.
 */
export default function BillForecastChart({ model, height = 'h-72' }) {
  const { labels, runRate, projection, reference } = useMemo(() => {
    if (!model) return { labels: [], runRate: [], projection: [], reference: [] };
    const n = model.daysInMonth;
    const labels = Array.from({ length: n }, (_, i) => String(i + 1));
    const runRate = Array.from({ length: n }, (_, i) =>
      i < model.days && model.dayProgress > 0 ? Math.round((model.bill * (i + 1)) / model.days) : null
    );
    const projectionLine = Array.from({ length: n }, (_, i) =>
      i >= model.days - 1 && model.forecast != null
        ? Math.round((model.forecast * (i + 1)) / n)
        : null
    );
    const reference =
      model.prevBill != null && model.prevDays
        ? Array.from({ length: n }, (_, i) => Math.round((model.prevBill * (i + 1)) / model.prevDays))
        : [];
    return { labels, runRate, projection: projectionLine, reference };
  }, [model]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: 'rectRounded',
            font: { size: 10 },
            color: '#475569',
            padding: 14
          }
        },
        tooltip: {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          titleColor: '#0f172a',
          bodyColor: '#334155',
          padding: 11,
          cornerRadius: 10,
          boxPadding: 4,
          callbacks: {
            title: (items) => `Day ${items[0].label} · ${model ? model.monthLabel : ''}`,
            label: (ctx) =>
              ctx.parsed.y == null ? null : ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y, 0)} DT`
          }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 10, maxRotation: 0, font: { size: 9 }, color: '#94a3b8' },
          grid: { display: false },
          title: { display: true, text: 'day of month', font: { size: 9 }, color: '#94a3b8' }
        },
        y: {
          position: 'right',
          beginAtZero: true,
          ticks: { font: { size: 9 }, color: '#94a3b8', maxTicksLimit: 6, callback: (v) => fmt(v, 0) },
          grid: { color: 'rgba(100,116,139,0.12)', drawTicks: false },
          border: { display: false },
          title: { display: true, text: 'cumulative DT (TTC est.)', font: { size: 9, weight: '600' }, color: '#94a3b8' }
        }
      }
    }),
    [model]
  );

  const data = useMemo(() => {
    const datasets = [
      {
        label: 'Bill so far · run rate',
        data: runRate,
        borderColor: CHART_PRIMARY,
        backgroundColor: (context) => {
          const { chart } = context;
          const { ctx, chartArea } = chart;
          if (!chartArea) return `rgba(${CHART_PRIMARY_RGB},0)`;
          const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          grad.addColorStop(0, `rgba(${CHART_PRIMARY_RGB},0.28)`);
          grad.addColorStop(0.65, `rgba(${CHART_PRIMARY_RGB},0.07)`);
          grad.addColorStop(1, `rgba(${CHART_PRIMARY_RGB},0)`);
          return grad;
        },
        borderWidth: 2.4,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: CHART_PRIMARY,
        fill: true,
        spanGaps: false,
        order: 1
      },
      {
        label: 'Projected',
        data: projection,
        borderColor: '#f59e0b',
        borderWidth: 2,
        borderDash: [6, 5],
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#f59e0b',
        fill: false,
        spanGaps: false,
        order: 2
      }
    ];

    if (reference.length) {
      datasets.push({
        label: model.prev ? `${model.prev.label} · cumulative` : 'Last month',
        data: reference,
        borderColor: '#94a3b8',
        borderWidth: 1.6,
        borderDash: [4, 4],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        tension: 0.25,
        order: 3
      });
    }

    return { labels, datasets };
  }, [labels, runRate, projection, reference, model]);

  return (
    <div className={`relative ${height}`}>
      <Line data={data} options={options} />
    </div>
  );
}
