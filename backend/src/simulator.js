import { EventEmitter } from 'node:events';
import { liveSample, simulateDay, monthDemandFactor, INSTALLED_KVA, EFFECTIVE_KVA, DEPARTMENTS } from './workload.js';

const VOLTAGE_BASE = 400;
const VOLTAGE_SWING = 3.5;
const VOLTAGE_NOISE = 5;
const FREQUENCY_BASE = 50.02;
const FREQUENCY_NOISE = 0.06;
const REACTIVE_PERIOD = 240;
const REACTIVE_DEPTH = 0.1;
const REACTIVE_WIDTH = 0.0072;
const SURGE_WALK_MIN = 0.94;
const SURGE_WALK_SPAN = 0.18;
const SURGE_REVERT = 0.12;

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

export class Simulator extends EventEmitter {
  constructor({ intervalMs = 1600, initialEnergy = 450000, initialUnits = 480000 } = {}) {
    super();
    this.intervalMs = intervalMs;
    this.timer = null;
    this.running = false;
    this.t = 0;
    this.energy = initialEnergy;
    this.units = initialUnits;
    this.surge = 1;
    this.lastPacket = null;
    this.lastSample = null;
    this.dayEnergy = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 0]));
    this.dayUnits = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 0]));
    this.dayKey = this._dayKey(new Date());
  }

  _dayKey(date) {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  _rollDay(now) {
    const key = this._dayKey(now);
    if (key === this.dayKey) return;
    this.dayKey = key;
    this.dayEnergy = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 0]));
    this.dayUnits = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 0]));
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.timer = setInterval(() => this.step(), this.intervalMs);
    this.step();
    return this;
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    return this;
  }

  isRunning() {
    return this.running;
  }

  _reactiveFactor() {
    const phase = (this.t % REACTIVE_PERIOD) / REACTIVE_PERIOD;
    const excursion = Math.exp(-((phase - 0.5) ** 2) / REACTIVE_WIDTH);
    return 1 - REACTIVE_DEPTH * excursion;
  }

  step() {
    this.t += this.intervalMs / 1000;
    const now = new Date();
    this._rollDay(now);

    this.surge += (Math.random() - 0.5) * 0.05 - (this.surge - 1) * SURGE_REVERT;
    this.surge = clamp(this.surge, SURGE_WALK_MIN, SURGE_WALK_MIN + SURGE_WALK_SPAN);

    const hourFloat = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const sample = liveSample(hourFloat, Math.random, this.surge);
    this.lastSample = sample;

    const reactive = this._reactiveFactor();
    const cosPhi = clamp(sample.pf * reactive, 0.72, 0.99);
    const voltage = VOLTAGE_BASE + VOLTAGE_SWING * Math.sin(this.t / 9) + (Math.random() - 0.5) * VOLTAGE_NOISE;
    const current = (sample.kva * 1000) / (Math.sqrt(3) * voltage);
    const power = sample.kw * 1000 * reactive;

    const hours = this.intervalMs / 3600000;
    this.energy += sample.kw * hours;
    this.units += sample.unitsPerHour * hours;
    for (const dept of sample.byDepartment) {
      this.dayEnergy[dept.id] += dept.kw * hours;
      this.dayUnits[dept.id] += dept.unitsPerHour * hours;
    }

    const frequency = FREQUENCY_BASE + (Math.random() - 0.5) * FREQUENCY_NOISE;
    const leading = this._leadingWorkshop(sample);

    const packet = {
      ts: now.toISOString(),
      src: 'demo',
      topic: null,
      raw: null,
      voltage: Number(voltage.toFixed(2)),
      current: Number(current.toFixed(3)),
      power: Number(power.toFixed(2)),
      energy: Number(this.energy.toFixed(3)),
      frequency: Number(frequency.toFixed(3)),
      cosPhi: Number(cosPhi.toFixed(3)),
      kva: Number(sample.kva.toFixed(2)),
      units: Math.round(this.units),
      department: leading ? leading.departmentId : null,
      workshop: leading ? leading.id : null,
      departmentName: leading ? (sample.byDepartment.find((d) => d.id === leading.departmentId) || {}).name || null : null,
      workshopName: leading ? leading.name : null
    };
    this.lastPacket = packet;
    this.emit('telemetry', packet);
  }

  _leadingWorkshop(sample) {
    let best = null;
    let bestKva = 0;
    for (const dept of sample.byDepartment) {
      for (const w of dept.workshops) {
        if (w.unitsPerHour != null && w.unitsPerHour > bestKva) {
          bestKva = w.unitsPerHour;
          best = { id: w.id, departmentId: dept.id, name: w.name };
        }
      }
    }
    return best;
  }

  plant() {
    const sample = this.lastSample;
    const now = new Date();
    const today = simulateDay(now);
    const todayEnergy = {};
    for (const dept of DEPARTMENTS) {
      const slot = today.byDepartment[dept.id];
      let sum = 0;
      for (let h = 0; h < 24; h++) sum += slot.kwh[h];
      todayEnergy[dept.id] = Number(sum.toFixed(2));
    }

    return {
      running: this.running,
      intervalMs: this.intervalMs,
      installedKva: INSTALLED_KVA,
      effectiveKva: EFFECTIVE_KVA,
      utilization: EFFECTIVE_KVA / INSTALLED_KVA,
      demand: monthDemandFactor(now),
      season: now.getMonth(),
      surge: Number(this.surge.toFixed(3)),
      energy: Number(this.energy.toFixed(3)),
      units: Math.round(this.units),
      dayEnergy: Object.fromEntries(
        Object.entries(this.dayEnergy).map(([k, v]) => [k, Number(v.toFixed(2))])
      ),
      dayUnits: Object.fromEntries(Object.entries(this.dayUnits).map(([k, v]) => [k, Math.round(v)])),
      modelledDayEnergy: todayEnergy,
      departments: DEPARTMENTS,
      profile: sample ? sample.profile : [],
      live: sample
    };
  }
}
