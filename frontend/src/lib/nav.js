import { Zap, ReceiptText, Activity, GitCompareArrows, ChartColumn, Gauge, Sigma } from 'lucide-react';
import { DEFAULT_MODE } from './modes';
import { BRAND_NAVY } from './brand';
import { CONSO_SUB_MODULES } from './consoSubModules';
import { PUISSANCE_SUB_MODULES } from './puissanceSubModules';
import { COSPHI_SUB_MODULES } from './cosPhiSubModules';

/**
 * Single source of truth for the module registry. `modes` scopes a module to the
 * operational views that may reach it, so the sidebar and the router can never
 * disagree with the active mode.
 */
export const NAV = [
  {
    id: 'consommation',
    label: 'Dashboard',
    short: 'Board',
    icon: Zap,
    modes: ['live'],
    description: 'Live bill, cost forecast, savings and executive KPIs',
    accent: '#16a34a'
  },
  {
    id: 'billing',
    label: 'Billing & Cost',
    short: 'Facture',
    icon: ReceiptText,
    modes: ['live'],
    description: 'Digital STEG invoice, charges, taxes and 12-month evolutions',
    accent: BRAND_NAVY
  },
  {
    id: 'live',
    label: 'Live Monitoring',
    short: 'Live',
    icon: Activity,
    modes: ['live'],
    description: 'Streaming ESP32 : signaux bruts, trames MQTT et journal broker',
    accent: BRAND_NAVY
  },
  {
    id: 'shift-correlation',
    label: 'Correlation postes',
    short: 'Postes',
    icon: GitCompareArrows,
    modes: ['live'],
    description: 'Production vs énergie par poste : SEC, cible vs réalisé',
    accent: '#16A34A'
  },
  {
    id: 'analytics-consommation',
    label: 'Consommation',
    short: 'Conso',
    icon: ChartColumn,
    modes: ['analytics'],
    description: 'Consommation d’énergie par atelier, poste et période',
    accent: '#16A34A',
    // The sub-menu is declared as data, taken straight from the shared registry,
    // so the sidebar tree and the router always resolve the same ordered list.
    children: CONSO_SUB_MODULES
  },
  {
    id: 'analytics-puissance-souscrite',
    label: 'Puissance souscrite',
    short: 'Puissance',
    icon: Gauge,
    modes: ['analytics'],
    description: 'Pointe appelée comparée à Ps et prime de puissance',
    accent: '#0f172a',
    children: PUISSANCE_SUB_MODULES
  },
  {
    id: 'analytics-cos-phi',
    label: 'Cos Phi',
    short: 'Cos φ',
    icon: Sigma,
    modes: ['analytics'],
    description: 'Facteur de puissance, seuils et pénalités de réactif',
    accent: BRAND_NAVY,
    children: COSPHI_SUB_MODULES
  }
];

export function getNav(mode = DEFAULT_MODE) {
  return NAV.filter((n) => !n.modes || n.modes.includes(mode));
}

export function findNav(id, mode = DEFAULT_MODE) {
  const list = getNav(mode);
  for (const item of list) {
    if (item.id === id) return item;
    // Sub-menu items are first-class routes: the router must resolve them just
    // like a top-level module, otherwise a sidebar sub-link would fall back.
    const child = (item.children || []).find((c) => c.id === id);
    if (child) return child;
  }
  return null;
}

export function findParentNav(id, mode = DEFAULT_MODE) {
  return getNav(mode).find((item) => (item.children || []).some((c) => c.id === id)) || null;
}

export function getDefaultView(mode = DEFAULT_MODE) {
  const list = getNav(mode);
  return list.length ? list[0].id : null;
}
