const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

const UTILIZATION = 0.5;
const SURGE_MIN = 0.95;
const SURGE_SPAN = 0.18;
const NOISE_MIN = 0.9;
const NOISE_SPAN = 0.2;
const DRIFT_MIN = 0.93;
const DRIFT_SPAN = 0.14;

const SHAPES = {
  production: [
    0.3, 0.28, 0.27, 0.27, 0.3, 0.42, 0.68, 0.88, 0.97, 1.0, 0.96, 0.72, 0.6, 0.85, 0.99, 1.0, 0.93, 0.8,
    0.66, 0.55, 0.46, 0.4, 0.35, 0.32
  ],
  flat: [
    0.72, 0.7, 0.69, 0.68, 0.7, 0.76, 0.86, 0.92, 0.95, 0.96, 0.95, 0.92, 0.9, 0.93, 0.96, 0.95, 0.92, 0.88,
    0.85, 0.82, 0.79, 0.76, 0.74, 0.73
  ],
  utility: [
    0.55, 0.52, 0.5, 0.49, 0.52, 0.62, 0.78, 0.9, 0.98, 1.0, 0.99, 0.94, 0.9, 0.97, 1.0, 0.98, 0.92, 0.85,
    0.78, 0.72, 0.66, 0.62, 0.59, 0.57
  ],
  night: [
    0.62, 0.6, 0.58, 0.56, 0.55, 0.52, 0.48, 0.44, 0.42, 0.4, 0.4, 0.42, 0.44, 0.46, 0.48, 0.5, 0.52, 0.55,
    0.58, 0.6, 0.62, 0.63, 0.63, 0.62
  ]
};

const SEASONAL = [0.9, 0.88, 0.93, 0.99, 1.05, 1.13, 1.19, 1.21, 1.09, 0.99, 0.93, 0.95];

const WEEKEND = [0.42, 1, 1, 1, 1, 1, 0.72];

export const DEPARTMENTS = [
  {
    id: 'mechanical',
    name: 'Mechanical',
    color: '#0284c7',
    rgb: '2,132,199',
    seasonAmp: 0.2,
    weekendFactor: 0.44,
    workshops: [
      { id: 'cnc', name: 'CNC Machining Line', shape: 'production', peakKva: 38, pf: 0.93, kwhPerUnit: 1.6 },
      { id: 'press', name: 'Press & Forging', shape: 'production', peakKva: 30, pf: 0.91, kwhPerUnit: 2.4 },
      { id: 'maint', name: 'Maintenance Bay', shape: 'night', peakKva: 10, pf: 0.85, kwhPerUnit: null }
    ]
  },
  {
    id: 'electrotechnics',
    name: 'Electrotechnics',
    color: '#7c3aed',
    rgb: '124,58,237',
    seasonAmp: -0.2,
    weekendFactor: 0.5,
    workshops: [
      { id: 'winding', name: 'Winding Room', shape: 'flat', peakKva: 22, pf: 0.94, kwhPerUnit: 0.85 },
      { id: 'etest', name: 'Electronics Test Bench', shape: 'production', peakKva: 18, pf: 0.96, kwhPerUnit: 0.62 },
      { id: 'epower', name: 'Power Electronics', shape: 'flat', peakKva: 8, pf: 0.9, kwhPerUnit: null }
    ]
  },
  {
    id: 'textiles',
    name: 'Textiles',
    color: '#db2777',
    rgb: '219,39,119',
    seasonAmp: -0.6,
    weekendFactor: 0.3,
    workshops: [
      { id: 'weave-a', name: 'Weaving Hall A', shape: 'production', peakKva: 28, pf: 0.9, kwhPerUnit: 0.55 },
      { id: 'weave-b', name: 'Weaving Hall B', shape: 'production', peakKva: 22, pf: 0.89, kwhPerUnit: 0.62 },
      { id: 'finish', name: 'Finishing & Dyeing', shape: 'utility', peakKva: 8, pf: 0.86, kwhPerUnit: null }
    ]
  },
  {
    id: 'assembly',
    name: 'Assembly & Packaging',
    color: '#059669',
    rgb: '5,150,105',
    seasonAmp: 0.1,
    weekendFactor: 0.38,
    workshops: [
      { id: 'asm-1', name: 'Assembly Line 1', shape: 'production', peakKva: 24, pf: 0.94, kwhPerUnit: 0.42 },
      { id: 'asm-2', name: 'Assembly Line 2', shape: 'production', peakKva: 12, pf: 0.94, kwhPerUnit: 0.38 },
      { id: 'pack', name: 'Packaging & Palletizing', shape: 'production', peakKva: 8, pf: 0.88, kwhPerUnit: 0.22 }
    ]
  },
  {
    id: 'utilities',
    name: 'Utilities & Auxiliaries',
    color: '#d97706',
    rgb: '217,119,6',
    seasonAmp: 0.9,
    weekendFactor: 0.72,
    workshops: [
      { id: 'air', name: 'Compressed Air Plant', shape: 'utility', peakKva: 16, pf: 0.88, kwhPerUnit: null },
      { id: 'chiller', name: 'Chiller Plant', shape: 'utility', peakKva: 20, pf: 0.86, kwhPerUnit: null },
      { id: 'light', name: 'Lighting & HVAC', shape: 'night', peakKva: 8, pf: 0.94, kwhPerUnit: null }
    ]
  }
];

export const WORKSHOPS = DEPARTMENTS.flatMap((d) => d.workshops.map((w) => ({ ...w, departmentId: d.id })));

export const INSTALLED_KVA = round1(DEPARTMENTS.reduce((a, d) => a + d.workshops.reduce((b, w) => b + w.peakKva, 0), 0));
export const EFFECTIVE_KVA = round1(INSTALLED_KVA * UTILIZATION);

const PEAK_HOUR = SHAPES.production.indexOf(Math.max(...SHAPES.production));
export { UTILIZATION, PEAK_HOUR };

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shapeAt(shape, hourFloat) {
  const table = SHAPES[shape] || SHAPES.production;
  const h0 = Math.floor(((hourFloat % 24) + 24) % 24);
  const h1 = (h0 + 1) % 24;
  const f = hourFloat - Math.floor(hourFloat);
  return table[h0] + (table[h1] - table[h0]) * f;
}

function seasonalFactor(monthIndex, seasonAmp) {
  return 1 + (SEASONAL[monthIndex] - 1) * seasonAmp;
}

export function shapeTable(name) {
  return SHAPES[name] || SHAPES.production;
}

export function seasonTable() {
  return SEASONAL;
}

export function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function dayFactor(dept, date) {
  return isWeekend(date) ? dept.weekendFactor * WEEKEND[date.getDay()] : 1;
}

function emptyBucket(dept) {
  return {
    id: dept.id,
    name: dept.name,
    color: dept.color,
    rgb: dept.rgb,
    energyKwh: 0,
    cost: 0,
    units: 0,
    peakKva: 0,
    auxiliaryKwh: 0
  };
}

function newAccumulator() {
  const byDepartment = {};
  for (const dept of DEPARTMENTS) byDepartment[dept.id] = emptyBucket(dept);
  return {
    energyKwh: 0,
    cost: 0,
    units: 0,
    peakKva: 0,
    peakAt: null,
    peakTs: -1,
    averageKva: 0,
    days: 0,
    hours: 0,
    byDepartment
  };
}

function accumulate(acc, day) {
  const surge = day.surge;
  let dayPeak = 0;
  let dayPeakHour = 0;
  for (let h = 0; h < 24; h++) {
    if (day.hourlyKva[h] > dayPeak) {
      dayPeak = day.hourlyKva[h];
      dayPeakHour = h;
    }
  }
  const apparent = dayPeak * surge;
  if (apparent > acc.peakKva) {
    acc.peakKva = apparent;
    acc.peakTs = day.date.getTime() + dayPeakHour * 3600e3 + 1800e3;
    acc.peakAt = new Date(acc.peakTs).toISOString();
  }

  let dayKvaSum = 0;
  for (let h = 0; h < 24; h++) dayKvaSum += day.hourlyKva[h];
  acc.averageKva += dayKvaSum / 24;

  for (let h = 0; h < 24; h++) {
    acc.energyKwh += day.hourlyKw[h];
    acc.hours += 1;
    for (const dept of DEPARTMENTS) {
      const bucket = acc.byDepartment[dept.id];
      const slot = day.byDepartment[dept.id];
      bucket.energyKwh += slot.kwh[h];
      bucket.units += slot.units[h];
      bucket.auxiliaryKwh += slot.auxKwh[h];
      acc.units += slot.units[h];
      if (slot.kva[h] * surge > bucket.peakKva) bucket.peakKva = slot.kva[h] * surge;
    }
  }
  acc.days += 1;
}

export function monthDemandFactor(date) {
  return 0.82 + mulberry32(hashSeed(`demand-${date.getFullYear()}-${date.getMonth()}`))() * 0.32;
}

export function simulateDay(date, { seed = null, seasonal = true, demand = null } = {}) {
  const month = date.getMonth();
  const stamp = seed || `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const dayRng = mulberry32(hashSeed(`day-${stamp}`));
  const day = {
    date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
    surge: SURGE_MIN + dayRng() * SURGE_SPAN,
    demand: demand == null ? monthDemandFactor(date) : demand,
    hourlyKva: new Array(24).fill(0),
    hourlyKw: new Array(24).fill(0),
    byDepartment: {},
    byWorkshop: {}
  };
  for (const dept of DEPARTMENTS) {
    day.byDepartment[dept.id] = {
      kwh: new Array(24).fill(0),
      units: new Array(24).fill(0),
      auxKwh: new Array(24).fill(0),
      kva: new Array(24).fill(0)
    };
    for (const w of dept.workshops) {
      day.byWorkshop[w.id] = { kwh: 0, units: 0, auxKwh: 0, peakKva: 0, departmentId: dept.id };
    }
  }

  for (const dept of DEPARTMENTS) {
    const factor = dayFactor(dept, date) * day.demand * (seasonal ? seasonalFactor(month, dept.seasonAmp) : 1);
    for (const w of dept.workshops) {
      const rng = mulberry32(hashSeed(`${stamp}-${w.id}`));
      const drift = DRIFT_MIN + rng() * DRIFT_SPAN;
      const slot = day.byDepartment[dept.id];
      const own = day.byWorkshop[w.id];
      for (let h = 0; h < 24; h++) {
        const noise = NOISE_MIN + rng() * NOISE_SPAN;
        const kw = w.peakKva * UTILIZATION * w.pf * shapeAt(w.shape, h) * factor * drift * noise;
        const kva = kw / w.pf;
        day.hourlyKw[h] += kw;
        day.hourlyKva[h] += kva;
        slot.kwh[h] += kw;
        slot.kva[h] += kva;
        own.kwh += kw;
        own.peakKva = Math.max(own.peakKva, kva);
        if (w.kwhPerUnit) {
          slot.units[h] += kw / w.kwhPerUnit;
          own.units += kw / w.kwhPerUnit;
        } else {
          slot.auxKwh[h] += kw;
          own.auxKwh += kw;
        }
      }
    }
  }

  day.energyKwh = round2(day.hourlyKw.reduce((a, b) => a + b, 0));
  day.peakKva = round1(Math.max(...day.hourlyKva));
  for (const slot of Object.values(day.byWorkshop)) {
    slot.kwh = round2(slot.kwh);
    slot.auxKwh = round2(slot.auxKwh);
    slot.units = Math.round(slot.units);
    slot.peakKva = round1(slot.peakKva * day.surge);
  }
  return day;
}

function finalize(acc, { year, month, energyRatePerKwh, key, label }) {
  acc.energyKwh = round2(acc.energyKwh);
  acc.cost = round2(acc.energyKwh * energyRatePerKwh);
  acc.peakKva = round1(acc.peakKva);
  acc.averageKva = acc.days > 0 ? round1(acc.averageKva / acc.days) : 0;
  acc.units = Math.round(acc.units);
  acc.hours = acc.days * 24;
  acc.loadFactor = acc.days > 0 ? round2(acc.energyKwh / (acc.peakKva * acc.hours || 1)) : 0;

  const byDepartment = DEPARTMENTS.map((d) => {
    const b = acc.byDepartment[d.id];
    b.energyKwh = round2(b.energyKwh);
    b.cost = round2(b.energyKwh * energyRatePerKwh);
    b.units = Math.round(b.units);
    b.auxiliaryKwh = round2(b.auxiliaryKwh);
    b.peakKva = round1(b.peakKva);
    b.kwhPerUnit = b.units > 0 ? round3(b.energyKwh / b.units) : null;
    b.dtPerUnit = b.units > 0 ? round3((b.energyKwh * energyRatePerKwh) / b.units) : null;
    b.auxiliaryShare = b.energyKwh > 0 ? round2(b.auxiliaryKwh / b.energyKwh) : 0;
    return b;
  });

  return {
    key,
    label,
    year,
    month,
    energyKwh: acc.energyKwh,
    cost: acc.cost,
    units: acc.units,
    peakKva: acc.peakKva,
    peakAt: acc.peakAt,
    averageKva: acc.averageKva,
    loadFactor: acc.loadFactor,
    days: acc.days,
    kwhPerUnit: acc.units > 0 ? round3(acc.energyKwh / acc.units) : null,
    dtPerUnit: acc.units > 0 ? round3(acc.cost / acc.units) : null,
    byDepartment
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(monthIndex) {
  return MONTH_LABELS[monthIndex];
}

export function buildMonth({ year, month, energyRatePerKwh = 0.25, upToDay = null }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lastDay = upToDay == null ? daysInMonth : Math.min(Math.max(upToDay, 0), daysInMonth);
  const acc = newAccumulator();
  for (let d = 1; d <= lastDay; d++) {
    const day = simulateDay(new Date(year, month, d));
    accumulate(acc, day);
  }
  return finalize(acc, {
    year,
    month,
    energyRatePerKwh,
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    label: MONTH_LABELS[month]
  });
}

export function buildHistory({ energyRatePerKwh = 0.25, months = 12, now = new Date() } = {}) {
  const list = [];
  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const isCurrent = ref.getFullYear() === now.getFullYear() && ref.getMonth() === now.getMonth();
    list.push(
      buildMonth({
        year: ref.getFullYear(),
        month: ref.getMonth(),
        energyRatePerKwh,
        upToDay: isCurrent ? Math.max(0, now.getDate() - 1) : null
      })
    );
  }
  return list;
}

export function liveSample(hourFloat, random = Math.random, surge = 1) {
  const byDepartment = [];
  let kva = 0;
  let kw = 0;
  let units = 0;
  let auxKva = 0;

  for (const dept of DEPARTMENTS) {
    let dKva = 0;
    let dKw = 0;
    let dUnits = 0;
    let dAux = 0;
    const workshops = [];
    for (const w of dept.workshops) {
      const shape = shapeAt(w.shape, hourFloat);
      const jitter = 0.95 + random() * 0.1;
      const wKva = w.peakKva * UTILIZATION * shape * jitter * surge;
      dKva += wKva;
      dKw += wKva * w.pf;
      if (w.kwhPerUnit) {
        const wUnits = (wKva * w.pf) / w.kwhPerUnit;
        dUnits += wUnits;
        workshops.push({
          id: w.id,
          name: w.name,
          kva: round2(wKva),
          pf: w.pf,
          kwhPerUnit: w.kwhPerUnit,
          unitsPerHour: round1(wUnits)
        });
      } else {
        dAux += wKva;
        workshops.push({ id: w.id, name: w.name, kva: round2(wKva), pf: w.pf, kwhPerUnit: null, unitsPerHour: null });
      }
    }
    kva += dKva;
    kw += dKw;
    units += dUnits;
    auxKva += dAux;
    byDepartment.push({
      id: dept.id,
      name: dept.name,
      color: dept.color,
      rgb: dept.rgb,
      kva: round2(dKva),
      kw: round2(dKw),
      pf: dKva > 0 ? round3(dKw / dKva) : 0,
      unitsPerHour: round1(dUnits),
      auxiliaryKva: round2(dAux),
      kwhPerUnit: dUnits > 0 ? round3((dKw * 1) / dUnits) : null,
      workshops
    });
  }

  return {
    hour: hourFloat,
    kva: round2(kva),
    kw: round2(kw),
    pf: kva > 0 ? round3(kw / kva) : 0,
    unitsPerHour: round1(units),
    auxiliaryKva: round2(auxKva),
    byDepartment,
    profile: SHAPES.production
  };
}

export function plantProfile(year, month) {
  const seasonal = seasonalFactor(month, 1);
  return SHAPES.production.map((v) => round3(v * seasonal * UTILIZATION));
}
