/**
 * Mutation harness: prove each new assertion actually fails when the behaviour it
 * guards is broken, and that the generator's safety nets hold when they are
 * genuinely under load.
 *
 * Run from the frontend root: node .smoke/negate.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DATA = 'src/lib/puissanceData.js';
const PAGE = 'src/pages/SurveillanceDepassement.jsx';
const ALERTES = 'src/pages/AlertesDepassement.jsx';
const CARDS = 'src/components/DepassementAlertList.jsx';
const ROUTES = 'src/pages/PuissanceSubViews.jsx';
const GROUP_PS = 'src/pages/AnalyticsPuissanceSouscrite.jsx';
const GROUP_CONSO = 'src/pages/AnalyticsConsommation.jsx';
const PLACEHOLDER = 'src/components/ModulePlaceholder.jsx';

// Used to move the generator into a regime where the clamp actually engages.
// The clamp is inert while ordinary demand stays well under Ps, so a mutation of
// it can only be observed once the days crowd the limit.
const CROWDED = { find: 'const BASE = 116;', replace: 'const BASE = 140;' };

const mutations = [
  {
    tag: 'a third overrun appears',
    file: DATA,
    find: "{ date: '2026-07-23', peak: 174.9, hour: 19, cause: 'Canicule — groupe froid et production en heures de pointe' }",
    replace:
      "{ date: '2026-07-23', peak: 174.9, hour: 19, cause: 'Canicule' },\n  { date: '2026-05-08', peak: 163.2, hour: 15, cause: 'Redemarrage ligne' }"
  },
  {
    tag: 'the clamp is stretched past the cap',
    file: DATA,
    base: CROWDED,
    find: 'const scale = Math.min(1, cap / highest);',
    replace: 'const scale = Math.min(1, (cap * 1.06) / highest);'
  },
  {
    tag: 'the designed events are rescaled along with the ordinary days',
    file: DATA,
    base: CROWDED,
    find: 'const peakKva = round1(r.cause ? r.raw : r.raw * scale);',
    replace: 'const peakKva = round1(r.raw * scale);'
  },
  {
    tag: 'crossings are not highlighted',
    file: DATA,
    find: 'highlightAbove: CONTRACT.ps',
    replace: 'highlightAbove: null'
  },
  {
    tag: 'the Ps reference line is dropped',
    file: DATA,
    find: 'reference: CONTRACT.ps,',
    replace: 'reference: null,'
  },
  {
    tag: 'the register is filed from the tolerance line',
    file: DATA,
    find: 'DEPASSEMENT_EVENTS = DAILY.filter((d) => d.peakKva > CONTRACT.ps)',
    replace: 'DEPASSEMENT_EVENTS = DAILY.filter((d) => d.peakKva > CONTRACT.ps - TOLERANCE_KVA)'
  },
  {
    tag: 'the whole overrun is billed instead of the taxable part',
    file: DATA,
    find: 'const taxableKva = round1(Math.max(0, d.peakKva - CONTRACT.ps - TOLERANCE_KVA));',
    replace: 'const taxableKva = round1(Math.max(0, d.peakKva - CONTRACT.ps));'
  },
  {
    tag: 'both events are given the same severity',
    file: DATA,
    find: "severity: taxableKva > 0 ? 'critical' : 'warning'",
    replace: "severity: 'critical'"
  },
  {
    tag: 'the maximum is read from somewhere other than the series',
    file: DATA,
    find: 'export const PEAK_DAY = DAILY.reduce((a, b) => (b.peakKva > a.peakKva ? b : a));',
    replace: 'export const PEAK_DAY = DAILY[3];'
  },
  {
    tag: 'a monthly peak is not the max of its days',
    file: DATA,
    find: 'peakKva: round1(Math.max(...rows.map((d) => d.peakKva))),',
    replace: 'peakKva: round1(rows.reduce((s, d) => s + d.peakKva, 0) / rows.length),'
  },
  {
    tag: 'the data is presented as measured',
    file: PAGE,
    find: 'Données simulées',
    replace: 'Données réelles'
  },
  {
    tag: 'the overruns lose their addressable id',
    file: CARDS,
    find: 'data-event-id={e.id}',
    replace: ''
  },
  {
    tag: 'the year is no longer a full year',
    file: DATA,
    find: "export const PERIOD = { label: 'Année 2026', year: 2026, days: 365,",
    replace: "export const PERIOD = { label: 'Année 2026', year: 2026, days: 300,"
  },
  {
    tag: 'the limit line is drawn in the series colour instead of red',
    file: DATA,
    find: "referenceColor: '#dc2626',",
    replace: "referenceColor: '#059669',"
  },

  // --- separation of concerns between the two Puissance souscrite sub-modules ---
  {
    tag: 'the two sub-modules are wired to the same view (register leaks into Surveillance)',
    file: ROUTES,
    find: 'export const PsDepassement = SurveillanceDepassement;',
    replace: 'export const PsDepassement = AlertesDepassement;'
  },
  {
    tag: 'Alertes is wired to the wrong view (register never reaches it)',
    file: ROUTES,
    find: 'export const PsAlertes = AlertesDepassement;',
    replace: 'export const PsAlertes = SurveillanceDepassement;'
  },
  {
    // Ps appears exactly once per card (the grid cell), so blanking it is a real
    // behavioural change rather than a no-op hidden by the card's footer line.
    tag: 'an alert card stops restating the contracted power it breached',
    file: CARDS,
    find: `                  Ps
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {fmtKva(e.psKva)}`,
    replace: `                  Ps
                </dt>
                <dd className="tabular font-mono text-[11px] font-semibold text-slate-800">
                  {''}`
  },
  {
    tag: 'the alert count is hard-coded instead of derived from the register',
    file: DATA,
    find: 'total: DEPASSEMENT_EVENTS.length,',
    replace: 'total: 3,'
  },
  {
    tag: 'the worst-alert aggregate picks the first event instead of the highest peak',
    file: DATA,
    find: 'worst: DEPASSEMENT_EVENTS.reduce(\n    (a, b) => (!a || b.peakKva > a.peakKva ? b : a),\n    null\n  )',
    replace: 'worst: DEPASSEMENT_EVENTS[0] || null'
  },
  {
    tag: 'the alerts lose their simulated-data disclaimer',
    file: ALERTES,
    find: '{SIMULATION_NOTE} Ces alertes',
    replace: "Ces alertes"
  },

  // --- the group route must open the first sub-section's real view ---
  {
    tag: 'the Puissance group route falls back to the empty state again',
    file: GROUP_PS,
    find: 'if (FirstSubView) return <FirstSubView />;',
    replace: 'if (false && FirstSubView) return <FirstSubView />;'
  },
  {
    tag: 'the Consommation group route falls back to the empty state again',
    file: GROUP_CONSO,
    find: 'if (FirstSubView) return <FirstSubView />;',
    replace: 'if (false && FirstSubView) return <FirstSubView />;'
  },
  {
    // Proves the reserved-chip assertion is not vacuous: it has to react to the
    // actual default status text, accents included.
    tag: 'the reserved status chip is reworded',
    file: PLACEHOLDER,
    find: "status = 'À venir'",
    replace: "status = 'Bientôt'"
  }
];

/**
 * These must SURVIVE. They are not bugs, they are the load the design is supposed
 * to absorb: crowding ordinary days towards Ps must not invent or destroy an
 * overrun, and the two designed events must keep their exact values.
 */
const resilience = [
  {
    tag: 'ordinary days crowd Ps (the clamp absorbs the extra demand)',
    file: DATA,
    base: CROWDED
  }
];

function smoke() {
  try {
    const out = execSync('npm run smoke', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

const originals = new Map();
for (const f of new Set([...mutations, ...resilience].map((m) => m.file))) {
  originals.set(f, readFileSync(f, 'utf8'));
}

let bad = 0;
try {
  for (const m of mutations) {
    const restore = originals.get(m.file);
    let current = restore;
    if (m.base) {
      if (!current.includes(m.base.find)) {
        console.log(`  ?? ${m.tag}: BASE PATCH DID NOT APPLY`);
        bad++;
        continue;
      }
      current = current.replace(m.base.find, m.base.replace);
    }
    if (!current.includes(m.find)) {
      console.log(`  ?? ${m.tag}: PATCH DID NOT APPLY`);
      bad++;
      continue;
    }
    writeFileSync(m.file, current.replace(m.find, m.replace));

    const { code, out } = smoke();
    const fails = out.split(/\r?\n/).filter((l) => l.includes('FAIL'));
    const caught = code !== 0 && fails.length > 0;
    if (!caught) bad++;
    console.log(`  ${caught ? 'caught ' : 'SURVIVED'} ${m.tag} (exit ${code}, ${fails.length} failing check(s))`);
    fails.slice(0, 2).forEach((l) => console.log(`        ${l.trim()}`));

    writeFileSync(m.file, restore);
  }

  for (const m of resilience) {
    const restore = originals.get(m.file);
    let current = restore;
    if (m.base) current = current.replace(m.base.find, m.base.replace);
    writeFileSync(m.file, current);

    const { code, out } = smoke();
    const fails = out.split(/\r?\n/).filter((l) => l.includes('FAIL'));
    const held = code === 0 && fails.length === 0;
    if (!held) bad++;
    console.log(`  ${held ? 'held   ' : 'BROKE  '} ${m.tag} (exit ${code}, ${fails.length} failing check(s))`);
    fails.slice(0, 3).forEach((l) => console.log(`        ${l.trim()}`));

    writeFileSync(m.file, restore);
  }
} finally {
  for (const [f, src] of originals) writeFileSync(f, src);
}

const total = mutations.length + resilience.length;
console.log(
  `\n  ${total - bad}/${total} expectations met` +
    (bad ? ` -- ${bad} need a stronger assertion or a real fix` : '')
);
process.exit(bad ? 1 : 0);
