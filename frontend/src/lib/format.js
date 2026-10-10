export function fmt(v, d = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return Number(v).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d
  });
}

function pad(n) {
  return n < 10 ? '0' + n : String(n);
}

export function formatTime(iso) {
  if (!iso) return '--:--:--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--:--';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function clockNow(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function fmtDT(v, d = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-- DT';
  return `${fmt(v, d)} DT`;
}

export function fmtKwh(v, d = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-- kWh';
  return `${fmt(v, d)} kWh`;
}

export function fmtKwhUnit(v, d = 3) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return `${fmt(v, d)} kWh/pc`;
}

export function fmtDTUnit(v, d = 3) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return `${fmt(v, d)} DT/pc`;
}

export function fmtTnd(v, d = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-- TND';
  return `${fmt(v, d)} TND`;
}

export function fmtTndUnit(v, d = 3) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return `${fmt(v, d)} TND/pc`;
}

export function fmtPct(v, d = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return `${fmt(v * 100, d)}%`;
}

export function fmtKva(v, d = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-- kVA';
  return `${fmt(v, d)} kVA`;
}

/** Reactive power. */
export function fmtKvar(v, d = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-- kvar';
  return `${fmt(v, d)} kvar`;
}

/** Reactive energy — the unit the tariff is actually priced in. */
export function fmtKvarh(v, d = 1) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '-- kvarh';
  return `${fmt(v, d)} kvarh`;
}

/** A power factor: three decimals, since 0.742 and 0.74 are not the same reading. */
export function fmtCosPhi(v, d = 3) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '--';
  return fmt(v, d);
}

export function fmtDate(iso, seconds = false) {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  const datePart = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}${seconds ? ':' + pad(d.getSeconds()) : ''}`;
  return `${datePart} ${timePart}`;
}