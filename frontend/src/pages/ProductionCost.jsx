import { useMemo, useState } from 'react';
import { Cpu, Coins, Trophy, TrendingDown, Layers, Plus, CheckCircle2 } from 'lucide-react';
import BarChart from '../components/BarChart';
import ComboChart from '../components/ComboChart';
import { SectionCard, StatTile, Bar, LoadingBlock } from '../components/StatTile';
import useCostReport from '../hooks/useCostReport';
import useWorkload from '../hooks/useWorkload';
import ProductionPanel from '../components/ProductionPanel';
import { useTelemetry } from '../context/TelemetryContext';
import { fmt, fmtDT, fmtKwh, fmtKwhUnit, fmtDTUnit } from '../lib/format';

const WINDOWS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 180, label: '180 days' }
];

export default function ProductionCost() {
  const [departmentId, setDepartmentId] = useState('');
  const [workshopId, setWorkshopId] = useState('');
  const [days, setDays] = useState(90);

  const report = useCostReport({ departmentId: departmentId || null, workshopId: workshopId || null, days });
  const { data: workload } = useWorkload(30000);
  const { metrics } = useTelemetry();

  const departments = workload?.departments || [];
  const workshops = useMemo(
    () => (departmentId ? departments.find((d) => d.id === departmentId)?.workshops || [] : []),
    [departments, departmentId]
  );

  if (report.loading && !report.data) return <LoadingBlock label="Loading production cost report…" />;

  const r = report.data;
  if (!r) return <LoadingBlock label="Cost report unavailable — is the backend running?" />;

  const t = r.totals;
  const monthLabels = r.byMonth.map((m) => m.label);
  const maxCost = Math.max(...r.byWorkshop.map((w) => w.cost), 1);

  const onDepartment = (id) => {
    setDepartmentId(id);
    setWorkshopId('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={Cpu}
          accent="#059669"
          label="Energy per piece"
          value={t.kwhPerUnit == null ? '--' : fmt(t.kwhPerUnit, 3)}
          sub="kWh / piece"
          tone={r.mostEfficient && t.kwhPerUnit > r.mostEfficient.kwhPerUnit * 1.2 ? 'critical' : 'default'}
        />
        <StatTile
          icon={Coins}
          accent="#d97706"
          label="Cost per piece"
          value={t.dtPerUnit == null ? '--' : fmt(t.dtPerUnit, 3)}
          sub="DT / piece"
        />
        <StatTile
          icon={Layers}
          accent="#2563eb"
          label="Pieces produced"
          value={fmt(t.units, 0)}
          sub={`in ${r.windowDays} days`}
        />
        <StatTile
          icon={Coins}
          accent="#0f172a"
          label="Energy spend"
          value={fmt(t.cost, 0)}
          sub={`DT over ${r.windowDays} days`}
        />
        <StatTile
          icon={Trophy}
          accent="#059669"
          label="Best practice"
          value={r.mostEfficient ? fmt(r.mostEfficient.kwhPerUnit, 2) : '--'}
          sub={r.mostEfficient ? `kWh/pc · ${r.mostEfficient.name}` : 'kWh/pc'}
          tone="good"
        />
        <StatTile
          icon={TrendingDown}
          accent="#dc2626"
          label="Excess vs. best"
          value={fmt(r.outlierCost, 0)}
          sub={`DT wasted · ${fmt(r.bestPracticeGap * 100, 0)}% gap`}
          tone={r.outlierCost > 0 ? 'critical' : 'good'}
        />
      </div>

      <SectionCard
        title="Scope"
        subtitle="Filter the report to a department, a single workshop and a time window"
        icon={Layers}
        actions={
          <div className="flex flex-wrap items-center gap-1">
            {WINDOWS.map((w) => (
              <button
                key={w.days}
                onClick={() => setDays(w.days)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide transition ${
                  w.days === days
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => onDepartment(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
              Workshop
            </label>
            <select
              value={workshopId}
              onChange={(e) => setWorkshopId(e.target.value)}
              disabled={!departmentId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[12px] font-medium text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">{departmentId ? 'All workshops' : 'Select a department first'}</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.auxiliary ? ' (auxiliary)' : w.kwhPerUnit ? ` · ${w.kwhPerUnit} kWh/pc` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="self-end pb-1 font-mono text-[10px] text-slate-500">
            {r.scope.department ? (
              <>
                scope: <span className="font-bold text-slate-800">{r.scope.department.name}</span>
                {r.scope.workshop && (
                  <>
                    {' '}
                    / <span className="font-bold text-slate-800">{r.scope.workshop.name}</span>
                  </>
                )}
              </>
            ) : (
              <>
                scope: <span className="font-bold text-slate-800">whole plant</span>
              </>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <SectionCard
          title="Energy per piece by workshop"
          subtitle="Specific consumption — the efficiency KPI. Lower is better; auxiliary cells are excluded."
          icon={Cpu}
          className="2xl:col-span-2"
        >
          {r.byWorkshop.length ? (
            <BarChart
              label="kWh per piece"
              labels={r.byWorkshop.map((w) => w.name)}
              values={r.byWorkshop.map((w) => w.kwhPerUnit ?? 0)}
              colors={r.byWorkshop.map((w) => (w.auxiliary ? '#cbd5e1' : w.color))}
              unit="kWh/pc"
              decimals={2}
              height="h-80"
            />
          ) : (
            <div className="flex h-80 items-center justify-center text-sm text-slate-400">No data in scope.</div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Efficiency ranking" subtitle="Ranked by specific consumption" icon={Trophy}>
            {r.byWorkshop.length ? (
              <div className="space-y-1.5">
                {r.byWorkshop.map((w, i) => {
                  const best = r.byWorkshop[0]?.kwhPerUnit;
                  const ratio = best > 0 && w.kwhPerUnit ? w.kwhPerUnit / best : null;
                  return (
                    <div key={w.id} className="rounded-lg border border-slate-200 p-2">
                      <div className="flex items-center gap-2">
                        <span className="w-4 shrink-0 font-mono text-[10px] font-bold text-slate-400">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-semibold text-slate-800">{w.name}</span>
                          <span className="block truncate font-mono text-[9px] text-slate-400">
                            {w.departmentName}
                            {w.auxiliary ? ' · auxiliary' : ''}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] font-bold tabular text-slate-800">
                          {w.auxiliary ? '—' : `${fmt(w.kwhPerUnit, 2)}`}
                        </span>
                      </div>
                      {!w.auxiliary && ratio != null && (
                        <>
                          <div className="mt-1.5">
                            <Bar value={w.kwhPerUnit} max={r.byWorkshop[r.byWorkshop.length - 1]?.kwhPerUnit || 1} color={w.color} height="h-1" />
                          </div>
                          <div className="mt-1 flex justify-between font-mono text-[9px]">
                            <span className="text-slate-400">{fmt(w.dtPerUnit, 3)} DT/pc</span>
                            <span className={w.vsAverage > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                              {w.vsAverage > 0 ? '+' : ''}
                              {fmt(w.vsAverage * 100, 0)}% vs avg
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No workshops in scope.</p>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
        <SectionCard
          title="Monthly consumption vs. unit cost"
          subtitle="Total kWh against the resulting DT per piece"
          icon={Coins}
        >
          {r.byMonth.length ? (
            <ComboChart
              labels={monthLabels}
              bars={r.byMonth.map((m) => m.energyKwh)}
              barLabel="Energy"
              barUnit="kWh"
              barRgb="5,150,105"
              barColor="#059669"
              line={r.byMonth.map((m) => m.dtPerUnit)}
              lineLabel="Cost per piece"
              lineUnit="DT/pc"
              lineColor="#d97706"
              lineDecimals={3}
              height="h-64"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data in scope.</div>
          )}
        </SectionCard>

        <SectionCard
          title="Department energy spend"
          subtitle={`Dinars billed over the last ${r.windowDays} days`}
          icon={Layers}
        >
          {r.byDepartment.length ? (
            <BarChart
              label="Energy spend"
              labels={r.byDepartment.map((d) => d.name)}
              values={r.byDepartment.map((d) => d.cost)}
              colors={r.byDepartment.map((d) => d.color)}
              unit="DT"
              decimals={0}
              height="h-64"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">No data in scope.</div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Workshop cost ledger"
        subtitle="Auxiliary workshops consume energy without producing pieces — shown with zero units"
        icon={Coins}
      >
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[900px] border-collapse text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-[9px] uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-3 font-bold">Workshop</th>
                <th className="py-2 pr-3 font-bold">Department</th>
                <th className="py-2 pr-3 font-bold">Rated</th>
                <th className="py-2 pr-3 font-bold">Batches</th>
                <th className="py-2 pr-3 font-bold">Pieces</th>
                <th className="py-2 pr-3 font-bold">Energy</th>
                <th className="py-2 pr-3 font-bold">Spend</th>
                <th className="py-2 pr-3 font-bold">kWh/pc</th>
                <th className="py-2 pr-3 font-bold">DT/pc</th>
                <th className="py-2 pr-3 font-bold">vs avg</th>
                <th className="py-2 font-bold">Excess cost</th>
              </tr>
            </thead>
            <tbody>
              {r.byWorkshop.map((w) => (
                <tr key={w.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                  <td className="py-2 pr-3 font-semibold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: w.color }}></span>
                      {w.name}
                      {w.auxiliary && <span className="text-[9px] text-slate-400">aux</span>}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-slate-500">{w.departmentName}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmt(w.ratedKva, 0)} kVA</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmt(w.records, 0)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmt(w.units, 0)}</td>
                  <td className="py-2 pr-3 tabular text-slate-600">{fmtKwh(w.energyKwh, 0)}</td>
                  <td className="py-2 pr-3 font-semibold tabular text-slate-800">{fmtDT(w.cost, 0)}</td>
                  <td className="py-2 pr-3 tabular text-slate-700">
                    {w.kwhPerUnit == null ? <span className="text-slate-400">—</span> : fmt(w.kwhPerUnit, 3)}
                  </td>
                  <td className="py-2 pr-3 tabular text-slate-700">
                    {w.dtPerUnit == null ? <span className="text-slate-400">—</span> : fmt(w.dtPerUnit, 3)}
                  </td>
                  <td className={`py-2 pr-3 tabular ${w.vsAverage > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {w.vsAverage == null ? '—' : `${w.vsAverage > 0 ? '+' : ''}${fmt(w.vsAverage * 100, 0)}%`}
                  </td>
                  <td className="py-2 tabular">
                    {w.excessCost > 0 ? (
                      <span className="font-bold text-rose-600">{fmtDT(w.excessCost, 0)}</span>
                    ) : (
                      <span className="text-emerald-600">on target</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 text-[11px]">
                <td className="py-2 pr-3 font-bold text-slate-900">Total</td>
                <td className="py-2 pr-3 font-bold text-slate-500">—</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-500">—</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-500">{fmt(t.records, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmt(t.units, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-900">{fmtKwh(t.energyKwh, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-900">{fmtDT(t.cost, 0)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmtKwhUnit(t.kwhPerUnit)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-800">{fmtDTUnit(t.dtPerUnit)}</td>
                <td className="py-2 pr-3 font-bold tabular text-slate-500">—</td>
                <td className="py-2 font-bold tabular text-rose-600">{fmtDT(r.outlierCost, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          <ProductionPanel currentEnergy={metrics.energy} />
        </div>

        <SectionCard title="Where the money goes" subtitle="Cost attribution" icon={CheckCircle2}>
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Best practice</p>
              {r.mostEfficient ? (
                <p className="mt-1 text-[12px] font-semibold text-emerald-900">{r.mostEfficient.name}</p>
              ) : (
                <p className="mt-1 text-[12px] text-slate-500">—</p>
              )}
              {r.mostEfficient && (
                <p className="mt-0.5 font-mono text-[10px] text-emerald-700">
                  {fmt(r.mostEfficient.kwhPerUnit, 2)} kWh/pc · {fmt(r.mostEfficient.dtPerUnit, 3)} DT/pc
                </p>
              )}
            </div>

            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-wider text-rose-700">Worst performer</p>
              {r.leastEfficient ? (
                <p className="mt-1 text-[12px] font-semibold text-rose-900">{r.leastEfficient.name}</p>
              ) : (
                <p className="mt-1 text-[12px] text-slate-500">—</p>
              )}
              {r.leastEfficient && (
                <p className="mt-0.5 font-mono text-[10px] text-rose-700">
                  {fmt(r.leastEfficient.kwhPerUnit, 2)} kWh/pc · {fmtDT(r.leastEfficient.excessCost, 0)} above average
                </p>
              )}
            </div>

            <p className="text-[11px] leading-5 text-slate-500">
              Closing the gap between the worst and best workshop would save{' '}
              <span className="font-bold text-emerald-700">{fmtDT(r.outlierCost, 0)}</span> over{' '}
              {r.windowDays} days — the plant currently averages{' '}
              <span className="font-mono font-semibold text-slate-700">{fmt(t.kwhPerUnit, 3)} kWh/pc</span> against a
              best-practice floor of{' '}
              <span className="font-mono font-semibold text-slate-700">
                {r.mostEfficient ? fmt(r.mostEfficient.kwhPerUnit, 3) : '--'}
              </span>
              .
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
