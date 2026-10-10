/**
 * Distribution énergétique — SIMULATED dataset.
 *
 * These figures are fabricated on purpose: they stand in for a metering backend
 * that does not exist yet, so the module can be reviewed and defended with a
 * populated layout. They are deliberately deterministic (no randomness) and must
 * never be presented as measured values: every surface that renders them carries
 * an explicit "simulated" marker, consistent with the no-fabricated-telemetry rule
 * enforced across the live modules.
 *
 * Machines are the single source of truth. Workshop totals, shares and the KPI
 * strip are all derived from them, so the donut and the bar chart can never
 * disagree about the same total.
 */

export const SIMULATED = true;
export const SIMULATION_NOTE =
  'Jeu de données simulé — aucune mesure réelle n’est branchée sur ce module.';

export const PERIOD = { label: 'Mars 2026', days: 31, hours: 744 };

export const WORKSHOPS = [
  { id: 'decoupe', label: 'Atelier Découpe', short: 'Découpe', color: '#059669', rgb: '5,150,105' },
  { id: 'assemblage', label: 'Atelier Assemblage', short: 'Assemblage', color: '#0f172a', rgb: '15,23,42' },
  { id: 'injection', label: 'Atelier Injection', short: 'Injection', color: '#0d9488', rgb: '13,148,136' },
  { id: 'finition', label: 'Atelier Finition', short: 'Finition', color: '#d97706', rgb: '217,119,6' },
  { id: 'auxiliaires', label: 'Auxiliaires & ventilation', short: 'Auxiliaires', color: '#64748b', rgb: '100,116,139' }
];

export const MACHINES = [
  { id: 'presse-inj-400', label: 'Presse à injection 400 T', workshop: 'injection', kwh: 9850 },
  { id: 'decoupe-laser', label: 'Machine de découpe laser', workshop: 'decoupe', kwh: 8240 },
  { id: 'presse-hyd-250', label: 'Presse hydraulique 250 T', workshop: 'decoupe', kwh: 7180 },
  { id: 'ligne-a', label: 'Ligne d’assemblage A', workshop: 'assemblage', kwh: 6450 },
  { id: 'ligne-b', label: 'Ligne d’assemblage B', workshop: 'assemblage', kwh: 5980 },
  { id: 'presse-inj-160', label: 'Presse à injection 160 T', workshop: 'injection', kwh: 5640 },
  { id: 'robot-soudage', label: 'Robot de soudage', workshop: 'assemblage', kwh: 4760 },
  { id: 'compresseur', label: 'Compresseur 75 kW', workshop: 'auxiliaires', kwh: 4310 },
  { id: 'ventilation', label: 'Ventilation & extraction', workshop: 'auxiliaires', kwh: 3640 },
  { id: 'four-tremie', label: 'Four de traitement thermique', workshop: 'finition', kwh: 3250 },
  { id: 'groupe-electro', label: 'Groupe électrogène (secours)', workshop: 'auxiliaires', kwh: 1870 },
  { id: 'ligne-peinture', label: 'Ligne de peinture', workshop: 'finition', kwh: 2960 },
  { id: 'cisaille', label: 'Cisaille / massicot', workshop: 'decoupe', kwh: 2040 },
  { id: 'controle-qc', label: 'Poste de contrôle qualité', workshop: 'assemblage', kwh: 1890 },
  { id: 'broyeur', label: 'Broyeur / malaxeur', workshop: 'injection', kwh: 2480 },
  { id: 'cabine-finition', label: 'Cabine de finition', workshop: 'finition', kwh: 1420 },
  { id: 'eclairage', label: 'Éclairage & prises atelier', workshop: 'auxiliaires', kwh: 3240 }
];

export const TOTAL_KWH = MACHINES.reduce((sum, m) => sum + m.kwh, 0);

/** Workshop rollup, richest first, with each machine's share of the workshop. */
export const BY_WORKSHOP = WORKSHOPS.map((w) => {
  const items = MACHINES.filter((m) => m.workshop === w.id);
  const kwh = items.reduce((sum, m) => sum + m.kwh, 0);
  return {
    ...w,
    kwh,
    machineCount: items.length,
    share: TOTAL_KWH > 0 ? kwh / TOTAL_KWH : 0
  };
}).sort((a, b) => b.kwh - a.kwh);

export const RANKED_MACHINES = [...MACHINES].sort((a, b) => b.kwh - a.kwh);

/** The bar chart shows the ten heaviest posts; the rest are summarised in its subtitle. */
export const TOP_MACHINES = RANKED_MACHINES.slice(0, 10);
export const OTHER_MACHINES = RANKED_MACHINES.slice(10);
export const OTHER_MACHINES_KWH = OTHER_MACHINES.reduce((sum, m) => sum + m.kwh, 0);

const workshopOf = (id) => WORKSHOPS.find((w) => w.id === id) || null;

export const TOP_MACHINE = { ...RANKED_MACHINES[0], workshopLabel: workshopOf(RANKED_MACHINES[0].workshop)?.label };
export const TOP_WORKSHOP = BY_WORKSHOP[0];

export const KPIS = [
  {
    key: 'total',
    label: 'Énergie totale',
    value: TOTAL_KWH,
    unit: 'kWh',
    sub: `${PERIOD.label} · ${MACHINES.length} postes`,
    accent: '#0f172a'
  },
  {
    key: 'topWorkshop',
    label: 'Atelier le plus gourmand',
    value: TOP_WORKSHOP.kwh,
    unit: 'kWh',
    sub: `${TOP_WORKSHOP.label} · ${(TOP_WORKSHOP.share * 100).toFixed(1)} %`,
    accent: TOP_WORKSHOP.color
  },
  {
    key: 'topMachine',
    label: 'Poste le plus gourmand',
    value: TOP_MACHINE.kwh,
    unit: 'kWh',
    sub: TOP_MACHINE.label,
    accent: TOP_MACHINE.workshopLabel ? workshopOf(TOP_MACHINE.workshop).color : '#0f172a'
  },
  {
    key: 'perWorkshop',
    label: 'Moyenne par atelier',
    value: BY_WORKSHOP.length > 0 ? Math.round(TOTAL_KWH / BY_WORKSHOP.length) : 0,
    unit: 'kWh',
    sub: `${BY_WORKSHOP.length} ateliers · moyenne ${PERIOD.days} j`,
    accent: '#059669'
  }
];
