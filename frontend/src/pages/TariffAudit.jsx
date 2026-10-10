import {
  Gauge,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  CalendarRange
} from 'lucide-react';
import BarChart from '../components/BarChart';
import ComboChart from '../components/ComboChart';
import StegAuditPanel from '../components/StegAuditPanel';
import { SectionCard, StatTile, Bar, LoadingBlock } from '../components/StatTile';
import useAuditHistory from '../hooks/useAuditHistory';
import { fmt, fmtDT, fmtKwh, fmtPct } from '../lib/format';

export default function TariffAudit() {
  const { data: h, loading } = useAuditHistory();

  if (loading && !h) return <LoadingBlock label="Loading billing history…" />;
  if (!h) return <LoadingBlock label="Billing history unavailable — is the backend running?" />;

  const labels = h.months.map((m) => m.label);

  const peakValues = h.months.map((m) => m.peakKva);
  const peakColors = h.months.map((m) =>
    m.exceeded ? '#dc2626' : m.headroom < 10 ? '#d97706' : '#0284c7'
  );

  const opt = h.optimization;
  const best = opt.optimal;
  const current = opt.current;
  const penaltyFree = opt.penaltyFree;
  const saving = Math.max(0, opt.savings);
  const maxRowCost = Math.max(...opt.rows.map((r) => r.annualTotal));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={Gauge}
          accent="#d97706"
          label="Subscribed Ps"
          value={fmt(h.subscribedPower, 0)}
          sub="kVA · current contract"
        />
        <StatTile
          icon={TrendingUp}
          accent="#dc2626"
          label="Highest monthly peak"
          value={fmt(h.peakKva, 1)}
          sub={`kVA · ${h.peakMonth.label} ${h.peakMonth.year}`}
        />
        <StatTile
          icon={AlertTriangle}
          accent="#dc2626"
          label="Months over Ps"
          value={fmt(h.monthsOver, 0)}
          sub={`of ${h.months.length} · ${h.monthsPenalized} billed a penalty`}
          tone={h.monthsPenalized > 0 ? 'critical' : 'good'}
        />
        <StatTile
          icon={Wallet}
          accent="#059669"
          label="Annual energy bill"
          value={fmt(h.totalCost, 0)}
          sub="DT · prime + energy + penalty"
        />
        <StatTile
          icon={CheckCircle2}
          accent="#7c3aed"
          label="Optimal Ps"
          value={fmt(best.power, 0)}
          sub={best.power === h.subscribedPower ? 'kVA · already optimal' : `kVA · saves ${fmt(saving, 0)} DT/yr`}
          tone={best.power !== h.subscribedPower ? 'good' : 'default'}
        />
        <StatTile
          icon={CalendarRange}
          accent="#2563eb"
          label="Annual consumption"
          value={fmt(h.totalEnergyKwh / 1000, 1)}
          sub={`MWh · ${fmt(h.units, 0)} pieces`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <SectionCard
          title="Annual peak vs. subscribed power"
          subtitle="Each bar is the highest demand of the month; red bars exceed Ps and are billed a penalty"
          icon={TrendingUp}
          className="2xl:col-span-2"
          actions={
            <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-sky-600"></span> within Ps
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-rose-600"></span> over Ps
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-rose-500"></span> Ps
              </span>
            </div>
          }
        >
          <BarChart
            label="Monthly peak"
            labels={labels}
            values={peakValues}
            colors={peakColors}
            unit="kVA"
            decimals={0}
            threshold={h.subscribedPower}
            thresholdLabel={`Ps = ${fmt(h.subscribedPower, 0)} kVA`}
            height="h-72"
          />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">
            <span>
              Excess billed: <span className="font-bold text-rose-600">{fmtDT(h.annualPenalty, 0)}</span>
            </span>
            <span>
              Subscription prime: <span className="font-bold text-slate-700">{fmtDT(h.annualPrime, 0)}</span>
            </span>
            <span>
              Energy charges: <span className="font-bold text-slate-700">{fmtDT(h.totalEnergyKwh * h.energyRatePerKwh, 0)}</span>
            </span>
            <span>
              Free tolerance band:{' '}
              <span className="font-bold text-slate-700">
                {fmt(h.subscribedPower * 1.1, 1)} kVA
              </span>
            </span>
          </div>
        </SectionCard>

        <SectionCard
          title="Subscription optimiser"
          subtitle="Annual prime + penalty across the STEG tranche ladder"
          icon={Lightbulb}
        >
          <div className="space-y-2">
            {opt.rows.map((row) => {
              const isCurrent = row.power === h.subscribedPower;
              const isBest = row.power === best.power;
              return (
                <div
                  key={row.power}
                  className={`rounded-lg border p-2.5 transition ${
                    isBest
                      ? 'border-emerald-300 bg-emerald-50'
                      : isCurrent
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold tabular text-slate-900">
                      {fmt(row.power, 0)} <span className="text-[10px] font-medium text-slate-500">kVA</span>
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular text-slate-900">
                      {fmtDT(row.annualTotal, 0)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-slate-500">
                    <span>prime {fmtDT(row.annualPrime, 0)}</span>
                    <span className={row.annualPenalty > 0 ? 'font-semibold text-rose-600' : 'text-emerald-600'}>
                      {row.annualPenalty > 0 ? `penalty ${fmtDT(row.annualPenalty, 0)}` : 'no penalty'}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <Bar
                      value={row.annualTotal}
                      max={maxRowCost}
                      color={isBest ? '#059669' : isCurrent ? '#0f172a' : '#94a3b8'}
                    />
                  </div>
                  {isCurrent && (
                    <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-700">
                      ● current subscription
                    </p>
                  )}
                  {isBest && !isCurrent && (
                    <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                      ● recommended
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Recommendation</p>
            <p className="mt-1 text-[12px] leading-5 text-slate-700">
              {best.power === h.subscribedPower ? (
                <>
                  Ps of <span className="font-bold">{fmt(h.subscribedPower, 0)} kVA</span> is already the cheapest
                  option — {fmtDT(best.annualTotal, 0)}/year.
                </>
              ) : (
                <>
                  Move to <span className="font-bold">{fmt(best.power, 0)} kVA</span> to save{' '}
                  <span className="font-bold text-emerald-700">{fmt(saving, 0)} DT/year</span>
                  {penaltyFree && penaltyFree.power !== best.power && (
                    <>
                      {' '}at the price of a {fmt(penaltyFree.headroom, 0)} kVA margin. A penalty-free subscription needs{' '}
                      <span className="font-bold">{fmt(penaltyFree.power, 0)} kVA</span> at{' '}
                      {fmtDT(penaltyFree.annualTotal, 0)}/year.
                    </>
                  )}
                </>
              )}
            </p>
            {current && (
              <p className="mt-2 border-t border-slate-200 pt-2 font-mono text-[10px] text-slate-500">
                current {fmtDT(current.annualTotal, 0)}/yr · {current.monthsOver} month(s) over Ps · headroom{' '}
                {fmt(current.headroom, 1)} kVA
              </p>
            )}
          </div>
        </SectionCard>
      </div>

      <StegAuditPanel />

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <SectionCard
          title="Monthly energy bill composition"
          subtitle="kWh actually consumed against the dinars billed for it"
          icon={Wallet}
        >
          <ComboChart
            labels={labels}
            bars={h.months.map((m) => m.energyKwh)}
            barLabel="Energy"
            barUnit="kWh"
            barRgb="217,119,6"
            barColor="#d97706"
            line={h.months.map((m) => m.cost)}
            lineLabel="Bill"
            lineUnit="DT"
            lineColor="#0f172a"
            lineDecimals={0}
            height="h-64"
          />
        </SectionCard>

        <SectionCard
          title="Demand shape: average vs. peak"
          subtitle="A wide gap between the two means poor load factor — the cheapest lever on Ps"
          icon={Gauge}
        >
          <ComboChart
            labels={labels}
            bars={h.months.map((m) => m.averageKva)}
            barLabel="Average demand"
            barUnit="kVA"
            barRgb="37,99,235"
            barColor="#2563eb"
            line={h.months.map((m) => m.peakKva)}
            lineLabel="Monthly peak"
            lineUnit="kVA"
            lineColor="#dc2626"
            lineDecimals={0}
            height="h-64"
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Monthly billing ledger"
        subtitle="Twelve-month STEG track derived from the telemetry history"
        icon={CalendarRange}
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[1000px] border-collapse text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-3 font-bold">Month</th>
                <th className="py-2 pr-3 font-bold">Energy</th>
                <th className="py-2 pr-3 font-bold">Avg kVA</th>
                <th className="py-2 pr-3 font-bold">Peak</th>
                <th className="py-2 pr-3 font-bold">Headroom</th>
                <th className="py-2 pr-3 font-bold">Load factor</th>
                <th className="py-2 pr-3 font-bold">Pieces</th>
                <th className="py-2 pr-3 font-bold">kWh/pc</th>
                <th className="py-2 pr-3 font-bold">DT/pc</th>
                <th className="py-2 pr-3 font-bold">Prime</th>
                <th className="py-2 pr-3 font-bold">Penalty</th>
                <th className="py-2 font-bold">Bill</th>
              </tr>
            </thead>
            <tbody>
              {h.months.map((m) => (
                <tr
                  key={m.key}
                  className={`border-b border-slate-100 transition hover:bg-slate-50 ${
                    m.exceeded ? 'bg-rose-50/40' : ''
                  }`}
                >
                  <td className="py-2 pr-3 font-bold text-slate-800">
                    {m.label} <span className="font-normal text-slate-400">{m.year}</span>
                    {m.partial && <span className="ml-1 text-[9px] text-amber-600">partial</span>}
                  </td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmtKwh(m.energyKwh, 0)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmt(m.averageKva, 1)}</td>
                  <td className="py-2 pr-3 font-semibold tabular text-slate-800">{fmt(m.peakKva, 1)}</td>
                  <td
                    className={`py-2 pr-3 tabular ${
                      m.exceeded ? 'text-rose-600' : m.headroom < 10 ? 'text-amber-600' : 'text-slate-600'
                    }`}
                  >
                    {m.exceeded ? `+${fmt(-m.headroom, 1)}` : fmt(m.headroom, 1)}
                  </td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmtPct(m.loadFactor, 1)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmt(m.units, 0)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{m.kwhPerUnit == null ? '--' : fmt(m.kwhPerUnit, 3)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{m.dtPerUnit == null ? '--' : fmt(m.dtPerUnit, 3)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmtDT(m.monthlyPrime, 0)}</td>
                  <td className="py-2 pr-3 tabular">
                    {m.monthlyPenalty > 0 ? (
                      <span className="font-bold text-rose-600">{fmtDT(m.monthlyPenalty, 0)}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2 font-bold tabular text-slate-900">{fmtDT(m.cost, 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 text-[11px]">
                <td className="py-2 pr-3 font-bold text-slate-900">{h.months.length} months</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-900">{fmtKwh(h.totalEnergyKwh, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-500">—</td>
                <td className="py-2 pr-3 font-bold tabular text-rose-600">{fmt(h.peakKva, 1)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-500">—</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-500">—</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmt(h.units, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmt(h.kwhPerUnit, 3)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmt(h.dtPerUnit, 3)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmtDT(h.annualPrime, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-rose-600">{fmtDT(h.annualPenalty, 0)}</td>
                <td className="py-2 font-bold tabular text-slate-900">{fmtDT(h.totalCost, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-slate-400">
          Prime column shows the monthly subscription prime for that month&apos;s Ps; annual totals are in the footer.
          Energy is billed at {fmt(h.energyRatePerKwh, 3)} DT/kWh; penalty supply at 12.5 DT/kVA/month beyond Ps + 10 %.
        </p>
      </SectionCard>
    </div>
  );
}
