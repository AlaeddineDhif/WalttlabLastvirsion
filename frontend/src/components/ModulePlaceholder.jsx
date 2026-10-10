/**
 * Module identity header: icon, title, status chip, description and units. Shared
 * so a module looks identical whether its body is a reserved empty area or a
 * populated dashboard.
 */
export function ModuleHeader({
  icon: Icon,
  title,
  subtitle,
  scope,
  accent,
  surface,
  ink,
  status,
  statusClass
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      ></div>

      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 gap-3.5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: `${accent}14`, color: accent }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15px] font-extrabold tracking-tight text-slate-900">
                {title}
              </h2>
              {status && (
                <span
                  className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    statusClass || `${surface} ${ink}`
                  }`}
                >
                  {status}
                </span>
              )}
            </div>
            <p className="mt-1 max-w-xl text-[11px] leading-4 text-slate-500">{subtitle}</p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Unités
          </p>
          <p className="mt-0.5 font-mono text-[12px] font-bold text-slate-900">{scope}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Shell for a module that is registered and navigable but has no data source
 * yet. It renders the module identity (icon, title, scope, status) plus a clean
 * reserved area, so the navigation structure is final before the features land.
 */
export default function ModulePlaceholder({
  icon,
  title,
  subtitle,
  scope,
  accent,
  surface,
  ink,
  status = 'À venir'
}) {
  const Icon = icon;
  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        scope={scope}
        accent={accent}
        surface={surface}
        ink={ink}
        status={status}
      />

      <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
            <Icon className="h-5 w-5 text-slate-300" />
          </span>
          <p className="mt-3 text-[12px] font-semibold text-slate-500">
            Module vide — indicateurs à venir
          </p>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            L’espace est réservé. Les relevés, graphiques et alertes de ce module
            s’afficheront ici dès que la source de données sera branchée.
          </p>
        </div>
      </div>
    </div>
  );
}
