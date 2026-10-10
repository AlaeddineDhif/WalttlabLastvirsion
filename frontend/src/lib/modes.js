import { RadioTower, ChartPie } from 'lucide-react';

/**
 * Two operational views of WattLab. `id` is persisted in localStorage and drives
 * which modules the sidebar and router expose.
 */
export const MODES = [
  {
    id: 'live',
    label: 'Live IoT Mode',
    short: 'Live',
    tagline: 'Temps réel · MQTT / ESP32',
    description: 'Télémétrie live du compteur edge, monitoring ESP32 et corrélation par poste.',
    icon: RadioTower,
    defaultView: 'consommation'
  },
  {
    id: 'analytics',
    label: 'Surveillance & analyse',
    short: 'Analytics',
    tagline: 'Analyse énergétique · STEG',
    description: 'Consommation, puissance souscrite et surveillance du facteur de puissance.',
    icon: ChartPie,
    defaultView: 'analytics-consommation'
  }
];

export const DEFAULT_MODE = 'live';
export const MODE_STORAGE_KEY = 'wattlab.mode';

export function findMode(id) {
  return MODES.find((m) => m.id === id) || null;
}
