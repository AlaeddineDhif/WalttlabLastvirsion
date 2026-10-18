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

function gradientFor(rgb) {
  return (context) => {
    const { chart } = context;
    const { ctx, chartArea } = chart;
    if (!chartArea) return `rgba(${rgb},0.35)`;
    const grad = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    grad.addColorStop(0, `rgba(${rgb},0.5)`);
    grad.addColorStop(1, `rgba(${rgb},0.08)`);
    return grad;
  };
}

const THEMES = {
  light: {
    legend: '#475569',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e2e8f0',
    tooltipTitle: '#0f172a',
    tooltipBody: '#334155',
    grid: 'rgba(100,116,139,0.12)',
    tick: '#94a3b8'
  },
  dark: {
    legend: '#94a3b8',
    tooltipBg: 'rgba(2,6,23,0.95)',
    tooltipBorder: 'rgba(51,65,85,0.9)',
    tooltipTitle: '#f1f5f9',
    tooltipBody: '#cbd5e1',
    grid: 'rgba(148,163,184,0.16)',
    tick: '#64748b'
  }
};

/**
 * Correlates an absolute quantity (bars, left axis) with a per-unit intensity
 * (line, right axis) so energy and production can be read together.
 */
export default function ComboChart({
  labels,
  bars,
  barLabel,
  barUnit,
  barRgb = CHART_PRIMARY_RGB,
  barColor = CHART_PRIMARY,
  barPalette = null,
  line,
  lineLabel,
  lineUnit,
  lineColor = CHART_PRIMARY,
  lineDecimals = 3,
  height = 'h-64',
  theme = 'light'
}) {
  const palette = THEMES[theme] || THEMES.light;

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
          padding: 11,
          cornerRadius: 10,
          boxPadding: 4,
          callbacks: {
            label: (ctx) =>
              ctx.dataset.yAxisID === 'y1'
                ? ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y, lineDecimals)} ${lineUnit}`
                : ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y, 0)} ${barUnit}`
          }
        }
      },
      scales: {
        x: {
          ticks: { maxRotation: 0, font: { size: 9 }, color: palette.tick },
          grid: { display: false }
        },
        y: {
          position: 'left',
          beginAtZero: true,
          ticks: { font: { size: 9 }, color: palette.tick, maxTicksLimit: 6, callback: (v) => fmt(v, 0) },
          grid: { color: palette.grid },
          title: { display: true, text: barUnit, font: { size: 9 }, color: palette.tick }
        },
        y1: {
          position: 'right',
          ticks: { font: { size: 9 }, color: lineColor, maxTicksLimit: 5, callback: (v) => fmt(v, lineDecimals) },
          grid: { display: false },
          title: { display: true, text: lineUnit, font: { size: 9 }, color: lineColor }
        }
      }
    }),
    [barUnit, lineUnit, lineDecimals, lineColor, palette]
  );

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          type: 'bar',
          label: barLabel,
          data: bars,
          backgroundColor: barPalette || gradientFor(barRgb),
          borderColor: barColor,
          borderWidth: 1.2,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 34,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: lineLabel,
          data: line,
          borderColor: lineColor,
          backgroundColor: lineColor,
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 2.5,
          pointHoverRadius: 5,
          pointBackgroundColor: lineColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          spanGaps: true,
          yAxisID: 'y1'
        }
      ]
    }),
    [labels, bars, barLabel, barRgb, barColor, barPalette, line, lineLabel, lineColor]
  );

  return (
    <div className={`relative ${height}`}>
      <Bar data={data} options={options} />
    </div>
  );
}
