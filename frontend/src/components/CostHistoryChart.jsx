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
import { CHART_PRIMARY, CHART_PRIMARY_RGB, BRAND_NAVY_STRONG } from '../lib/brand';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler, Legend);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

/**
 * Energy cost over time — the annual ledger as a money story.
 *
 * Closed months are soft brand bars, the current month is solid (it is live,
 * month-to-date) and the projection for its final bill floats above it as a
 * dashed marker, so "where the year has been" and "where this month is going"
 * read in one glance.
 */
export default function CostHistoryChart({ ledger, forecast, height = 'h-72' }) {
  const { labels, bills, projection, liveIndex } = useMemo(() => {
    const rows = ledger || [];
    const liveIndex = rows.length ? rows.length - 1 : -1;
    return {
      labels: rows.map((m) => m.label),
      bills: rows.map((m) => (m.bill == null ? null : Math.round(m.bill))),
      projection:
        liveIndex >= 0 && Number.isFinite(forecast) ? rows.map((m, i) => (i === liveIndex ? Math.round(forecast) : null)) : null,
      liveIndex
    };
  }, [ledger, forecast]);

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
            label: (ctx) => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y, 0)} DT`
          }
        }
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, font: { size: 9 }, color: '#94a3b8' },
          grid: { display: false }
        },
        y: {
          position: 'right',
          beginAtZero: true,
          ticks: { font: { size: 9 }, color: '#94a3b8', maxTicksLimit: 6, callback: (v) => fmt(v, 0) },
          grid: { color: 'rgba(100,116,139,0.12)', drawTicks: false },
          border: { display: false },
          title: { display: true, text: 'DT (TTC est.)', font: { size: 9, weight: '600' }, color: '#94a3b8' }
        }
      }
    }),
    []
  );

  const data = useMemo(() => {
    const barColors = bills.map((_, i) =>
      i === liveIndex ? CHART_PRIMARY : `rgba(${CHART_PRIMARY_RGB},0.35)`
    );
    const hoverColors = bills.map((_, i) =>
      i === liveIndex ? BRAND_NAVY_STRONG : `rgba(${CHART_PRIMARY_RGB},0.6)`
    );

    const datasets = [
      {
        label: 'Estimated bill',
        data: bills,
        backgroundColor: barColors,
        hoverBackgroundColor: hoverColors,
        borderColor: barColors,
        borderWidth: 1.2,
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: 34,
        order: 1
      }
    ];

    if (projection) {
      datasets.push({
        type: 'line',
        label: 'Projected end of month',
        data: projection,
        showLine: false,
        pointRadius: 7,
        pointHoverRadius: 9,
        pointStyle: 'rectRot',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#f59e0b',
        pointBorderWidth: 2.4,
        decimals: 0,
        unit: 'DT',
        order: 0
      });
    }

    return { labels, datasets };
  }, [labels, bills, projection, liveIndex]);

  return (
    <div className={`relative ${height}`}>
      <Bar data={data} options={options} />
    </div>
  );
}
