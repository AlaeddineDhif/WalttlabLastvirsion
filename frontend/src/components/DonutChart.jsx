import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { fmt } from '../lib/format';

ChartJS.register(ArcElement, Tooltip, Legend);
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.animation = false;

const baseTooltip = {
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  borderWidth: 1,
  titleColor: '#0f172a',
  bodyColor: '#334155',
  padding: 11,
  cornerRadius: 10,
  boxPadding: 4
};

/**
 * Donut chart for a part-to-whole breakdown. The legend is intentionally left to
 * the caller: a custom legend can carry the absolute value and the share next to
 * each swatch, which the built-in one cannot. An optional centre label is drawn
 * as an overlay rather than a Chart.js plugin so it also renders server-side.
 */
export default function DonutChart({
  labels,
  values,
  colors,
  unit = '',
  decimals = 0,
  cutout = '68%',
  centerValue,
  centerLabel,
  height = 'h-64'
}) {
  const total = useMemo(() => values.reduce((sum, v) => sum + (Number(v) || 0), 0), [values]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout,
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltip,
          callbacks: {
            label: (ctx) => {
              const share = total > 0 ? (ctx.parsed / total) * 100 : 0;
              return ` ${fmt(ctx.parsed, decimals)} ${unit} · ${fmt(share, 1)} %`;
            }
          }
        }
      }
    }),
    [unit, decimals, cutout, total]
  );

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 8
        }
      ]
    }),
    [labels, values, colors]
  );

  return (
    <div className={`relative ${height}`}>
      <Doughnut data={data} options={options} />
      {centerValue != null && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-[22px] font-semibold leading-none text-slate-900">
            {centerValue}
          </span>
          {centerLabel && (
            <span className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-400">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
