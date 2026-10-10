import { fmt, fmtDT, fmtKva } from '../lib/format';
import { DEPASSEMENT_EVENTS, PERIOD, TOLERANCE_KVA } from '../lib/puissanceData';

/**
 * The overrun register, rendered as cards.
 *
 * This list belongs to the Alertes sub-module only. Surveillance du dépassement
 * owns the curve and the KPIs; it must not re-render these cards, or the two
 * sub-modules would drift into showing the same thing twice. The data itself
 * still comes from `puissanceData`, so the cards and the chart above the limit
 * are guaranteed to describe the same days.
 */
const SEVERITY = {
  critical: {
    card: 'border-rose-200 bg-rose-50/70',
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    label: 'Pénalité STEG',
    dot: 'bg-rose-600'
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/70',
    chip: 'border-amber-300 bg-amber-50 text-amber-800',
    label: 'Alerte · tolérance',
    dot: 'bg-amber-500'
  }
};

export default function DepassementAlertList({ events = DEPASSEMENT_EVENTS }) {
  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-4 text-center text-[11px] text-emerald-800">
        Aucun dépassement de Ps sur {PERIOD.days} jours simulés — la pointe appelée est restée
        sous la puissance souscrite, tolérance de {fmtKva(TOLERANCE_KVA)} comprise.
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
                  {fmtKva(e.peakKva)}
                </span>
                <span className="tabular rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                  +{fmtKva(e.overrunKva)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${sev.chip}`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${sev.dot}`}></span>
                  {sev.label}
                </span>
              </div>
            </div>

            {/* The limit and the free allowance, restated per alert: a reader must
                not have to remember them from another screen. */}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-white/70 pt-2.5 sm:grid-cols-4">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Ps
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmtKva(e.psKva)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Tolérance
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmtKva(e.toleranceKva)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Excès facturable
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmtKva(e.taxableKva)}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Pénalité
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {e.penaltyPerMonth > 0 ? `${fmtDT(e.penaltyPerMonth)}/mois` : '—'}
                </dd>
              </div>
            </dl>

            <p className="mt-2.5 text-[11px] leading-4 text-slate-600">{e.cause}</p>

            <p className="mt-1.5 font-mono text-[10px] text-slate-500">
              {e.severity === 'critical'
                ? `Excess facturable ${fmtKva(e.taxableKva)} au-delà de Ps + ${fmtKva(e.toleranceKva)} de tolérance → ${fmtDT(e.penaltyPerMonth)}/mois`
                : `Dépassement de ${fmtKva(e.overrunKva)} sous la tolérance de ${fmtKva(e.toleranceKva)} → aucune pénalité`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
