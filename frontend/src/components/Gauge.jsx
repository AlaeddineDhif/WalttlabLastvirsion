import { useMemo } from 'react';

const CX = 100;
const CY = 104;
const R = 86;

function polar(r, a) {
  const rad = (a * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) };
}

function arcPath(r, a0, a1) {
  const s = polar(r, a0);
  const e = polar(r, a1);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export default function Gauge({ value, min = 0, max = 100, color = '#0f172a', zones = [] }) {
  const frac = useMemo(() => {
    if (!Number.isFinite(value)) return 0;
    if (max <= min) return 0;
    return Math.min(Math.max((value - min) / (max - min), 0), 1);
  }, [value, min, max]);

  const dash = (frac * 100).toFixed(2) + ' 100';
  const needleDeg = -(180 - frac * 180);

  const ticks = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 20; i++) {
      const a = 180 - (i / 20) * 180;
      const major = i % 5 === 0;
      const p1 = polar(major ? 84 : 78, a);
      const p2 = polar(70, a);
      arr.push({ key: i, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, stroke: major ? '#64748b' : '#cbd5e1', width: major ? 2 : 1 });
    }
    return arr;
  }, []);

  return (
    <svg viewBox="0 0 200 122" className="h-auto w-full select-none">
      <path d={arcPath(R, 180, 0)} fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" pathLength="100" />
      {zones.map((z, i) => (
        <path
          key={i}
          d={arcPath(R, 180 - z.from * 180, 180 - z.to * 180)}
          fill="none"
          stroke={z.color}
          strokeWidth="12"
          strokeLinecap="butt"
          pathLength="100"
          className="gauge-arc"
        />
      ))}
      {ticks.map((t) => (
        <line key={t.key} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.stroke} strokeWidth={t.width} />
      ))}
      <path
        d={arcPath(R, 180, 0)}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={dash}
        className="gauge-arc"
      />
      <g
        className="gauge-needle"
        style={{
          transformBox: 'view-box',
          transformOrigin: `${CX}px ${CY}px`,
          transform: `rotate(${needleDeg}deg)`
        }}
      >
        <line x1={CX} y1={CY} x2={CX + R * 0.62} y2={CY} stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r="6" fill="#ffffff" stroke={color} strokeWidth="2.5" />
    </svg>
  );
}