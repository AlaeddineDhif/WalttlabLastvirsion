import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
} from 'chart.js';
import { fmt, formatTime } from '../lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

export default function TrendChart({ points, color, rgb, label, unit, decimals }) {
  const { labels, data } = useMemo(() => {
    const labels = points.map((p) => formatTime(p.t));
    const data = points.map((p) => p.v);
    return { labels, data };
  }, [points]);

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
          padding: 10,
          boxPadding: 4,
          callbacks: {
            label: (ctx) => ` ${fmt(ctx.parsed.y, decimals)} ${unit}`
          }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6, maxRotation: 0, font: { size: 9 }, color: '#94a3b8' },
          grid: { display: false }
        },
        y: {
          position: 'right',
          ticks: {
            font: { size: 9 },
            color: '#94a3b8',
            maxTicksLimit: 5,
            callback: (v) => fmt(v, 0)
          },
          grid: { color: 'rgba(100,116,139,0.15)' },
          title: { display: true, text: unit, font: { size: 9 }, color }
        }
      }
    }),
    [color, unit, decimals]
  );

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: (context) => {
            const { chart } = context;
            const { ctx, chartArea } = chart;
            if (!chartArea) return `rgba(${rgb},0)`;
            const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0, `rgba(${rgb},0.25)`);
            grad.addColorStop(1, `rgba(${rgb},0)`);
            return grad;
          },
          borderWidth: 1.6,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          fill: true
        }
      ]
    }),
    [labels, data, color, rgb, label]
  );

  return <Line data={chartData} options={options} />;
}