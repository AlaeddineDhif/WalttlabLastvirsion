export function StatTile({ icon: Icon, label, value, sub, accent, tone = 'default' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" style={accent ? { color: accent } : undefined} />}
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-bold tabular ${tone === 'critical' ? 'text-rose-700' : tone === 'good' ? 'text-emerald-700' : 'text-slate-900'}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-card ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-500" />}
          <div className="min-w-0 leading-tight">
            <h2 className="text-[13px] font-bold tracking-wide text-slate-900">{title}</h2>
            {subtitle && <p className="truncate text-[10px] text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Bar({ value, max, color, track = 'bg-slate-200', height = 'h-1.5' }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`w-full overflow-hidden rounded-full ${track} ${height}`}>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }}></div>
    </div>
  );
}

export function LoadingBlock({ label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
