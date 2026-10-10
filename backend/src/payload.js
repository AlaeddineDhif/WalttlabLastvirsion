const ALIASES = {
  voltage: ['voltage', 'v', 'volt', 'u'],
  current: ['current', 'i', 'amp', 'amps', 'current_a'],
  power: ['power', 'activepower', 'active_power', 'p', 'w', 'kw', 'pw'],
  energy: ['energy', 'kwh', 'energ', 'meter', 'energy_kwh'],
  frequency: ['frequency', 'freq', 'f', 'hz'],
  cosPhi: ['cosphi', 'cos_phi', 'cos-phi', 'pf', 'powerfactor', 'power_factor', 'phi']
};

function scalar(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      if (/value|val|magnitude|ScaledValue|normal/i.test(k)) {
        const r = scalar(v[k]);
        if (r !== null) return r;
      }
    }
  }
  return null;
}

function walkKeys(obj, key) {
  let found = null;
  const go = (o) => {
    if (!o || typeof o !== 'object' || found !== null) return;
    const low = key.toLowerCase();
    if (typeof o[low] !== 'undefined') {
      found = o[low];
      return;
    }
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'object') go(o[k]);
    }
  };
  go(obj);
  return found;
}

export function extractValues(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  for (const param of Object.keys(ALIASES)) {
    for (const alias of ALIASES[param]) {
      const v = walkKeys(obj, alias);
      if (v !== null && v !== undefined) {
        const num = scalar(v);
        if (num !== null) {
          out[param] = num;
          break;
        }
      }
    }
  }
  return out;
}

export function parsePayload(text) {
  let obj = null;
  try {
    obj = JSON.parse(text);
  } catch {
    obj = null;
  }
  if (obj && typeof obj === 'object') {
    if (obj.data && typeof obj.data === 'object') obj = obj.data;
    return { obj, text };
  }
  const pairs = {};
  text.split(',').forEach((seg) => {
    const m = /^\s*([^:=]+)[:=]\s*([^,:]+?)\s*$/.exec(seg);
    if (m) pairs[m[1].trim().toLowerCase()] = parseFloat(m[2].replace(',', '.'));
  });
  if (Object.keys(pairs).length) return { obj: pairs, text };
  return { obj: null, text };
}