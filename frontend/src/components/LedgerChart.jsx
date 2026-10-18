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
import { CHART_PRIMARY, CHART_PRIMARY_RGB } from '../lib/brand';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler, Legend);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

/**
 * The billing ledger as a chart: one measure of the 12-month history rendered
 * as bars, with the live month highlighted. Used for the three evolutions the
 * billing page promises — bill (TTC), energy cost (HT) and consumption (kWh).
 */
export default function LedgerChart({
  ledger,
  measure = 'bill',
  label,
  unit,
  decimals = 0,
  color = CHART_PRIMARY,
  rgb = CHART_PRIMARY_RGB,
  height = 'h-64'
}) {
  const { labels, values, liveIndex } = useMemo(() => {
    const rows = ledger || [];
    const pick = (m) => {
      if (measure === 'energy') return m.energyKwh;
      if (measure === 'cost') return m.bill == null ? null : m.bill / 1.19; // strip the TVA estimate
      return m.bill;
    };
    const values = rows.map((m) => {
      const v = pick(m);
      return v == null ? null : Number(v.toFixed(decimals));
    });
    return {
      labels: rows.map((m) => m.label),
      values,
      liveIndex: rows.length ? rows.length - 1 : -1
    };
  }, [ledger, measure, decimals]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
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
            label: (ctx) => ` ${label}: ${fmt(ctx.parsed.y, decimals)} ${unit}`
          }
        }
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, maxTicksLimit: 12, font: { size: 9 }, color: '#94a3b8' },
          grid: { display: false }
        },
        y: {
          position: 'right',
          beginAtZero: true,
          ticks: { font: { size: 9 }, color: '#94a3b8', maxTicksLimit: 5, callback: (v) => fmt(v, 0) },
          grid: { color: 'rgba(100,116,139,0.12)', drawTicks: false },
          border: { display: false },
          title: { display: true, text: unit, font: { size: 9, weight: '600' }, color: '#94a3b8' }
        }
      }
    }),
    [label, unit, decimals]
  );

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: values.map((_, i) => (i === liveIndex ? color : `${rgb}59`)),
          hoverBackgroundColor: values.map(() => color),
          borderColor: values.map((_, i) => (i === liveIndex ? color : `${rgb}80`)),
          borderWidth: 1.2,
          borderRadius: 7,
          borderSkipped: false,
          maxBarThickness: 30
        }
      ]
    }),
    [labels, values, liveIndex, label, color, rgb]
  );

  return (
    <div className={`relative ${height}`}>
      <Bar data={data} options={options} />
    </div>
  );
}
