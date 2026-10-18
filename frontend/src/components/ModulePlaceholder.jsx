import PageHeader from './PageHeader';

/**
 * Module identity header: title, functional description, units and an optional
 * status chip. It is the standard page header for analysis views, so a module
 * looks identical whether its body is a reserved empty area or a full dashboard.
 *
 * The legacy `icon`/`accent`/`surface`/`ink` props are accepted for compatibility
 * but no longer drive colour: one calm surface beats a rainbow of module tints.
 */
export function ModuleHeader({ title, subtitle, scope, status, statusClass }) {
  const hasRight = Boolean(scope || status);
  return (
    <PageHeader
      title={title}
      description={subtitle}
      actions={
        hasRight ? (
          <div className="flex items-end gap-5">
            {scope && (
              <div className="text-right">
                <div className="wl-kpi-label">Units</div>
                <div className="mt-1 font-mono text-[13px] font-medium text-slate-800">{scope}</div>
              </div>
            )}
            {status && (
              <span
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  statusClass || 'border-slate-300 bg-slate-100 text-slate-600'
                }`}
              >
                {status}
              </span>
            )}
          </div>
        ) : null
      }
    />
  );
}

/**
 * Shell for a module that is registered and navigable but has no data source
 * yet: identity plus a concise reserved state, so the navigation structure is
 * final before the features land.
 */
export default function ModulePlaceholder({
  icon: Icon,
  title,
  subtitle,
  scope,
  status = 'À venir'
}) {
  return (
    <div className="space-y-4">
      <ModuleHeader title={title} subtitle={subtitle} scope={scope} status={status} />

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center">
        {Icon && <Icon className="mb-2.5 h-5 w-5 text-slate-300" />}
        <p className="text-[13px] font-medium text-slate-600">{title}</p>
        <p className="mt-1 max-w-md text-[12px] leading-5 text-slate-400">
          No data source is connected to this module yet. Its readings, charts and
          alerts will appear here once the feed is wired in.
        </p>
      </div>
    </div>
  );
}
