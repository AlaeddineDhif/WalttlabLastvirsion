import { fmt, fmtCosPhi, fmtDT, fmtKvar, fmtKvarh } from '../lib/format';
import { BREACH_EVENTS, CONTRACT, PERIOD } from '../lib/cosPhiData';

/**
 * The low power-factor register, rendered as cards.
 *
 * This list belongs to the Alertes sub-module only. Suivi de dépassement owns the
 * curve and the KPI strip; it must not re-render these cards, or the two
 * sub-modules would drift into showing the same thing twice. The data still comes
 * from `cosPhiData`, so the cards and the dips under the line on the chart are
 * guaranteed to describe the same days.
 */
const SEVERITY = {
  critical: {
    card: 'border-red-200 bg-red-50/70',
    chip: 'border-red-200 bg-red-50 text-red-700',
    label: 'Réactif facturable',
    dot: 'bg-red-600'
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/70',
    chip: 'border-amber-300 bg-amber-50 text-amber-800',
    label: 'Alerte · sous seuil',
    dot: 'bg-amber-500'
  }
};

export default function CosPhiAlertList({ events = BREACH_EVENTS }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-energy-200 bg-energy-50 px-3 py-4 text-center text-[11px] text-energy-800">
        Aucun cos φ sous {fmt(CONTRACT.threshold, 2)} sur {PERIOD.days} jours simulés — le facteur de
        puissance est resté dans la bande gratuite du contrat.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => {
        const sev = SEVERITY[e.severity] || SEVERITY.warning;
        return (
          <li key={e.id} data-event-id={e.id} className={`rounded-lg border p-4 ${sev.card}`}>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-900">
                  {e.dateLabel} · {e.weekday} · {e.timeLabel}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">{e.id}</p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="tabular text-[15px] font-bold text-slate-900">
                  {fmtCosPhi(e.cosPhi)}
                </span>
                <span className="tabular rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                  −{fmtCosPhi(e.deficit)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sev.chip}`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${sev.dot}`}></span>
                  {sev.label}
                </span>
              </div>
            </div>

            {/* The floor and the reactive figures, restated per alert: a reader must
                not have to remember them from another screen. */}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/70 pt-2.5 sm:grid-cols-4">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Seuil
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmt(CONTRACT.threshold, 2)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Puissance active
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmt(e.activeKwa, 1)} kW
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Réactif
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmtKvar(e.reactiveKvar)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Pénalité STEG
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {e.penaltyDT > 0 ? fmtDT(e.penaltyDT) : '—'}
                </dd>
              </div>
            </dl>

            <p className="mt-2.5 text-[11px] leading-4 text-slate-600">{e.cause}</p>

            <p className="mt-1.5 font-mono text-[10px] text-slate-500">
              Cos φ {fmtCosPhi(e.cosPhi)} sous le seuil {fmt(CONTRACT.threshold, 2)} →{' '}
              {fmtKvarh(e.billableKvarh)} hors bande gratuite facturés à{' '}
              {fmt(CONTRACT.reactiveRatePerKvarh, 2)} DT/kvarh, soit {fmtDT(e.penaltyDT)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
