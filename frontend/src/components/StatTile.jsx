/**
 * Shared surfaces for every module: stat tiles, section cards, progress bars and
 * loading states. One flat, bordered silhouette across the platform, so a page
 * built today still matches one built next quarter.
 */
export function StatTile({ icon: Icon, label, value, sub, tone = 'default' }) {
  const valueTone =
    tone === 'critical' ? 'text-red-700' : tone === 'good' ? 'text-energy-700' : 'text-slate-900';

  return (
    <div className="wl-card p-3.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className="wl-kpi-label truncate">{label}</span>
      </div>
      <div className={`mt-1.5 text-[20px] font-semibold leading-none tabular ${valueTone}`}>
        {value}
      </div>
      {sub && <div className="mt-1 truncate font-mono text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, icon: Icon, actions, children, className = '' }) {
  return (
    <section className={`wl-card p-4 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
          <div className="min-w-0 leading-tight">
            <h2 className="wl-section-title">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[10px] text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Bar({ value, max, color, track = 'bg-slate-100', height = 'h-1.5' }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className={`w-full overflow-hidden rounded-sm ${track} ${height}`}>
      <div
        className={`h-full rounded-sm transition-[width] duration-500 ease-out ${color}`}
        style={{ width: `${width}%` }}
      ></div>
    </div>
  );
}

export function LoadingBlock({ label }) {
  return (
    <div className="wl-card p-4">
      <div className="flex items-center gap-2.5">
        <div className="skeleton h-4 w-4 rounded"></div>
        <div className="flex-1">
          <p className="text-[12px] font-medium text-slate-600">{label}</p>
          <div className="skeleton mt-1.5 h-2 w-40"></div>
        </div>
      </div>
      <div className="skeleton mt-4 h-40 w-full"></div>
    </div>
  );
}
