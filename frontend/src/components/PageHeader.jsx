/**
 * Standard page header used by every view: title, an optional functional
 * description, and the page's own actions or context stats on the right. One
 * silhouette everywhere, so a page built this quarter still matches one built
 * next year. No marketing taglines live here.
 */
export default function PageHeader({ title, description, actions, children }) {
  const right = actions || children;
  return (
    <div className="wl-page-head">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>}
      </div>
      {right && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Compact context figure for a page header — "bill now", "efficiency". Same
 * rhythm as a KPI but subordinate to it: smaller, unboxed, no card.
 */
export function PageStat({ label, value, unit, tone = 'default' }) {
  const valueCls =
    tone === 'critical'
      ? 'text-red-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'energy'
          ? 'text-energy-700'
          : 'text-slate-900';
  return (
    <div>
      <div className="wl-kpi-label">{label}</div>
      <div className="mt-1 flex items-end gap-1">
        <span className={`text-[19px] font-semibold leading-none tabular ${valueCls}`}>{value}</span>
        {unit && <span className="mb-0.5 text-[10px] font-medium text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}
