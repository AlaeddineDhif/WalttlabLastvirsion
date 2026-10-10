/**
 * mulberry32 — a 32-bit PRNG in a dozen lines, and the reason every simulated
 * dashboard in this app looks identical on every reload.
 *
 * It is seeded explicitly, never from the clock: a screenshot taken during a
 * defence has to match the screen in front of the examiner. Shared from one place
 * so a change to the generator can never make two modules drift apart.
 */
export function seeded(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function round1(v) {
  return Math.round(v * 10) / 10;
}

export function round2(v) {
  return Math.round(v * 100) / 100;
}
