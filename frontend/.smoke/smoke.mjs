/**
 * Post-login render smoke test.
 *
 * Ground truth for the White Screen of Death: `vite build` does not catch
 * undeclared identifiers (only missing imports/exports), and they throw a
 * ReferenceError during render, which unmounts the whole React tree. Here we
 * execute the real component functions through react-dom/server with a
 * pre-seeded session token, i.e. exactly the state right after "Sign In".
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ---- browser stubs (must exist before importing the bundle) ----------------
const store = (m = new Map()) => ({
  getItem: (k) => (m.has(k) ? m.get(k) : null),
  setItem: (k, v) => m.set(k, String(v)),
  removeItem: (k) => m.delete(k),
  clear: () => m.clear()
});

// The user just signed in successfully -> api.getToken() must return a token.
const session = store(new Map([['wattlab.ems.token', 'smoke-token']]));
const local = store();

globalThis.sessionStorage = session;
globalThis.localStorage = local;
globalThis.window = {
  location: { hash: '', href: 'http://localhost/', pathname: '/' },
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  getComputedStyle: () => ({ getPropertyValue: () => '' })
};
globalThis.location = globalThis.window.location;

// Chart.js needs a 2d context; a permissive no-op proxy satisfies it in SSR.
const ctx2d = new Proxy(
  {
    measureText: () => ({ width: 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    canvas: { width: 300, height: 150, style: {} },
    save() {}, restore() {}, beginPath() {}, closePath() {}, clearRect() {},
    fillRect() {}, strokeRect() {}, translate() {}, rotate() {}, scale() {},
    setLineDash() {}, getLineDash: () => [], rect() {}, moveTo() {}, lineTo() {},
    bezierCurveTo() {}, quadraticCurveTo() {}, arc() {}, arcTo() {}, ellipse() {},
    fill() {}, stroke() {}, clip() {}, isPointInPath: () => false,
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    createPattern: () => null,
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData() {}, drawImage() {}, setTransform() {}, resetTransform() {}
  },
  {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'canvas') return target.canvas;
      return () => undefined;
    },
    set() { return true; }
  }
);

class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.style = {}; }
  getContext() { return ctx2d; }
  toDataURL() { return 'data:image/png;base64,'; }
  getBoundingClientRect() { return { x: 0, y: 0, width: 300, height: 150, top: 0, left: 0, right: 300, bottom: 150 }; }
  setAttribute() {} getAttribute() { return null; } removeAttribute() {}
  addEventListener() {} removeEventListener() {}
}
globalThis.HTMLCanvasElement = FakeCanvas;
globalThis.Image = class { set src(_) {} get src() { return ''; } addEventListener() {} removeEventListener() {} };
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// ---- load the real app ------------------------------------------------------
const mod = await import('./out/entry.js');
const { TelemetryProvider, METRICS } = mod;

let failures = 0;
let checks = 0;

// The sidebar lists every sub-section label, so asserting on the whole document
// would pass even when the wrong view rendered. Scope to the <main> content area.
function contentOf(html) {
  const open = html.indexOf('<main');
  const close = html.indexOf('</main>');
  return open > -1 && close > open ? html.slice(open, close) : html;
}

function check(name, fn) {
  checks++;
  try {
    const detail = fn();
    const len = typeof detail === 'string' ? ` (${detail.length} chars)` : '';
    console.log(`  PASS  ${name}${len}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err && err.message ? err.message.split('\n')[0] : err}`);
    if (err && err.stack) {
      const frame = err.stack.split('\n').find((l) => l.includes('.smoke') || l.includes('src/'));
      if (frame) console.log(`        ${frame.trim()}`);
    }
  }
}

console.log('\n=== post-login render (state right after clicking Sign In) ===');
check('App renders while authenticated', () => renderToStaticMarkup(createElement(mod.App)));

console.log('\n=== the components in the post-login tree ===');
check('Header', () =>
  renderToStaticMarkup(
    createElement(mod.Header, {
      page: { label: 'Consommation', description: 'd', accent: '#0284c7', icon: () => null },
      broker: { state: 'connected', messageCount: 12, lastMessageAt: new Date() },
      demo: false,
      clock: new Date(),
      metrics: { power: 4200, cosPhi: 0.93 },
      feed: { status: 'live', isSimulated: false, ageSec: 1 },
      onToggleDemo() {}, onOpenSidebar() {},
      mode: 'live', onModeChange() {}
    })
  )
);
check('Sidebar', () =>
  renderToStaticMarkup(
    createElement(mod.Sidebar, {
      view: 'consommation', onNavigate() {}, onLogout() {},
      user: { username: 'admin', role: 'admin' },
      open: false, onClose() {}, collapsed: false, onToggleCollapse() {},
      demo: false, mode: 'live'
    })
  )
);
check('ModeSwitcher', () =>
  renderToStaticMarkup(createElement(mod.ModeSwitcher, { mode: 'live', onModeChange() {} }))
);
check('MetricCard', () =>
  renderToStaticMarkup(
    createElement(mod.MetricCard, {
      metric: METRICS[0], value: 231.4, time: new Date(),
      penalty: null, idle: false, frozen: false
    })
  )
);
check('MetricCard (frozen feed)', () =>
  renderToStaticMarkup(
    createElement(mod.MetricCard, {
      metric: METRICS[0], value: 231.4, time: new Date(),
      penalty: { value: 0.4 }, idle: false, frozen: true
    })
  )
);
check('FeedBanner (stale)', () =>
  renderToStaticMarkup(
    createElement(mod.FeedBanner, {
      feed: { status: 'stale', ageSec: 42, isSimulated: false },
      broker: { state: 'connected' }
    })
  )
);

console.log('\n=== every registered page, each mode hash ===');
const cases = [
  ['Consommation', mod.Consommation, 'consommation'],
  ['LiveMonitoring', mod.LiveMonitoring, 'live'],
  ['ShiftEnergyCorrelation', mod.ShiftEnergyCorrelation, 'shift-correlation'],
  ['AnalyticsConsommation', mod.AnalyticsConsommation, 'analytics-consommation'],
  ['AnalyticsPuissanceSouscrite', mod.AnalyticsPuissanceSouscrite, 'analytics-puissance-souscrite'],
  ['AnalyticsCosPhi', mod.AnalyticsCosPhi, 'analytics-cos-phi'],
  ['ConsoDistribution', mod.ConsoDistribution, 'conso-distribution'],
  ['ConsoProduction', mod.ConsoProduction, 'conso-production'],
  ['ConsoRatioCout', mod.ConsoRatioCout, 'conso-ratio-cout'],
  ['PsDepassement', mod.PsDepassement, 'ps-depassement'],
  ['PsAlertes', mod.PsAlertes, 'ps-alertes'],
  ['CpDepassement', mod.CpDepassement, 'cp-depassement'],
  ['CpAlertes', mod.CpAlertes, 'cp-alertes']
];
for (const [name, Comp, hash] of cases) {
  check(`${name} (#/${hash})`, () => {
    globalThis.window.location.hash = `#/${hash}`;
    return renderToStaticMarkup(createElement(TelemetryProvider, null, createElement(Comp)));
  });
}

console.log('\n=== analytics mode still renders (mode persisted) ===');
check('App with mode=analytics in localStorage', () => {
  local.setItem('wattlab.mode', 'analytics');
  globalThis.window.location.hash = '#/analytics-consommation';
  const html = renderToStaticMarkup(createElement(mod.App));
  local.setItem('wattlab.mode', 'live');
  globalThis.window.location.hash = '#/consommation';
  return html;
});

console.log('\n=== promoted modules: independent sidebar entries, own pages ===');
// The last element is what the group route is expected to resolve to: 'first' once
// its first sub-section is a real view, 'reserved' while it is still a stub.
const promoted = [
  ['AnalyticsConsommation', 'analytics-consommation', 'Consommation', 'first'],
  ['AnalyticsPuissanceSouscrite', 'analytics-puissance-souscrite', 'Puissance souscrite', 'first'],
  ['AnalyticsCosPhi', 'analytics-cos-phi', 'Cos Phi', 'first']
];
for (const [comp, id, label, expect] of promoted) {
  check(`${comp} (#/${id})`, () => {
    // A group route opens its first sub-section, so it must show that sub-section
    // itself. Rendering the reserved empty state under the sub-section's own title
    // is what this guards against.
    globalThis.window.location.hash = `#/${id}`;
    const html = renderToStaticMarkup(createElement(mod[comp]));
    if (expect === 'first') {
      if (html.includes('Module vide')) throw new Error('the group route still shows an empty state');
      if (html.includes('À venir')) throw new Error('the first sub-section is still marked reserved');
    } else {
      if (!html.includes('Module vide')) throw new Error('empty state missing');
      if (!html.includes('À venir')) throw new Error('reserved status chip missing');
      if (html.includes('<canvas')) throw new Error('a chart is still rendered');
    }
    return html;
  });
  check(`sidebar lists "${label}"`, () => {
    const html = renderToStaticMarkup(
      createElement(mod.Sidebar, {
        view: id, onNavigate() {}, onLogout() {},
        user: { displayName: 'Manager', role: 'admin' },
        open: false, onClose() {}, collapsed: false, onToggleCollapse() {},
        demo: false, mode: 'analytics'
      })
    );
    if (!html.includes(label)) throw new Error(`"${label}" missing from the analytics sidebar`);
    if (html.includes('Analytics</span>') || html.includes('>Analytics<')) {
      throw new Error('the old top-level "Analytics" entry is still in the sidebar');
    }
    if (html.includes('<canvas')) throw new Error('a chart is rendered in the sidebar');
    return html;
  });
}

console.log('\n=== Consommation sub-sections: the sidebar tree owns the navigation ===');
{
  // These sub-sections are analytics-mode routes, so pin the mode for the
  // end-to-end renders below and restore it afterwards.
  local.setItem('wattlab.mode', 'analytics');

  const EXPECTED = [
    ['conso-distribution', 'Distribution énergétique'],
    ['conso-production', 'Production &amp; Consommation'],
    ['conso-ratio-cout', 'Ratio coût']
  ];

  // The sub-menu is declared as data on the parent, in the required order. Scope
  // to this module: other modules declare their own sub-sections too.
  checks++;
  const declared = (mod.findNav('analytics-consommation', 'analytics')?.children || []).map((c) => c.id);
  if (JSON.stringify(declared) === JSON.stringify(EXPECTED.map(([id]) => id))) {
    console.log('  PASS  sub-sections are declared in the required order');
  } else {
    failures++;
    console.log(`  FAIL  declared sub-section order: ${declared.join(', ')}`);
  }

  // Each sub-section must resolve as a first-class route, not silently fall back
  // to the mode default.
  for (const [id] of EXPECTED) {
    checks++;
    if (mod.findNav(id, 'analytics')) {
      console.log(`  PASS  route "${id}" resolves in the nav registry`);
    } else {
      failures++;
      console.log(`  FAIL  route "${id}" does not resolve`);
    }
  }

  const sidebarAt = (view) =>
    renderToStaticMarkup(
      createElement(mod.Sidebar, {
        view,
        onNavigate() {},
        onLogout() {},
        user: { displayName: 'Manager', role: 'admin' },
        open: false,
        onClose() {},
        collapsed: false,
        onToggleCollapse() {},
        demo: false,
        mode: 'analytics'
      })
    );

  // Clicking the parent must reveal the sub-menu.
  const onParent = sidebarAt('analytics-consommation');
  checks++;
  if (onParent.includes('Sous-sections Consommation')) {
    console.log('  PASS  selecting "Consommation" reveals its sub-menu');
  } else {
    failures++;
    console.log('  FAIL  sub-menu not revealed on the parent view');
  }

  // ...and the group must stay open while one of its sub-sections is selected.
  const onChild = sidebarAt('conso-production');
  checks++;
  if (onChild.includes('Sous-sections Consommation')) {
    console.log('  PASS  group stays open on a sub-section route');
  } else {
    failures++;
    console.log('  FAIL  group collapsed on a sub-section route');
  }

  // The sub-menu must be a nested sub-tree, not a sibling of the parent. Anchor
  // on the <ul> element itself, since the landmark text sits inside the attribute.
  const menuTextAt = onChild.indexOf('Sous-sections Consommation');
  const menuUlAt = onChild.lastIndexOf('<ul', menuTextAt);
  const parentLabelAt = onChild.lastIndexOf('Consommation', menuUlAt);
  const between = onChild.slice(parentLabelAt, menuUlAt);
  checks++;
  if (parentLabelAt > -1 && !between.includes('</li>')) {
    console.log('  PASS  sub-menu is nested inside the parent item');
  } else {
    failures++;
    console.log('  FAIL  sub-menu rendered as a sibling, not nested');
  }

  // All three sub-sections listed, in order.
  const menu = onChild.slice(menuTextAt);
  const positions = EXPECTED.map(([, l]) => menu.indexOf(l));
  checks++;
  if (positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]))) {
    console.log('  PASS  sub-menu lists all 3 sub-sections in the required order');
  } else {
    failures++;
    console.log(`  FAIL  sub-menu order wrong: ${positions.join(', ')}`);
  }

  // The selected sub-section itself must be the current item, not its parent.
  // Compare the title of the button that actually carries aria-current.
  const currentBtn = onChild.match(/<button[^>]*aria-current="page"[^>]*>[\s\S]*?<\/button>/);
  checks++;
  if (currentBtn && currentBtn[0].includes('title="Production &amp; Consommation"')) {
    console.log('  PASS  the selected sub-section itself is marked current');
  } else {
    failures++;
    console.log('  FAIL  the current item is not the selected sub-section');
  }

  // Every sub-section now renders its own populated dashboard end to end through
  // App, and no tab strip survives anywhere in the content area. Assertions are
  // made against <main> only: the sidebar also lists every sub-section label, so
  // checking the whole document would pass even on the wrong view. Each
  // dashboard's contents are asserted in the blocks below.
  for (const [id, label] of EXPECTED) {
    globalThis.window.location.hash = `#/${id}`;
    const content = contentOf(renderToStaticMarkup(createElement(mod.App)));
    checks++;
    if (content.includes(label) && !content.includes('Module vide') && content.includes('<canvas')) {
      console.log(`  PASS  "${id}" renders its own populated view in <main>`);
    } else {
      failures++;
      console.log(
        `  FAIL  "${id}" is not a populated view (label: ${content.includes(label)}, ` +
          `placeholder: ${content.includes('Module vide')}, canvas: ${content.includes('<canvas')})`
      );
    }

    checks++;
    if (!content.includes('Sous-modules') && !content.includes('sous-modules')) {
      console.log(`  PASS  no sub-module tab strip left in the content area`);
    } else {
      failures++;
      console.log(`  FAIL  tab strip still rendered for "${id}"`);
    }
  }
  globalThis.window.location.hash = '#/analytics-consommation';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Distribution énergétique: populated dashboard (simulated data) ===');
{
  const data = mod.distributionData;

  // The aggregates must be internally consistent, so the donut and the bar chart
  // can never state different totals for the same month.
  checks++;
  const sumWorkshops = data.BY_WORKSHOP.reduce((s, w) => s + w.kwh, 0);
  if (sumWorkshops === data.TOTAL_KWH) {
    console.log(`  PASS  workshop totals sum to the month total (${data.TOTAL_KWH} kWh)`);
  } else {
    failures++;
    console.log(`  FAIL  workshops sum to ${sumWorkshops}, total is ${data.TOTAL_KWH}`);
  }

  checks++;
  const sumShares = data.BY_WORKSHOP.reduce((s, w) => s + w.share, 0);
  if (Math.abs(sumShares - 1) < 1e-9) {
    console.log('  PASS  workshop shares sum to exactly 100 %');
  } else {
    failures++;
    console.log(`  FAIL  shares sum to ${sumShares}`);
  }

  checks++;
  const top10 = data.TOP_MACHINES.reduce((s, m) => s + m.kwh, 0);
  if (top10 + data.OTHER_MACHINES_KWH === data.TOTAL_KWH) {
    console.log('  PASS  top-10 posts plus the remainder cover the whole total');
  } else {
    failures++;
    console.log(`  FAIL  top-10 (${top10}) + remainder (${data.OTHER_MACHINES_KWH}) != total`);
  }

  checks++;
  const orphan = data.MACHINES.filter((m) => !data.WORKSHOPS.some((w) => w.id === m.workshop));
  if (orphan.length === 0) {
    console.log(`  PASS  all ${data.MACHINES.length} posts map to a declared workshop`);
  } else {
    failures++;
    console.log(`  FAIL  orphan posts: ${orphan.map((m) => m.id).join(', ')}`);
  }

  checks++;
  const sortedOk = data.BY_WORKSHOP.every((w, i, a) => i === 0 || a[i - 1].kwh >= w.kwh);
  if (sortedOk) {
    console.log('  PASS  workshops are ranked heaviest first');
  } else {
    failures++;
    console.log('  FAIL  workshops are not sorted by consumption');
  }

  // Rendering: the module must no longer be a placeholder, and must carry both
  // charts plus the KPI strip.
  local.setItem('wattlab.mode', 'analytics');
  globalThis.window.location.hash = '#/conso-distribution';
  const content = contentOf(renderToStaticMarkup(createElement(mod.App)));

  checks++;
  if (!content.includes('Module vide')) {
    console.log('  PASS  the reserved empty state is gone');
  } else {
    failures++;
    console.log('  FAIL  module still renders the "Module vide" placeholder');
  }

  const canvases = (content.match(/<canvas/g) || []).length;
  checks++;
  if (canvases === 2) {
    console.log('  PASS  both charts render (2 canvases)');
  } else {
    failures++;
    console.log(`  FAIL  expected 2 canvases, found ${canvases}`);
  }

  checks++;
  if (content.includes('Répartition par Atelier') && content.includes('Consommation par poste / machine')) {
    console.log('  PASS  donut and bar chart cards are both titled as specified');
  } else {
    failures++;
    console.log('  FAIL  chart card titles missing');
  }

  // KPI strip: total, top workshop, and the total itself must be on screen.
  checks++;
  const kpiLabels = ['Énergie totale', 'Atelier le plus gourmand', 'Poste le plus gourmand', 'Moyenne par atelier'];
  const missingKpis = kpiLabels.filter((l) => !content.includes(l));
  if (missingKpis.length === 0) {
    console.log('  PASS  KPI strip shows all 4 indicators');
  } else {
    failures++;
    console.log(`  FAIL  missing KPIs: ${missingKpis.join(', ')}`);
  }

  checks++;
  if (content.includes('75,200')) {
    console.log('  PASS  the month total is rendered in the centre of the donut');
  } else {
    failures++;
    console.log('  FAIL  month total not found in the content');
  }

  // Every workshop and every plotted post must reach the DOM. Labels are compared
  // HTML-escaped, since "&" is serialised as "&amp;".
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  checks++;
  const missingWorkshops = data.BY_WORKSHOP.filter((w) => !content.includes(esc(w.label)));
  if (missingWorkshops.length === 0) {
    console.log('  PASS  all 5 workshops are named in the legend');
  } else {
    failures++;
    console.log(`  FAIL  missing workshops: ${missingWorkshops.map((w) => w.label).join(', ')}`);
  }

  checks++;
  const missingPosts = data.TOP_MACHINES.filter((m) => !content.includes(esc(m.label)));
  if (missingPosts.length === 0) {
    console.log('  PASS  all 10 plotted posts are named with a textual fallback');
  } else {
    failures++;
    console.log(`  FAIL  missing posts: ${missingPosts.map((m) => m.label).join(', ')}`);
  }

  // Honesty: fabricated figures must be labelled as such, in the header and in a
  // visible note. This is the invariant the rest of the app enforces.
  checks++;
  if (content.includes('Données simulées') && content.includes('simulé')) {
    console.log('  PASS  the data is explicitly marked as simulated');
  } else {
    failures++;
    console.log('  FAIL  simulated data is not labelled');
  }

  // Assert against the exported note, so rewording the copy cannot silently
  // orphan this guard.
  checks++;
  if (content.includes(esc(data.SIMULATION_NOTE))) {
    console.log('  PASS  a visible note states that no real measurement is connected');
  } else {
    failures++;
    console.log('  FAIL  the "no real measurement" note is missing');
  }

  globalThis.window.location.hash = '#/analytics-consommation';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Production & Consommation: dual-axis combo + SEC (simulated) ===');
{
  const p = mod.productionData;
  const dist = mod.distributionData;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmtSec = (v) => v.toFixed(3);

  // The SEC indicator must be derived from the data, not hard-coded: recompute it
  // from the totals and compare.
  checks++;
  const recomputed = p.TOTAL_ENERGY / p.TOTAL_PRODUCTION;
  if (Math.abs(recomputed - p.SEC_GLOBAL) < 1e-12) {
    console.log(`  PASS  SEC is derived from the totals (${fmtSec(p.SEC_GLOBAL)} kWh/pc)`);
  } else {
    failures++;
    console.log(`  FAIL  SEC ${p.SEC_GLOBAL} != ${recomputed} recomputed from totals`);
  }

  checks++;
  const sumE = p.SERIES.reduce((s, d) => s + d.energy, 0);
  const sumP = p.SERIES.reduce((s, d) => s + d.production, 0);
  if (sumE === p.TOTAL_ENERGY && sumP === p.TOTAL_PRODUCTION) {
    console.log('  PASS  daily columns sum exactly to the stated totals');
  } else {
    failures++;
    console.log(`  FAIL  columns sum to ${sumP}/${sumE}, totals are ${p.TOTAL_PRODUCTION}/${p.TOTAL_ENERGY}`);
  }

  // Both modules describe the same month, so they must not disagree on the total.
  checks++;
  if (p.TOTAL_ENERGY === dist.TOTAL_KWH) {
    console.log(`  PASS  energy total reconciles with Distribution énergétique (${p.TOTAL_ENERGY} kWh)`);
  } else {
    failures++;
    console.log(`  FAIL  energy ${p.TOTAL_ENERGY} != distribution ${dist.TOTAL_KWH}`);
  }

  // A base load is what makes SEC drift; a flat ratio would mean the model is
  // just production scaled by a constant.
  checks++;
  const spread = p.WORST_SEC.sec - p.BEST_SEC.sec;
  if (spread > 0.02) {
    console.log(`  PASS  SEC varies across the month (spread ${fmtSec(spread)} kWh/pc)`);
  } else {
    failures++;
    console.log(`  FAIL  SEC is effectively constant (spread ${fmtSec(spread)})`);
  }

  checks++;
  if (p.SERIES.length === p.PERIOD.days) {
    console.log(`  PASS  one row per day of the period (${p.SERIES.length})`);
  } else {
    failures++;
    console.log(`  FAIL  ${p.SERIES.length} rows for ${p.PERIOD.days} days`);
  }

  // Rendering.
  local.setItem('wattlab.mode', 'analytics');
  globalThis.window.location.hash = '#/conso-production';
  const content = contentOf(renderToStaticMarkup(createElement(mod.App)));

  checks++;
  if (!content.includes('Module vide')) {
    console.log('  PASS  the reserved empty state is gone');
  } else {
    failures++;
    console.log('  FAIL  module still renders the "Module vide" placeholder');
  }

  const canvases = (content.match(/<canvas/g) || []).length;
  checks++;
  if (canvases === 1) {
    console.log('  PASS  the dual-axis chart renders (1 canvas)');
  } else {
    failures++;
    console.log(`  FAIL  expected 1 canvas, found ${canvases}`);
  }

  // Both axes must be present and labelled: this is the whole point of the view.
  checks++;
  if (content.includes('Production vs énergie consommée') && content.includes('pcs') && content.includes('kWh')) {
    console.log('  PASS  chart is titled and both units (pcs, kWh) are declared');
  } else {
    failures++;
    console.log('  FAIL  chart title or units missing');
  }

  // The SEC must be on screen in the KPI strip, formatted to 3 decimals.
  checks++;
  if (content.includes('SEC global') && content.includes('kWh/pc')) {
    console.log('  PASS  SEC indicator is present in the KPI strip with its unit');
  } else {
    failures++;
    console.log('  FAIL  SEC indicator missing from the KPI strip');
  }

  checks++;
  const secText = p.SEC_GLOBAL.toFixed(3);
  if (content.includes(secText)) {
    console.log(`  PASS  SEC value ${secText} is rendered`);
  } else {
    failures++;
    console.log(`  FAIL  SEC value ${secText} not found in the content`);
  }

  const kpiLabels = ['SEC global', 'Production totale', 'Énergie totale', 'SEC le plus élevé'];
  checks++;
  const missingKpis = kpiLabels.filter((l) => !content.includes(l));
  if (missingKpis.length === 0) {
    console.log('  PASS  KPI strip shows all 4 indicators');
  } else {
    failures++;
    console.log(`  FAIL  missing KPIs: ${missingKpis.join(', ')}`);
  }

  // Daily values only exist as canvas pixels without the fallback table.
  checks++;
  const missingDays = p.SERIES.filter((d) => !content.includes(esc(d.label)));
  if (missingDays.length === 0) {
    console.log(`  PASS  all ${p.SERIES.length} days are present with a textual fallback`);
  } else {
    failures++;
    console.log(`  FAIL  missing days: ${missingDays.slice(0, 3).map((d) => d.label).join(', ')}`);
  }

  // Honesty, same invariant as the sibling module.
  checks++;
  if (content.includes('Données simulées') && content.includes(esc(p.SIMULATION_NOTE))) {
    console.log('  PASS  the data is explicitly marked as simulated');
  } else {
    failures++;
    console.log('  FAIL  simulated data is not labelled');
  }

  globalThis.window.location.hash = '#/analytics-consommation';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Ratio coût: cost per unit on a single axis (simulated) ===');
{
  const c = mod.costData;
  const p = mod.productionData;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // The money layer is derived, so it must not disagree with its two siblings
  // about how much was produced or consumed.
  checks++;
  if (c.TOTAL_PRODUCTION === p.TOTAL_PRODUCTION && c.TOTAL_ENERGY === p.TOTAL_ENERGY) {
    console.log('  PASS  volumes come from Production & Consommation, unchanged');
  } else {
    failures++;
    console.log(
      `  FAIL  cost view has its own volumes: ${c.TOTAL_PRODUCTION}/${c.TOTAL_ENERGY} ` +
        `vs ${p.TOTAL_PRODUCTION}/${p.TOTAL_ENERGY}`
    );
  }

  // Total cost is the declared STEG rate applied to the energy: recomputed here so
  // a hard-coded figure cannot survive.
  checks++;
  const recomputedCost = c.TOTAL_ENERGY * c.TARIFF.energyRate;
  if (Math.abs(recomputedCost - c.TOTAL_COST) < 1e-9) {
    console.log(`  PASS  total cost = energy x declared rate (${c.TARIFF.energyRate} TND/kWh)`);
  } else {
    failures++;
    console.log(`  FAIL  cost ${c.TOTAL_COST} != ${recomputedCost} recomputed from the rate`);
  }

  // The headline indicator is cost over production, not an average of the daily
  // ratios.
  checks++;
  const recomputedUnit = c.TOTAL_COST / c.TOTAL_PRODUCTION;
  if (Math.abs(recomputedUnit - c.UNIT_COST) < 1e-12) {
    console.log(`  PASS  unit cost = total cost / production (${c.UNIT_COST.toFixed(3)} TND/pc)`);
  } else {
    failures++;
    console.log(`  FAIL  unit cost ${c.UNIT_COST} != ${recomputedUnit}`);
  }

  // Day columns must add up to the month, and each daily ratio must be its own
  // cost over its own production.
  checks++;
  const sumCost = c.DAILY.reduce((s, d) => s + d.cost, 0);
  const sumProd = c.DAILY.reduce((s, d) => s + d.production, 0);
  if (sumCost === c.TOTAL_COST && sumProd === c.TOTAL_PRODUCTION) {
    console.log(`  PASS  the ${c.DAILY.length} day columns sum to the month totals`);
  } else {
    failures++;
    console.log(`  FAIL  day columns sum to ${sumProd}/${sumCost}, stated ${c.TOTAL_PRODUCTION}/${c.TOTAL_COST}`);
  }

  checks++;
  const badDay = c.DAILY.find((d) => Math.abs(d.unitCost - d.cost / d.production) > 1e-12);
  if (!badDay) {
    console.log('  PASS  every day divides its own cost by its own production');
  } else {
    failures++;
    console.log(`  FAIL  day ${badDay.label} unit cost is not cost / production`);
  }

  // Aggregates must be ratios of sums. If week 1 equalled the mean of its seven
  // daily ratios, a mean-of-ratios had slipped in and the light days would be
  // over-weighted.
  const week = c.granularity('semaine');
  const meanOfDaily = c.DAILY.slice(0, 7).reduce((s, d) => s + d.unitCost, 0) / 7;
  const ratioOfSums = week.points[0].cost / week.points[0].production;
  checks++;
  if (
    Math.abs(ratioOfSums - week.points[0].unitCost) < 1e-12 &&
    Math.abs(ratioOfSums - meanOfDaily) > 1e-6
  ) {
    console.log(`  PASS  week 1 is a ratio of sums, not a mean of daily ratios`);
  } else {
    failures++;
    console.log(
      `  FAIL  week 1 = ${week.points[0].unitCost}, ratio of sums = ${ratioOfSums}, ` +
        `mean of ratios = ${meanOfDaily}`
    );
  }

  // The three granularities the view offers: day, week, month.
  checks++;
  const lengths = c.GRANULARITIES.map((g) => `${g.key}:${g.points.length}`).join(' ');
  if (
    c.granularity('jour').points.length === c.DAILY.length &&
    c.granularity('semaine').points.length === Math.ceil(c.DAILY.length / 7) &&
    c.granularity('mois').points.length === 1
  ) {
    console.log(`  PASS  granularities jour / semaine / mois are populated (${lengths})`);
  } else {
    failures++;
    console.log(`  FAIL  granularity sizes wrong: ${lengths}`);
  }

  // The weeks must partition the month: no day counted twice, none dropped.
  checks++;
  const weekProd = week.points.reduce((s, w) => s + w.production, 0);
  const weekCost = week.points.reduce((s, w) => s + w.cost, 0);
  if (weekProd === c.TOTAL_PRODUCTION && weekCost === c.TOTAL_COST) {
    console.log('  PASS  the weeks partition the month exactly');
  } else {
    failures++;
    console.log(`  FAIL  weeks cover ${weekProd}/${weekCost}, month is ${c.TOTAL_PRODUCTION}/${c.TOTAL_COST}`);
  }

  // The month point must be the KPI headline, not a fourth figure.
  const month = c.granularity('mois').points[0];
  checks++;
  if (Math.abs(month.unitCost - c.UNIT_COST) < 1e-12 && month.cost === c.TOTAL_COST) {
    console.log('  PASS  the month point matches the KPI strip figures');
  } else {
    failures++;
    console.log(`  FAIL  month point ${month.cost}/${month.unitCost} vs KPI ${c.TOTAL_COST}/${c.UNIT_COST}`);
  }

  // A flat series would make the chart a straight line: the base load has to show.
  checks++;
  if (c.SPREAD > 0.05) {
    console.log(`  PASS  cost per unit varies over the month (spread ${(c.SPREAD * 100).toFixed(0)}%)`);
  } else {
    failures++;
    console.log(`  FAIL  cost per unit is effectively flat (spread ${c.SPREAD})`);
  }

  // Rendering.
  local.setItem('wattlab.mode', 'analytics');
  globalThis.window.location.hash = '#/conso-ratio-cout';
  const content = contentOf(renderToStaticMarkup(createElement(mod.App)));

  checks++;
  if (!content.includes('Module vide')) {
    console.log('  PASS  the reserved empty state is gone');
  } else {
    failures++;
    console.log('  FAIL  module still renders the "Module vide" placeholder');
  }

  const canvases = (content.match(/<canvas/g) || []).length;
  checks++;
  if (canvases === 1) {
    console.log('  PASS  the single-axis cost chart renders (1 canvas)');
  } else {
    failures++;
    console.log(`  FAIL  expected 1 canvas, found ${canvases}`);
  }

  // One measure, one axis: the title and the unit have to name the TND/pc ratio.
  checks++;
  if (
    content.includes('Coût énergétique par unité produite') &&
    content.includes('TND/pc') &&
    content.includes('TND')
  ) {
    console.log('  PASS  chart is titled and declares its currency unit (TND/pc)');
  } else {
    failures++;
    console.log('  FAIL  chart title or TND unit missing');
  }

  const kpiLabels = ['Production totale', 'Coût énergétique total', 'Coût énergétique par unité'];
  checks++;
  const missingKpis = kpiLabels.filter((l) => !content.includes(l));
  if (missingKpis.length === 0) {
    console.log('  PASS  KPI strip shows the 3 requested indicators');
  } else {
    failures++;
    console.log(`  FAIL  missing KPIs: ${missingKpis.join(', ')}`);
  }

  // Both money figures must reach the screen, and the tariff must be visible so a
  // reader can reproduce the cost by hand. The expected strings are grouped the way
  // the app groups them (fmt uses en-US), so a stripped separator is not mistaken
  // for a missing figure.
  checks++;
  const money = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const amounts = [money(c.TOTAL_COST, 2), money(c.UNIT_COST, 3)];
  const missingMoney = amounts.filter((v) => !content.includes(v));
  if (missingMoney.length === 0) {
    console.log(`  PASS  cost ${amounts[0]} TND and unit cost ${amounts[1]} TND/pc are rendered`);
  } else {
    failures++;
    console.log(`  FAIL  not rendered: ${missingMoney.join(', ')}`);
  }

  checks++;
  if (content.includes('Tarif STEG 0.250 TND/kWh')) {
    console.log('  PASS  the applied STEG rate is shown with the chart');
  } else {
    failures++;
    console.log('  FAIL  the STEG rate applied is not stated on the view');
  }

  // The x axis is switchable: all three periods offered, one pressed by default.
  checks++;
  const levels = ['Jour', 'Semaine', 'Mois'];
  const missingLevels = levels.filter((l) => !content.includes(`>${l}</button>`));
  const pressedAt = content.indexOf('aria-pressed="true"');
  const pressedLabel = pressedAt > -1 ? content.slice(pressedAt, content.indexOf('</button>', pressedAt)) : '';
  if (missingLevels.length === 0 && pressedLabel.includes('>Jour')) {
    console.log('  PASS  jour / semaine / mois are offered, day view open by default');
  } else {
    failures++;
    console.log(
      `  FAIL  period selector wrong (missing: ${missingLevels.join(', ') || 'none'}, ` +
        `pressed: ${pressedLabel.slice(-20) || 'nothing'})`
    );
  }

  // Daily values only exist as canvas pixels without the fallback table.
  checks++;
  const missingDays = c.DAILY.filter((d) => !content.includes(esc(d.label)));
  if (missingDays.length === 0) {
    console.log(`  PASS  all ${c.DAILY.length} days are present with a textual fallback`);
  } else {
    failures++;
    console.log(`  FAIL  missing days: ${missingDays.slice(0, 3).map((d) => d.label).join(', ')}`);
  }

  // Honesty, same invariant as its siblings.
  checks++;
  if (content.includes('Données simulées') && content.includes(esc(c.SIMULATION_NOTE))) {
    console.log('  PASS  the data is explicitly marked as simulated');
  } else {
    failures++;
    console.log('  FAIL  simulated data is not labelled');
  }

  globalThis.window.location.hash = '#/analytics-consommation';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Puissance souscrite sub-sections: same sidebar-tree structure ===');
{
  local.setItem('wattlab.mode', 'analytics');

  const EXPECTED = [
    ['ps-depassement', 'Surveillance du dépassement'],
    ['ps-alertes', 'Alertes']
  ];

  const sidebarAt = (view) =>
    renderToStaticMarkup(
      createElement(mod.Sidebar, {
        view,
        onNavigate() {},
        onLogout() {},
        user: { displayName: 'Manager', role: 'admin' },
        open: false,
        onClose() {},
        collapsed: false,
        onToggleCollapse() {},
        demo: false,
        mode: 'analytics'
      })
    );

  // Declared as data on the parent, in the required order.
  checks++;
  const ps = mod.findNav('analytics-puissance-souscrite', 'analytics');
  const declared = (ps?.children || []).map((c) => c.id);
  if (JSON.stringify(declared) === JSON.stringify(EXPECTED.map(([id]) => id))) {
    console.log('  PASS  sub-sections are declared in the required order');
  } else {
    failures++;
    console.log(`  FAIL  declared sub-section order: ${declared.join(', ')}`);
  }

  for (const [id] of EXPECTED) {
    checks++;
    if (mod.findNav(id, 'analytics')) {
      console.log(`  PASS  route "${id}" resolves in the nav registry`);
    } else {
      failures++;
      console.log(`  FAIL  route "${id}" does not resolve`);
    }
  }

  // Selecting the parent must reveal its sub-menu, labelled for this module.
  const onParent = sidebarAt('analytics-puissance-souscrite');
  checks++;
  if (onParent.includes('Sous-sections Puissance souscrite')) {
    console.log('  PASS  selecting "Puissance souscrite" reveals its sub-menu');
  } else {
    failures++;
    console.log('  FAIL  sub-menu not revealed on the parent view');
  }

  // The group must stay open on a sub-section route.
  const onChild = sidebarAt('ps-alertes');
  checks++;
  if (onChild.includes('Sous-sections Puissance souscrite')) {
    console.log('  PASS  group stays open on a sub-section route');
  } else {
    failures++;
    console.log('  FAIL  group collapsed on a sub-section route');
  }

  // Nested sub-tree, not a sibling of the parent.
  const menuTextAt = onChild.indexOf('Sous-sections Puissance souscrite');
  const menuUlAt = onChild.lastIndexOf('<ul', menuTextAt);
  const parentLabelAt = onChild.lastIndexOf('Puissance souscrite', menuUlAt);
  const between = onChild.slice(parentLabelAt, menuUlAt);
  checks++;
  if (parentLabelAt > -1 && !between.includes('</li>')) {
    console.log('  PASS  sub-menu is nested inside the parent item');
  } else {
    failures++;
    console.log('  FAIL  sub-menu rendered as a sibling, not nested');
  }

  // Both sub-sections listed, in order.
  const menu = onChild.slice(menuTextAt);
  const positions = EXPECTED.map(([, l]) => menu.indexOf(l));
  checks++;
  if (positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]))) {
    console.log('  PASS  sub-menu lists both sub-sections in the required order');
  } else {
    failures++;
    console.log(`  FAIL  sub-menu order wrong: ${positions.join(', ')}`);
  }

  // Exactly 2 sub-sections, not 3 or 1. Count only inside this group's own
  // <ul>, since the rest of the sidebar holds further top-level items.
  const menuUlEnd = onChild.indexOf('</ul>', menuTextAt);
  const subCount = (onChild.slice(menuUlAt, menuUlEnd).match(/<li>/g) || []).length;
  checks++;
  if (subCount === 2) {
    console.log('  PASS  sub-menu contains exactly 2 items');
  } else {
    failures++;
    console.log(`  FAIL  sub-menu contains ${subCount} items, expected 2`);
  }

  // The selected sub-section itself must be the current item, not its parent.
  const currentBtn = onChild.match(/<button[^>]*aria-current="page"[^>]*>[\s\S]*?<\/button>/);
  checks++;
  if (currentBtn && currentBtn[0].includes('title="Alertes"')) {
    console.log('  PASS  the selected sub-section itself is marked current');
  } else {
    failures++;
    console.log('  FAIL  the current item is not the selected sub-section');
  }

  // Only the active group may be expanded: selecting Puissance souscrite must not
  // leave the Consommation sub-menu open.
  checks++;
  if (!onChild.includes('Sous-sections Consommation')) {
    console.log('  PASS  the inactive Consommation group stays collapsed');
  } else {
    failures++;
    console.log('  FAIL  an unrelated group is expanded at the same time');
  }

    // Both sub-sections of this group are populated: each is its own real view, and
    // neither may fall back to the shared empty state.
    for (const [id, label] of EXPECTED) {
      globalThis.window.location.hash = `#/${id}`;
      const content = contentOf(renderToStaticMarkup(createElement(mod.App)));
      checks++;
      if (content.includes(label) && !content.includes('Module vide')) {
        console.log(`  PASS  "${id}" renders a populated view of its own in <main>`);
      } else {
        failures++;
        console.log(`  FAIL  "${id}" is still an empty placeholder (has label: ${content.includes(label)})`);
      }
    }

    // Clicking the group itself must land on the first sub-section's real view, not
    // on an empty state wearing its title.
    globalThis.window.location.hash = '#/analytics-puissance-souscrite';
    const parentContent = contentOf(renderToStaticMarkup(createElement(mod.App)));
    checks++;
    if (parentContent.includes('<canvas') && !parentContent.includes('Module vide')) {
      console.log('  PASS  the group route opens the first sub-section, populated');
    } else {
      failures++;
      console.log(
        `  FAIL  the group route shows an empty state (canvas: ${parentContent.includes('<canvas')})`
      );
    }

    globalThis.window.location.hash = '#/analytics-puissance-souscrite';
    local.setItem('wattlab.mode', 'live');
  }

console.log('\n=== Surveillance du dépassement: full-year peaks against Ps (simulated) ===');
{
  const d = mod.puissanceData;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // A full year, one peak per day.
  checks++;
  if (d.DAILY.length === 365 && d.MONTHLY.length === 12) {
    console.log(`  PASS  a full year of daily peaks (${d.DAILY.length} days, ${d.MONTHLY.length} months)`);
  } else {
    failures++;
    console.log(`  FAIL  ${d.DAILY.length} days / ${d.MONTHLY.length} months, expected 365 / 12`);
  }

  // The contract must be the app's own STEG default, not a number picked to make
  // the story work.
  checks++;
  if (d.CONTRACT.ps === 150 && d.CONTRACT.tolerance === 0.1 && d.TOLERANCE_KVA === 15) {
    console.log(`  PASS  Ps ${d.CONTRACT.ps} kVA with a ${d.TOLERANCE_KVA} kVA free tolerance`);
  } else {
    failures++;
    console.log(`  FAIL  contract drifted: Ps ${d.CONTRACT.ps}, tolerance ${d.TOLERANCE_KVA} kVA`);
  }

  // THE requirement: exactly two points of the curve above Ps.
  const over = d.DAILY.filter((x) => x.peakKva > d.CONTRACT.ps);
  checks++;
  if (over.length === 2) {
    console.log(`  PASS  exactly 2 peaks exceed Ps (${over.map((x) => x.date).join(', ')})`);
  } else {
    failures++;
    console.log(`  FAIL  ${over.length} peaks above Ps, expected exactly 2`);
  }

  // No other day may come within a hair of the limit, or a third overrun would be
  // a rounding accident waiting to happen.
  checks++;
  const closestSafe = d.DAILY.filter((x) => x.peakKva <= d.CONTRACT.ps).reduce((a, b) =>
    b.peakKva > a.peakKva ? b : a
  );
  const margin = Math.round((d.CONTRACT.ps - closestSafe.peakKva) * 10) / 10;
  // The structural guarantee is that no ordinary day reaches the 3 % headroom
  // band, not that it happens to clear some arbitrary number of kVA today.
  const cap = d.CONTRACT.ps * 0.97;
  if (closestSafe.peakKva <= cap) {
    console.log(`  PASS  the closest safe day keeps ${margin.toFixed(1)} kVA of margin (cap ${cap.toFixed(1)} kVA)`);
  } else {
    failures++;
    console.log(
      `  FAIL  an ordinary day reaches ${closestSafe.peakKva} kVA, past the ${cap.toFixed(1)} kVA cap that keeps overruns deliberate`
    );
  }

  // The overrun register must be derived from the curve, and match it exactly:
  // this is what the Alertes sub-module will read.
  checks++;
  const sameDays =
    d.DEPASSEMENT_EVENTS.length === over.length &&
    d.DEPASSEMENT_EVENTS.every((e) => e.peakKva > d.CONTRACT.ps && d.DAILY.some((x) => x.date === e.date));
  if (sameDays) {
    console.log('  PASS  the overrun register is derived from the curve, day for day');
  } else {
    failures++;
    console.log('  FAIL  the register and the curve disagree on which days exceeded Ps');
  }

  // Each event must be priced like steg.js: only the part above Ps + tolerance is
  // billable, and the two events must not collapse to the same severity.
  checks++;
  const priced = d.DEPASSEMENT_EVENTS.every((e) => {
    const taxable = Math.round(Math.max(0, e.peakKva - d.CONTRACT.ps - d.TOLERANCE_KVA) * 10) / 10;
    const penalty = Math.round(taxable * d.CONTRACT.penaltyRatePerKvaPerMonth * 100) / 100;
    return taxable === e.taxableKva && penalty === e.penaltyPerMonth;
  });
  const severities = new Set(d.DEPASSEMENT_EVENTS.map((e) => e.severity));
  if (priced && severities.size === 2) {
    console.log(`  PASS  penalties follow Ps + tolerance (${[...severities].join(' / ')})`);
  } else {
    failures++;
    console.log(`  FAIL  pricing or severity wrong (${[...severities].join(' / ')})`);
  }

  // The monthly rollup must be the max of its days, so the month view cannot show
  // fewer overruns than the daily one.
  checks++;
  const monthlyOk = d.MONTHLY.every((m) => {
    const rows = d.DAILY.filter((x) => x.month === m.month);
    return (
      Math.abs(Math.max(...rows.map((x) => x.peakKva)) - m.peakKva) < 1e-9 &&
      rows.filter((x) => x.peakKva > d.CONTRACT.ps).length === m.exceedances
    );
  });
  const exceededMonths = d.MONTHLY.filter((m) => m.exceeded);
  if (monthlyOk && exceededMonths.length === 2) {
    console.log(`  PASS  monthly peaks are the max of their days, 2 months flagged (${exceededMonths.map((m) => m.label).join(', ')})`);
  } else {
    failures++;
    console.log(`  FAIL  monthly rollup wrong (${exceededMonths.length} months flagged)`);
  }

  // The headline peak must be the largest day, not an independently stored number.
  checks++;
  const maxKva = Math.max(...d.DAILY.map((x) => x.peakKva));
  if (d.PEAK_DAY.peakKva === maxKva && d.PEAK_DAY.date === over.reduce((a, b) => (b.peakKva > a.peakKva ? b : a)).date) {
    console.log(`  PASS  the maximum is read off the series (${maxKva} kVA on ${d.PEAK_DAY.date})`);
  } else {
    failures++;
    console.log(`  FAIL  maximum ${d.PEAK_DAY.peakKva} on ${d.PEAK_DAY.date} is not the series max`);
  }

  // Rendering.
  local.setItem('wattlab.mode', 'analytics');
  globalThis.window.location.hash = '#/ps-depassement';
  const content = contentOf(renderToStaticMarkup(createElement(mod.App)));

  checks++;
  if (!content.includes('Module vide')) {
    console.log('  PASS  the reserved empty state is gone');
  } else {
    failures++;
    console.log('  FAIL  module still renders the "Module vide" placeholder');
  }

  const canvases = (content.match(/<canvas/g) || []).length;
  checks++;
  if (canvases === 1) {
    console.log('  PASS  the peak chart renders (1 canvas)');
  } else {
    failures++;
    console.log(`  FAIL  expected 1 canvas, found ${canvases}`);
  }

  const kpiLabels = [
    'Puissance souscrite contractuelle',
    'Puissance maximale atteinte',
    'Nombre de dépassements'
  ];
  checks++;
  const missingKpis = kpiLabels.filter((l) => !content.includes(l));
  if (missingKpis.length === 0) {
    console.log('  PASS  KPI strip shows the 3 requested indicators');
  } else {
    failures++;
    console.log(`  FAIL  missing KPIs: ${missingKpis.join(', ')}`);
  }

  // The limit has to be stated on screen, not only painted on the canvas.
  checks++;
  if (content.includes('Ps 150.0 kVA') && content.includes('kVA')) {
    console.log('  PASS  the Ps limit line is declared with its unit');
  } else {
    failures++;
    console.log('  FAIL  the Ps limit is not labelled');
  }

  checks++;
  if (content.includes('2') && content.includes('dépassements')) {
    console.log('  PASS  the overrun count reaches the KPI strip');
  } else {
    failures++;
    console.log('  FAIL  the overrun count is not shown');
  }

  // Separation of concerns: this screen owns the curve and the KPIs, so the
  // overrun register must NOT be rendered here. It belongs to Alertes alone.
  checks++;
  const leakedIds = [...content.matchAll(/data-event-id="([^"]+)"/g)].map((m) => m[1]);
  const leakedRegister = leakedIds.length > 0 || content.includes('Registre des dépassements');
  if (!leakedRegister) {
    console.log('  PASS  the overrun register is not duplicated on the Surveillance screen');
  } else {
    failures++;
    console.log(`  FAIL  Surveillance still renders the Alertes register (${leakedIds.join(', ')})`);
  }

  // The month/day switch, with the month view open by default.
  checks++;
  const levels = ['Mois', 'Jour'];
  const missingLevels = levels.filter((l) => !content.includes(`>${l}</button>`));
  const pressedAt = content.indexOf('aria-pressed="true"');
  const pressedLabel = pressedAt > -1 ? content.slice(pressedAt, content.indexOf('</button>', pressedAt)) : '';
  if (missingLevels.length === 0 && pressedLabel.includes('>Mois')) {
    console.log('  PASS  mois / jour are offered, month view open by default');
  } else {
    failures++;
    console.log(
      `  FAIL  period selector wrong (missing: ${missingLevels.join(', ') || 'none'}, ` +
        `pressed: ${pressedLabel.slice(-20) || 'nothing'})`
    );
  }

  // Every plotted point must exist as text too, the limit repeated per row.
  checks++;
  const missingPoints = d.MONTHLY.filter((m) => !content.includes(esc(m.label)));
  if (missingPoints.length === 0) {
    console.log(`  PASS  all ${d.MONTHLY.length} months are present with a textual fallback`);
  } else {
    failures++;
    console.log(`  FAIL  missing months: ${missingPoints.map((m) => m.label).join(', ')}`);
  }

  // Honesty, same invariant as its siblings.
  checks++;
  if (content.includes('Données simulées') && content.includes(esc(d.SIMULATION_NOTE))) {
    console.log('  PASS  the data is explicitly marked as simulated');
  } else {
    failures++;
    console.log('  FAIL  simulated data is not labelled');
  }

  // The chart must actually be given the limit and the crossing threshold, or the
  // red line and the red markers would be decoration. The contract lives beside the
  // data, so it can be asserted directly: in the default month view exactly two
  // plotted points must sit above the reference line.
  const monthChart = d.chartProps('mois');
  const dayChart = d.chartProps('jour');
  const monthOver = monthChart.values.filter((v) => v > monthChart.reference);
  const dayOver = dayChart.values.filter((v) => v > dayChart.reference);
  checks++;
  if (
    monthChart.reference === d.CONTRACT.ps &&
    monthChart.highlightAbove === d.CONTRACT.ps &&
    // The limit has to be the danger red used everywhere else for an overrun,
    // not the series colour, or it would read as another measurement.
    monthChart.referenceColor === '#dc2626' &&
    monthChart.highlightAbove === monthChart.reference &&
    monthChart.values.length === 12 &&
    dayChart.values.length === 365
  ) {
    console.log('  PASS  the chart is given Ps as both reference line and highlight threshold, in red');
  } else {
    failures++;
    console.log(
      `  FAIL  chart contract wrong (reference ${monthChart.reference}, highlight ${monthChart.highlightAbove}, colour ${monthChart.referenceColor})`
    );
  }

  checks++;
  if (monthOver.length === 2 && dayOver.length === 2) {
    console.log(`  PASS  exactly 2 plotted points cross the red line in both views (month ${monthOver.join(', ')}, jour ${dayOver.join(', ')})`);
  } else {
    failures++;
    console.log(`  FAIL  ${monthOver.length} monthly and ${dayOver.length} daily points cross Ps, expected 2 and 2`);
  }

  globalThis.window.location.hash = '#/analytics-puissance-souscrite';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Alertes: the overrun register lives here, and only here (simulated) ===');
{
  const d = mod.puissanceData;
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  local.setItem('wattlab.mode', 'analytics');
  globalThis.window.location.hash = '#/ps-alertes';
  const content = contentOf(renderToStaticMarkup(createElement(mod.App)));

  // The register must be here, complete and addressable.
  checks++;
  const eventIds = [...content.matchAll(/data-event-id="([^"]+)"/g)].map((m) => m[1]);
  const isoDates = [...content.matchAll(/ps-depassement-(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  if (
    eventIds.length === d.DEPASSEMENT_EVENTS.length &&
    eventIds.every((id, i) => id === `ps-depassement-${d.DEPASSEMENT_EVENTS[i].date}`) &&
    isoDates.includes('2026-02-19') &&
    isoDates.includes('2026-07-23')
  ) {
    console.log(`  PASS  the register renders every overrun with its exact date (${eventIds.join(', ')})`);
  } else {
    failures++;
    console.log(`  FAIL  register on the Alertes screen: ${eventIds.join(', ') || 'none'}`);
  }

  // Every field the card has to carry: peak, overrun, free allowance, taxable
  // excess and the STEG penalty, restated per alert. The expected strings come
  // from the app's own formatters, and each field is looked for INSIDE its own
  // card: a value that happens to appear elsewhere on the page (header chip,
  // billing table) must not pass for a card that forgot to show it.
  checks++;
  const { fmtKva: kva, fmtDT: dt } = mod.format;
  const chunks = content.split(/(?=<li data-event-id=)/);
  const cardOf = (id) => chunks.find((c) => c.includes(`data-event-id="${id}"`)) || '';
  const missingFields = [];
  for (const e of d.DEPASSEMENT_EVENTS) {
    const card = cardOf(e.id);
    if (!card) {
      missingFields.push(`${e.id} card missing`);
      continue;
    }
    if (!card.includes(kva(e.peakKva))) missingFields.push(`${e.id} peak ${kva(e.peakKva)}`);
    if (!card.includes(kva(e.psKva))) missingFields.push(`${e.id} contracted Ps ${kva(e.psKva)}`);
    if (!card.includes(`+${kva(e.overrunKva)}`)) missingFields.push(`${e.id} overrun`);
    if (!card.includes(kva(e.toleranceKva))) missingFields.push(`${e.id} tolerance`);
    if (!card.includes(e.dateLabel)) missingFields.push(`${e.id} date label`);
    if (!card.includes(e.timeLabel)) missingFields.push(`${e.id} time`);
    if (e.taxableKva > 0 && !card.includes(kva(e.taxableKva)))
      missingFields.push(`${e.id} taxable excess ${kva(e.taxableKva)}`);
    if (e.penaltyPerMonth > 0 && !card.includes(dt(e.penaltyPerMonth)))
      missingFields.push(`${e.id} penalty ${dt(e.penaltyPerMonth)}`);
  }
  if (missingFields.length === 0) {
    console.log(
      '  PASS  each alert card carries its own peak, overrun, tolerance, date, time, taxable excess and penalty'
    );
  } else {
    failures++;
    console.log(`  FAIL  incomplete alert cards: ${missingFields.join(', ')}`);
  }

  // The two severities must be distinguished: an alert inside the free allowance
  // must not be dressed like an invoice.
  checks++;
  const severityPerCard = d.DEPASSEMENT_EVENTS.every((e) => {
    const card = cardOf(e.id);
    return e.severity === 'critical' ? card.includes('Pénalité STEG') : card.includes('Alerte · tolérance');
  });
  if (severityPerCard) {
    console.log('  PASS  each alert card is badged with its own severity level');
  } else {
    failures++;
    console.log('  FAIL  an alert card is badged with the wrong severity level');
  }

  // The KPI strip. The exposure figure is distinctive enough to prove the strip
  // carries the aggregates rather than three hard-coded numbers.
  checks++;
  const missingKpis = ['Alertes déclenchées', 'Alertes critiques', 'Exposition mensuelle'].filter(
    (l) => !content.includes(l)
  );
  const exposure = dt(d.ALERT_SUMMARY.monthlyPenaltyIfRecurring);
  if (missingKpis.length === 0 && content.includes(exposure)) {
    console.log(
      `  PASS  the alert KPI strip is present (${d.ALERT_SUMMARY.total} alerts, ` +
        `${d.ALERT_SUMMARY.critical} critical, ${exposure}/mois exposure)`
    );
  } else {
    failures++;
    console.log(
      `  FAIL  alert KPI strip wrong (missing: ${missingKpis.join(', ') || 'none'}, exposure "${exposure}": ${content.includes(exposure)})`
    );
  }

  checks++;
  if (d.ALERT_SUMMARY.total === d.DEPASSEMENT_EVENTS.length && d.ALERT_SUMMARY.worst) {
    const worst = d.ALERT_SUMMARY.worst;
    if (worst.peakKva === Math.max(...d.DEPASSEMENT_EVENTS.map((e) => e.peakKva))) {
      console.log(`  PASS  the summary aggregates agree with the register (worst ${worst.dateLabel})`);
    } else {
      failures++;
      console.log('  FAIL  the "worst alert" aggregate is not the highest peak in the register');
    }
  } else {
    failures++;
    console.log('  FAIL  alert summary aggregates do not match the register');
  }

  // The reverse boundary: the annual curve belongs to Surveillance, not here.
  checks++;
  if (!content.includes('<canvas')) {
    console.log('  PASS  the power curve is not duplicated onto the Alertes screen');
  } else {
    failures++;
    console.log('  FAIL  Alertes renders a chart that belongs to Surveillance');
  }

  // Honesty.
  checks++;
  if (content.includes('Données simulées') && content.includes(esc(d.SIMULATION_NOTE))) {
    console.log('  PASS  the alerts are explicitly marked as simulated');
  } else {
    failures++;
    console.log('  FAIL  the alerts are not labelled as simulated');
  }

  globalThis.window.location.hash = '#/analytics-puissance-souscrite';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Cos Phi sub-sections: same sidebar-tree structure ===');
{
  local.setItem('wattlab.mode', 'analytics');

  const EXPECTED = [
    ['cp-depassement', 'Suivi de dépassement'],
    ['cp-alertes', 'Alertes']
  ];

  const sidebarAt = (view) =>
    renderToStaticMarkup(
      createElement(mod.Sidebar, {
        view,
        onNavigate() {},
        onLogout() {},
        user: { displayName: 'Manager', role: 'admin' },
        open: false,
        onClose() {},
        collapsed: false,
        onToggleCollapse() {},
        demo: false,
        mode: 'analytics'
      })
    );

  checks++;
  const declared = (mod.findNav('analytics-cos-phi', 'analytics')?.children || []).map((c) => c.id);
  if (JSON.stringify(declared) === JSON.stringify(EXPECTED.map(([id]) => id))) {
    console.log('  PASS  sub-sections are declared in the required order');
  } else {
    failures++;
    console.log(`  FAIL  declared sub-section order: ${declared.join(', ')}`);
  }

  for (const [id] of EXPECTED) {
    checks++;
    if (mod.findNav(id, 'analytics')) {
      console.log(`  PASS  route "${id}" resolves in the nav registry`);
    } else {
      failures++;
      console.log(`  FAIL  route "${id}" does not resolve`);
    }
  }

  const onParent = sidebarAt('analytics-cos-phi');
  checks++;
  if (onParent.includes('Sous-sections Cos Phi')) {
    console.log('  PASS  selecting "Cos Phi" reveals its sub-menu');
  } else {
    failures++;
    console.log('  FAIL  sub-menu not revealed on the parent view');
  }

  const onChild = sidebarAt('cp-depassement');
  checks++;
  if (onChild.includes('Sous-sections Cos Phi')) {
    console.log('  PASS  group stays open on a sub-section route');
  } else {
    failures++;
    console.log('  FAIL  group collapsed on a sub-section route');
  }

  const menuTextAt = onChild.indexOf('Sous-sections Cos Phi');
  const menuUlAt = onChild.lastIndexOf('<ul', menuTextAt);
  const parentLabelAt = onChild.lastIndexOf('Cos Phi', menuUlAt);
  const between = onChild.slice(parentLabelAt, menuUlAt);
  checks++;
  if (parentLabelAt > -1 && !between.includes('</li>')) {
    console.log('  PASS  sub-menu is nested inside the parent item');
  } else {
    failures++;
    console.log('  FAIL  sub-menu rendered as a sibling, not nested');
  }

  const menuUlEnd = onChild.indexOf('</ul>', menuTextAt);
  const menu = onChild.slice(menuTextAt, menuUlEnd);
  const positions = EXPECTED.map(([, l]) => menu.indexOf(l));
  checks++;
  if (positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]))) {
    console.log('  PASS  sub-menu lists both sub-sections in the required order');
  } else {
    failures++;
    console.log(`  FAIL  sub-menu order wrong: ${positions.join(', ')}`);
  }

  checks++;
  const subCount = (onChild.slice(menuUlAt, menuUlEnd).match(/<li>/g) || []).length;
  if (subCount === 2) {
    console.log('  PASS  sub-menu contains exactly 2 items');
  } else {
    failures++;
    console.log(`  FAIL  sub-menu contains ${subCount} items, expected 2`);
  }

  const currentBtn = onChild.match(/<button[^>]*aria-current="page"[^>]*>[\s\S]*?<\/button>/);
  checks++;
  if (currentBtn && currentBtn[0].includes('title="Suivi de dépassement"')) {
    console.log('  PASS  the selected sub-section itself is marked current');
  } else {
    failures++;
    console.log('  FAIL  the current item is not the selected sub-section');
  }

  // Only the active group may be expanded.
  checks++;
  if (!onChild.includes('Sous-sections Consommation') && !onChild.includes('Sous-sections Puissance souscrite')) {
    console.log('  PASS  the other two groups stay collapsed');
  } else {
    failures++;
    console.log('  FAIL  an unrelated group is expanded at the same time');
  }

  // Both sub-sections are real screens now, with a single concern each: the Suivi
  // owns the curve and the KPIs, the Alertes own the register of the dips.
  for (const [id, label] of EXPECTED) {
    globalThis.window.location.hash = `#/${id}`;
    const content = contentOf(renderToStaticMarkup(createElement(mod.App)));
    checks++;
    if (content.includes(label) && !content.includes('Module vide')) {
      console.log(`  PASS  "${id}" renders its own screen in <main>`);
    } else {
      failures++;
      console.log(`  FAIL  "${id}" screen incorrect (has label: ${content.includes(label)})`);
    }
  }

  globalThis.window.location.hash = '#/analytics-cos-phi';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== Cos Phi: dataset, threshold, axis band, screen split ===');
{
  const d = mod.cosPhiData;
  local.setItem('wattlab.mode', 'analytics');

  // The register must be read off the finished series, never from a design list.
  const under = d.DAILY.filter((x) => x.cosPhi < d.CONTRACT.threshold);
  check('every day under the floor is in the register', () => {
    if (under.length !== d.BREACH_EVENTS.length) {
      throw new Error(`${under.length} dips but ${d.BREACH_EVENTS.length} alerts`);
    }
    return 'ok';
  });
  check('every registered alert is under the floor', () => {
    const bad = d.BREACH_EVENTS.filter((e) => e.cosPhi >= d.CONTRACT.threshold);
    if (bad.length) throw new Error(`${bad.length} alerts are not breaches`);
    return 'ok';
  });
  check('KPI breach count agrees with the series', () => {
    if (d.KPIS[2].value !== under.length) throw new Error(`KPI says ${d.KPIS[2].value}`);
    return 'ok';
  });
  check('the whole series fits the pinned 0.70 .. 1.00 axis', () => {
    const lo = Math.min(...d.DAILY.map((x) => x.cosPhi));
    const hi = Math.max(...d.DAILY.map((x) => x.cosPhi));
    if (lo < 0.7 || hi > 1) throw new Error(`series spans ${lo} .. ${hi}`);
    return 'ok';
  });
  check('the contract floor is 0.80 and the floor is the breach test', () => {
    const c = d.chartProps('jour');
    if (d.CONTRACT.threshold !== 0.8) throw new Error(`threshold ${d.CONTRACT.threshold}`);
    if (c.reference !== 0.8) throw new Error(`reference ${c.reference}`);
    if (c.highlightBelow !== 0.8) throw new Error(`highlightBelow ${c.highlightBelow}`);
    if (c.highlightAbove !== null && c.highlightAbove !== undefined) {
      throw new Error('a power factor must not be highlighted as an overrun');
    }
    return 'ok';
  });
  check('the axis bounds are handed to the chart', () => {
    const c = d.chartProps('jour');
    if (c.yMin !== 0.7 || c.yMax !== 1) throw new Error(`axis ${c.yMin} .. ${c.yMax}`);
    return 'ok';
  });
  check('the daily series spans a full year', () => {
    if (d.DAILY.length !== 365) throw new Error(`${d.DAILY.length} points`);
    return 'ok';
  });
  check('the dips actually fall below the floor', () => {
    if (d.MIN_COSPHI.cosPhi >= d.CONTRACT.threshold) throw new Error('no dip below the floor');
    return 'ok';
  });
  check('every alert carries reactive energy and a penalty', () => {
    const bad = d.BREACH_EVENTS.filter((e) => !(e.billableKvarh > 0) || !(e.penaltyDT > 0));
    if (bad.length) throw new Error(`${bad.length} alerts without kvarh or penalty`);
    return 'ok';
  });
  check('each alert states its date, value, kvarh and STEG penalty', () => {
    const html = renderToStaticMarkup(createElement(mod.CosPhiAlertList, { events: d.BREACH_EVENTS }));
    for (const e of d.BREACH_EVENTS) {
      if (!html.includes(e.id)) throw new Error(`missing card ${e.id}`);
      if (!html.includes(e.dateLabel)) throw new Error(`missing date ${e.dateLabel}`);
      if (!html.includes('kvarh')) throw new Error('missing reactive energy unit');
      if (!html.includes('DT')) throw new Error('missing STEG penalty amount');
    }
    return 'ok';
  });

  // Suivi: curve + KPIs, and explicitly NOT the alert cards.
  globalThis.window.location.hash = '#/cp-depassement';
  const suivi = contentOf(renderToStaticMarkup(createElement(mod.App)));

  check('Suivi renders the power factor chart', () => {
    if ((suivi.match(/<canvas/g) || []).length !== 1) throw new Error('expected 1 canvas');
    return 'ok';
  });
  check('Suivi shows the 3 requested KPIs', () => {
    const labels = ['Seuil minimal contractuel', 'Cos φ minimal enregistré', 'Nombre de franchissements'];
    const missing = labels.filter((l) => !suivi.includes(l));
    if (missing.length) throw new Error(`missing: ${missing.join(', ')}`);
    return 'ok';
  });
  check('Suivi states the 0.80 floor in text, not only on the canvas', () => {
    if (!suivi.includes('0.80')) throw new Error('the floor is not stated');
    return 'ok';
  });
  check('Suivi prints every point in a textual table', () => {
    if (!suivi.includes('<table')) throw new Error('no accessible table');
    return 'ok';
  });
  check('Suivi carries no alert card', () => {
    if (suivi.includes('Registre des cos')) throw new Error('the alert register leaked into the Suivi');
    const ids = [...suivi.matchAll(/cp-depassement-\d{4}-\d{2}-\d{2}/g)];
    if (ids.length) throw new Error(`${ids.length} alert card ids on the Suivi screen`);
    return 'ok';
  });

  // Alertes: the register, and the curve is not duplicated here.
  globalThis.window.location.hash = '#/cp-alertes';
  const alertes = contentOf(renderToStaticMarkup(createElement(mod.App)));

  check('Alertes renders one card per dip', () => {
    for (const e of d.BREACH_EVENTS) {
      if (!alertes.includes(`data-event-id="${e.id}"`)) throw new Error(`missing card ${e.id}`);
    }
    return 'ok';
  });
  check('Alertes does not duplicate the Suivi chart', () => {
    if (alertes.includes('<canvas')) throw new Error('the curve is rendered on the Alertes screen');
    return 'ok';
  });
  check('Alertes is labelled as simulated', () => {
    if (!alertes.includes('Données simulées')) throw new Error('missing simulated badge');
    return 'ok';
  });

  // LineChart must accept the pinned band without breaking its other callers.
  check('LineChart accepts an explicit band and a floor highlight', () => {
    renderToStaticMarkup(
      createElement(mod.LineChart, {
        labels: ['a', 'b'],
        values: [0.9, 0.74],
        label: 'Cos φ',
        unit: 'cos φ',
        reference: 0.8,
        highlightBelow: 0.8,
        yMin: 0.7,
        yMax: 1
      })
    );
    return 'ok';
  });

  globalThis.window.location.hash = '#/analytics-cos-phi';
  local.setItem('wattlab.mode', 'live');
}

console.log('\n=== nav registry integrity ===');
{
  const { NAV, getNav, getDefaultView, MODES } = mod;
  const ids = NAV.map((n) => n.id);
  const labels = NAV.map((n) => n.label);
  const dupeIds = ids.filter((v, i) => ids.indexOf(v) !== i);
  const dupeLabels = labels.filter((v, i) => labels.indexOf(v) !== i);

  checks++;
  if (dupeIds.length === 0) console.log('  PASS  no duplicate nav ids');
  else { failures++; console.log(`  FAIL  duplicate ids: ${dupeIds.join(', ')}`); }

  // Two sidebar entries with the same label are indistinguishable to a user.
  checks++;
  if (dupeLabels.length === 0) console.log('  PASS  no duplicate sidebar labels');
  else { failures++; console.log(`  FAIL  duplicate labels: ${dupeLabels.join(', ')}`); }

  // Every registered view must resolve to a mounted page component.
  const legacy = ids.filter((id) => id === 'energy-analytics');
  checks++;
  if (legacy.length === 0) {
    console.log(`  PASS  registry has ${ids.length} modules, legacy "energy-analytics" removed`);
  } else {
    failures++;
    console.log('  FAIL  legacy "energy-analytics" still registered');
  }

  // Route ids must be unique across the whole tree, sub-sections included, or the
  // router would resolve an ambiguous id.
  const allIds = NAV.flatMap((n) => [n.id, ...(n.children || []).map((c) => c.id)]);
  const dupeAll = allIds.filter((v, i) => allIds.indexOf(v) !== i);
  checks++;
  if (dupeAll.length === 0) {
    console.log(`  PASS  no duplicate ids across ${allIds.length} routes (incl. sub-sections)`);
  } else {
    failures++;
    console.log(`  FAIL  duplicate ids in the tree: ${dupeAll.join(', ')}`);
  }

  // Labels must be unique among SIBLINGS, not across the whole tree. A sub-item
  // is read in the context of its visible parent, so "Alertes" under two
  // different modules is unambiguous in place. A collision at the same level is
  // not, and is what this guards against.
  const siblingDuplicates = [];
  for (const n of NAV) {
    const kids = n.children || [];
    const seen = new Map();
    for (const c of kids) {
      if (seen.has(c.label)) siblingDuplicates.push(`${n.label} > ${c.label}`);
      seen.set(c.label, true);
    }
  }
  checks++;
  if (siblingDuplicates.length === 0) {
    console.log('  PASS  no duplicate labels among sibling sub-sections');
  } else {
    failures++;
    console.log(`  FAIL  duplicate sibling labels: ${siblingDuplicates.join('; ')}`);
  }

  // A sub-section label must not shadow a top-level module label either.
  const topLabels = new Set(NAV.map((n) => n.label));
  const shadows = NAV.flatMap((n) => (n.children || []).map((c) => c.label)).filter((l) => topLabels.has(l));
  checks++;
  if (shadows.length === 0) {
    console.log('  PASS  no sub-section label shadows a top-level module');
  } else {
    failures++;
    console.log(`  FAIL  sub-section label shadows a top-level module: ${shadows.join(', ')}`);
  }

  // "Alertes" is intentionally shared by two groups: pin that so a future
  // rename is a conscious decision rather than a silent divergence.
  const alertGroups = NAV.filter((n) => (n.children || []).some((c) => c.label === 'Alertes')).map(
    (n) => n.label
  );
  checks++;
  if (JSON.stringify(alertGroups) === JSON.stringify(['Puissance souscrite', 'Cos Phi'])) {
    console.log('  PASS  "Alertes" sits under both Puissance souscrite and Cos Phi, as intended');
  } else {
    failures++;
    console.log(`  FAIL  unexpected "Alertes" placement: ${alertGroups.join(', ') || 'none'}`);
  }

  for (const m of MODES) {
    const list = getNav(m.id);
    const def = getDefaultView(m.id);
    checks++;
    if (list.length > 0 && list.some((n) => n.id === def)) {
      console.log(`  PASS  mode "${m.id}": default view "${def}" is in its ${list.length} module(s)`);
    } else {
      failures++;
      console.log(`  FAIL  mode "${m.id}" default view "${def}" is not registered`);
    }
  }
}

console.log('\n=== the old analytics route must be gone ===');
check('#/energy-analytics no longer resolves to a module', () => {
  const html = renderToStaticMarkup(createElement(mod.Sidebar, {
    view: 'energy-analytics', onNavigate() {}, onLogout() {},
    user: null, open: false, onClose() {}, collapsed: false,
    onToggleCollapse() {}, demo: false, mode: 'analytics'
  }));
  if (html.includes('Ce module')) throw new Error('legacy route still selectable');
  return html;
});
check('App at #/energy-analytics falls back safely', () => {
  globalThis.window.location.hash = '#/energy-analytics';
  const html = renderToStaticMarkup(createElement(mod.App));
  globalThis.window.location.hash = '#/consommation';
  return html;
});

console.log('\n=== error containment: a throwing child must not blank the tree ===');
// Note: react-dom/server rethrows instead of honouring error boundaries (they are
// a client-renderer feature), so the boundary is exercised through its own logic
// rather than through SSR.
{
  const EB = mod.ErrorBoundary;
  const child = createElement('div', null, 'page content');
  let ok = true;
  const note = (m) => { ok = false; console.log(`        ${m}`); };

  if (typeof EB.getDerivedStateFromError !== 'function') note('missing getDerivedStateFromError');

  const inst = new EB({ children: child });
  inst.setState = (s) => { inst.state = { ...inst.state, ...(typeof s === 'function' ? s(inst.state) : s) }; };

  // 1. no error -> children pass straight through
  if (inst.render() !== child) note('children are not rendered while healthy');

  // 2. React catches a render error -> boundary records it
  inst.state = EB.getDerivedStateFromError(new Error('page exploded'));
  if (!inst.state.error) note('error was not captured');

  // 3. the fallback replaces only the failing panel, and shows the reason
  const fallback = inst.render();
  if (fallback === child) note('fallback did not replace the failing child');
  const fallbackText = renderToStaticMarkup(fallback);
  if (!fallbackText.includes('page exploded')) note('fallback hides the error message');
  if (!fallbackText.includes('Retry') && !fallbackText.includes('Réessayer')) note('fallback offers no retry');

  // 4. retry clears the error and the real content comes back
  inst.reset();
  if (inst.state.error !== null) note('reset did not clear the error');
  if (inst.render() !== child) note('content not restored after reset');

  // 5. navigating to another view clears a stale error without a manual retry
  inst.state = EB.getDerivedStateFromError(new Error('stale'));
  inst.componentDidUpdate({ resetKey: 'live:consommation' });
  if (inst.state.error !== null) note('navigating away did not clear the error');

  checks++;
  if (ok) console.log('  PASS  ErrorBoundary captures, isolates, retries and auto-clears on navigation');
  else { failures++; console.log('  FAIL  ErrorBoundary logic'); }
}

console.log('\n=== unknown / hostile routes must not produce an invalid element ===');
for (const hash of ['#/does-not-exist', '#/tariff-audit', '#/', '#/production-cost']) {
  check(`App at ${hash}`, () => {
    globalThis.window.location.hash = hash;
    return renderToStaticMarkup(createElement(mod.App));
  });
}
globalThis.window.location.hash = '#/consommation';

console.log('\n=== logout path (back to Login) ===');
check('Login renders', () => renderToStaticMarkup(createElement(mod.Login, { onLogin() {}, error: null, loading: false })));

console.log(failures === 0 ? `\nAll ${checks} render checks passed.` : `\n${failures} of ${checks} render checks FAILED.`);
process.exit(failures === 0 ? 0 : 1);


