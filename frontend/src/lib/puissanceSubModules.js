import { BellRing, Siren } from 'lucide-react';

/**
 * Ordered sub-sections of the Puissance souscrite module. Same contract as the
 * Consommation registry: the sidebar builds its sub-menu from this list and each
 * placeholder view reads its own entry, so they can never drift apart.
 */
export const PUISSANCE_SUB_MODULES = [
  {
    id: 'ps-depassement',
    label: 'Surveillance du dépassement',
    short: 'Dépassement',
    description: 'Pointe appelée comparée à la puissance souscrite Ps',
    icon: Siren,
    accent: '#059669',
    surface: 'border-emerald-200 bg-emerald-50',
    ink: 'text-emerald-700',
    subtitle:
      'Écart entre la pointe appelée et la puissance souscrite Ps, avec le dépassement instantané, la prime STEG associée et l’heure de pointe responsable.',
    scope: 'kVA · %'
  },
  {
    id: 'ps-alertes',
    label: 'Alertes',
    short: 'Alertes',
    description: 'Seuils de dépassement et notifications',
    icon: BellRing,
    accent: '#0f172a',
    surface: 'border-slate-300 bg-slate-100',
    ink: 'text-slate-800',
    subtitle:
      'Seuils de dépassement configurés, historique des franchissements et notifications adressées à l’exploitant avant dépassement de Ps.',
    scope: 'seuils · alertes'
  }
];

export function findPuissanceSubModule(id) {
  return PUISSANCE_SUB_MODULES.find((m) => m.id === id) || null;
}
