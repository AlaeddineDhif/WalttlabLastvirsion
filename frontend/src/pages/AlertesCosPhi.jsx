import { BellRing, Sigma, TriangleAlert } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import CosPhiAlertList from '../components/CosPhiAlertList';
import { CHIP } from '../lib/tags';
import { fmt, fmtCosPhi, fmtDT, fmtKvarh } from '../lib/format';
import {
  ALERT_SUMMARY,
  BREACH_EVENTS,
  CONTRACT,
  CRITICAL_THRESHOLD,
  HOURS_BELOW,
  PERIOD,
  SIMULATION_NOTE
} from '../lib/cosPhiData';

/**
 * The Alertes sub-module of Cos Phi: the register of every day the power factor
 * fell under the contractual floor, kept apart from the Suivi curve on purpose.
 * One screen answers "when did it drop, how far, how much reactive energy, and
 * what does STEG charge for it" — without making the reader cross-reference
 * another sub-module.
 */
export default function AlertesCosPhi() {
  const { total, critical, warning, billableKvarh, penaltyDT, worst } = ALERT_SUMMARY;

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={BellRing}
        title="Alertes"
        subtitle={`Registre des franchissements du seuil de cos φ ${fmt(CONTRACT.threshold, 2)} sur ${PERIOD.label}. Chaque alerte reprend la valeur du jour, l’énergie réactive hors bande gratuite et la pénalité STEG correspondante.`}
        scope="seuils · alertes"
        accent="#0f172a"
        status="Données simulées"
        statusClass={CHIP.amber}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={BellRing}
          label="Alertes déclenchées"
          value={fmt(total, 0)}
          sub={`jours sous cos φ ${fmt(CONTRACT.threshold, 2)} · ${HOURS_BELOW} h cumulées`}
          accent={total > 0 ? '#b45309' : '#059669'}
        />
        <StatTile
          icon={TriangleAlert}
          label="Alertes critiques"
          value={fmt(critical, 0)}
          sub={`sous cos φ ${fmt(CRITICAL_THRESHOLD, 2)} · ${warning} en simple avertissement`}
          accent={critical > 0 ? '#dc2626' : '#059669'}
          tone={critical > 0 ? 'critical' : 'good'}
        />
        <StatTile
          icon={Sigma}
          label="Exposition simulée"
          value={fmtDT(penaltyDT)}
          sub={`${fmtKvarh(billableKvarh)} hors bande gratuite`}
          accent="#0f172a"
        />
      </div>

      <SectionCard
        title="Registre des cos φ sous seuil"
        subtitle={`${total} alerte${total > 1 ? 's' : ''} enregistrée${total > 1 ? 's' : ''} · dérivée du cos φ mesuré, jamais déclarée à la main`}
        icon={Sigma}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-700">
            <span aria-hidden="true" className="h-0.5 w-3 bg-rose-500"></span>
            Seuil {fmt(CONTRACT.threshold, 2)} · critique {fmt(CRITICAL_THRESHOLD, 2)}
          </span>
        }
      >
        <CosPhiAlertList events={BREACH_EVENTS} />
      </SectionCard>

      <SectionCard
        title="Règle de facturation du réactif"
        subtitle="Les montants appliqués à chaque alerte, alignés sur le seuil contractuel"
        icon={TriangleAlert}
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Seuil gratuit</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              cos φ ≥ {fmt(CONTRACT.threshold, 2)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Seuil critique</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              cos φ &lt; {fmt(CRITICAL_THRESHOLD, 2)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Tarif du réactif facturable</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              {fmt(CONTRACT.reactiveRatePerKvarh, 2)} DT/kvarh
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Creux le plus bas alerté</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              {worst ? `${fmtCosPhi(worst.cosPhi)} · ${worst.dateLabel} · ${worst.timeLabel}` : '—'}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          Le seuil de {fmt(CONTRACT.threshold, 2)} est une moyenne, pas un instantané : seul le
          réactif qui sort de la bande gratuite est facturable. Sous cos φ{' '}
          {fmt(CRITICAL_THRESHOLD, 2)}, l’alerte passe en critique et l’ensemble de l’énergie
          réactive de la tranche est concerné
          {worst && (
            <>
              {' '}
              — {fmtKvarh(worst.billableKvarh)} sur la pointe du {worst.dateLabel}, soit{' '}
              {fmtDT(worst.penaltyDT)} au tarif de {fmt(CONTRACT.reactiveRatePerKvarh, 2)} DT/kvarh.
            </>
          )}
          .
        </p>
      </SectionCard>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} Ces alertes dérivent du jeu de données simulé du Suivi de dépassement ;
        aucun compteur STEG n’est branché et le tarif réactif de{' '}
        {fmt(CONTRACT.reactiveRatePerKvarh, 2)} DT/kvarh est une hypothèse de cette vue.
      </p>
    </div>
  );
}
