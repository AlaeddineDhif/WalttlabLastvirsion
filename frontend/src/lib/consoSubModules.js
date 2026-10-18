import { Coins, Network, Split } from 'lucide-react';
import { BRAND_NAVY } from './brand';

/**
 * Ordered sub-sections of the Consommation module. This registry is the single
 * source of truth: the sidebar builds its sub-menu from it and each placeholder
 * view reads its own copy, so labels, order and accents can never drift apart.
 */
export const CONSO_SUB_MODULES = [
  {
    id: 'conso-distribution',
    label: 'Distribution énergétique',
    short: 'Distribution',
    description: 'Répartition de l’énergie par atelier et par poste',
    icon: Network,
    accent: '#16A34A',
    surface: 'border-energy-200 bg-energy-50',
    ink: 'text-energy-700',
    subtitle:
      'Répartition de l’énergie entre les ateliers et les postes de consommation, avec le poids de chaque appel de puissance.',
    scope: 'kWh · %'
  },
  {
    id: 'conso-production',
    label: 'Production & Consommation',
    short: 'Production',
    description: 'Production réalisée et énergie consommée',
    icon: Split,
    accent: '#0f172a',
    surface: 'border-slate-300 bg-slate-100',
    ink: 'text-slate-800',
    subtitle:
      'Mise en regard de la production réalisée et de l’énergie consommée sur la même période, jusqu’à l’intensité unitaire.',
    scope: 'pcs · kWh/pc'
  },
  {
    id: 'conso-ratio-cout',
    label: 'Ratio coût',
    short: 'Ratio coût',
    description: 'Coût de l’énergie par unité produite',
    icon: Coins,
    accent: BRAND_NAVY,
    surface: 'border-brand-200 bg-brand-50',
    ink: 'text-brand-700',
    subtitle:
      'Coût de l’énergie rapporté à la production, selon le tarif STEG appliqué, pour suivre le coût unitaire dans le temps.',
    scope: 'TND · TND/pc'
  }
];

export function findConsoSubModule(id) {
  return CONSO_SUB_MODULES.find((m) => m.id === id) || null;
}
