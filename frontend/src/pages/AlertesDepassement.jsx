import { BellRing, Siren, TriangleAlert } from 'lucide-react';
import { ModuleHeader } from '../components/ModulePlaceholder';
import { SectionCard, StatTile } from '../components/StatTile';
import DepassementAlertList from '../components/DepassementAlertList';
import { CHIP } from '../lib/tags';
import { fmt, fmtDT, fmtKva } from '../lib/format';
import {
  ALERT_SUMMARY,
  CONTRACT,
  DEPASSEMENT_EVENTS,
  PERIOD,
  PRIME_ANNUAL,
  PRIME_MONTHLY,
  SIMULATION_NOTE,
  TOLERANCE_KVA
} from '../lib/puissanceData';

/**
 * The Alertes sub-module: the register of every day the site went over the
 * contracted power, kept apart from the Surveillance curve on purpose. One screen
 * answers "when did it happen, by how much, and what does STEG charge for it" —
 * without making the reader cross-reference another sub-module.
 */
export default function AlertesDepassement() {
  const { total, critical, monthlyPenaltyIfRecurring, worst } = ALERT_SUMMARY;

  return (
    <div className="space-y-4">
      <ModuleHeader
        icon={BellRing}
        title="Alertes"
        subtitle={`Registre des franchissements de la puissance souscrite Ps sur ${PERIOD.label}. Chaque alerte reprend la pointe du jour, l’excès facturable après la tolérance de ${fmtKva(TOLERANCE_KVA)} et la pénalité STEG correspondante.`}
        scope="seuils · alertes"
        accent="#0f172a"
        status="Données simulées"
        statusClass={CHIP.amber}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={Siren}
          label="Alertes déclenchées"
          value={fmt(total, 0)}
          sub={`jours au-dessus de Ps · ${PERIOD.days} jours simulés`}
          accent={total > 0 ? '#b45309' : '#16A34A'}
        />
        <StatTile
          icon={TriangleAlert}
          label="Alertes critiques"
          value={fmt(critical, 0)}
          sub={`au-delà de Ps + ${fmtKva(TOLERANCE_KVA)} de tolérance`}
          accent={critical > 0 ? '#dc2626' : '#16A34A'}
          tone={critical > 0 ? 'critical' : 'good'}
        />
        <StatTile
          icon={BellRing}
          label="Exposition mensuelle"
          value={fmtDT(monthlyPenaltyIfRecurring)}
          sub="si les mêmes dépassements se répètent chaque mois"
          accent="#0f172a"
        />
      </div>

      <SectionCard
        title="Registre des dépassements"
        subtitle={`${total} alerte${total > 1 ? 's' : ''} enregistrée${total > 1 ? 's' : ''} · dérivée de la pointe appelée, jamais déclarée à la main`}
        icon={Siren}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-red-700">
            <span aria-hidden="true" className="h-0.5 w-3 bg-red-500"></span>
            Ps {fmt(CONTRACT.ps, 1)} kVA · tolérance {fmtKva(TOLERANCE_KVA)}
          </span>
        }
      >
        <DepassementAlertList events={DEPASSEMENT_EVENTS} />
      </SectionCard>

      <SectionCard
        title="Règle de facturation STEG"
        subtitle="Les montants appliqués à chaque alerte, alignés sur le moteur tarifaire du backend"
        icon={TriangleAlert}
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Prime de souscription</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              {fmtDT(PRIME_MONTHLY)}/mois · {fmtDT(PRIME_ANNUAL)}/an
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Tolérance gratuite (10 % de Ps)</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              {fmtKva(TOLERANCE_KVA)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Pénalité au-delà de la tolérance</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              {fmtDT(CONTRACT.penaltyRatePerKvaPerMonth)}/kVA/mois
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
            <dt className="text-[11px] text-slate-600">Pointe la plus haute alertée</dt>
            <dd className="tabular shrink-0 font-mono text-[11px] font-semibold text-slate-900">
              {worst ? `${fmtKva(worst.peakKva)} · ${worst.dateLabel} · ${worst.timeLabel}` : '—'}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          Un jour au-dessus de Ps mais sous Ps + {fmtKva(TOLERANCE_KVA)} déclenche une alerte sans
          pénalité. Au-delà, seul l’excès est facturable
          {worst && (
            <>
              {' '}
              — {fmtKva(worst.taxableKva)} sur la pointe du {worst.dateLabel}, soit{' '}
              {fmtDT(worst.penaltyPerMonth)}/mois au tarif de{' '}
              {fmtDT(CONTRACT.penaltyRatePerKvaPerMonth)}/kVA/mois.
            </>
          )}
          .
        </p>
      </SectionCard>

      <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-800">
        <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
        {SIMULATION_NOTE} Ces alertes sont dérivées du jeu de données simulé de la Surveillance du
        dépassement ; aucun compteur STEG n’est branché.
      </p>
    </div>
  );
}
