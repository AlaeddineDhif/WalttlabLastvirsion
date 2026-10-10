import { BellRing, TrendingUp } from 'lucide-react';

/**
 * Ordered sub-sections of the Cos Phi module. Same contract as the Consommation
 * and Puissance souscrite registries: the sidebar builds its sub-menu from this
 * list and each placeholder view reads its own entry, so they cannot drift.
 */
export const COSPHI_SUB_MODULES = [
  {
    id: 'cp-depassement',
    label: 'Suivi de dépassement',
    short: 'Dépassement',
    description: 'Cos φ minimal atteint et franchissements de seuil',
    icon: TrendingUp,
    accent: '#059669',
    surface: 'border-emerald-200 bg-emerald-50',
    ink: 'text-emerald-700',
    subtitle:
      'Évolution du facteur de puissance jusqu’à sa valeur minimale, avec les franchissements de seuil, la durée cumulée hors consigne et l’énergie réactive correspondante.',
    scope: 'cos φ · durée'
  },
  {
    id: 'cp-alertes',
    label: 'Alertes',
    short: 'Alertes',
    description: 'Seuils de cos φ et notifications',
    icon: BellRing,
    accent: '#0f172a',
    surface: 'border-slate-300 bg-slate-100',
    ink: 'text-slate-800',
    subtitle:
      'Seuils de cos φ configurés, historique des dépassements et notifications adressées à l’exploitant avant toute pénalité de puissance réactive.',
    scope: 'seuils · alertes'
  }
];

export function findCosPhiSubModule(id) {
  return COSPHI_SUB_MODULES.find((m) => m.id === id) || null;
}


