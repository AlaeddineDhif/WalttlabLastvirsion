import { DEPARTMENTS, simulateDay, monthLabel } from './workload.js';

const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;
const DAY_MS = 86400e3;

const WORKSHOP_INDEX = (() => {
  const index = {};
  for (const dept of DEPARTMENTS) {
    for (const w of dept.workshops) {
      index[w.id] = {
        ...w,
        departmentId: dept.id,
        departmentName: dept.name,
        color: dept.color,
        rgb: dept.rgb
      };
    }
  }
  return index;
})();

const DEPT_INDEX = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));

export function workshopMeta(id) {
  return WORKSHOP_INDEX[id] || null;
}

export function departmentMeta(id) {
  return DEPT_INDEX[id] || null;
}

export class ProductionStore {
  constructor({ energyRatePerKwh = 0.25, seedDays = 180, now = new Date() } = {}) {
    this.energyRatePerKwh = energyRatePerKwh;
    this.records = [];
    this.batch = null;
    this.seq = 1;
    this._now = now.getTime();
    this._seed(seedDays, now);
  }

  _record({ label, units, energyKwh, startedAt, completedAt, departmentId = null, workshopId = null, auxiliary = false }) {
    const cost = round2(energyKwh * this.energyRatePerKwh);
    const meta = workshopMeta(workshopId);
    const produced = Math.round(Number(units));
    return {
      id: this.seq++,
      label: label || meta?.name || 'Unlabelled batch',
      departmentId: departmentId || meta?.departmentId || null,
      workshopId: workshopId || null,
      auxiliary,
      units: produced,
      energyKwh: round2(energyKwh),
      cost,
      unitCost: produced > 0 ? round3(cost / produced) : null,
      kwhPerUnit: produced > 0 ? round3(energyKwh / produced) : null,
      startedAt,
      completedAt
    };
  }

  _seed(seedDays, now) {
    for (let back = seedDays - 1; back >= 0; back--) {
      const date = new Date(now.getTime() - back * DAY_MS);
      const day = simulateDay(date);
      for (const dept of DEPARTMENTS) {
        for (const w of dept.workshops) {
          const slot = day.byWorkshop[w.id];
          this.pushRecord({
            label: w.name,
            units: slot.units,
            energyKwh: slot.kwh,
            departmentId: dept.id,
            workshopId: w.id,
            auxiliary: !w.kwhPerUnit,
            startedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString(),
            completedAt: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 30, 0).toISOString()
          });
        }
      }
    }
  }

  pushRecord({ label, units, energyKwh, startedAt, completedAt, departmentId, workshopId, auxiliary = false }) {
    const qty = Number(units);
    if (!Number.isFinite(qty) || !Number.isFinite(Number(energyKwh))) return null;
    if (auxiliary ? qty < 0 : qty <= 0) return null;
    const record = this._record({
      label,
      units: qty,
      energyKwh,
      departmentId,
      workshopId,
      auxiliary,
      startedAt: startedAt || new Date().toISOString(),
      completedAt: completedAt || new Date().toISOString()
    });
    this.records.unshift(record);
    return record;
  }

  startBatch(label, startEnergy, scope = {}) {
    if (this.batch) return { error: 'A production batch is already running.' };
    const meta = workshopMeta(scope.workshopId);
    this.batch = {
      id: this.seq++,
      label: label || `Shift ${new Date().toLocaleDateString('fr-TN')}`,
      departmentId: scope.departmentId || meta?.departmentId || null,
      workshopId: scope.workshopId || null,
      startedAt: new Date().toISOString(),
      startEnergy: startEnergy == null ? null : Number(startEnergy),
      currentEnergy: startEnergy == null ? null : Number(startEnergy)
    };
    return { batch: this.batch };
  }

  updateBatchEnergy(latestEnergy) {
    if (this.batch && latestEnergy != null && Number.isFinite(Number(latestEnergy))) {
      this.batch.currentEnergy = Number(latestEnergy);
    }
    return this.batch;
  }

  completeBatch(units, energyKwhOverride, latestEnergy) {
    if (!this.batch) return { error: 'No active production batch found.' };
    if (!units || Number(units) <= 0) return { error: 'Units produced must be a positive number.' };

    const endEnergy =
      energyKwhOverride != null && Number.isFinite(Number(energyKwhOverride))
        ? Number(energyKwhOverride)
        : latestEnergy != null && Number.isFinite(Number(latestEnergy))
          ? Number(latestEnergy)
          : this.batch.currentEnergy;
    const delta =
      endEnergy != null && this.batch.startEnergy != null && Number.isFinite(this.batch.startEnergy)
        ? Math.max(0, endEnergy - this.batch.startEnergy)
        : null;

    if (delta == null) {
      return { error: 'Energy meter is unavailable for this batch — provide a manual kWh value.', batch: this.batch };
    }

    const record = this.pushRecord({
      label: this.batch.label,
      units,
      energyKwh: delta,
      departmentId: this.batch.departmentId,
      workshopId: this.batch.workshopId,
      startedAt: this.batch.startedAt,
      completedAt: new Date().toISOString()
    });
    this.batch = null;
    return { record };
  }

  get summary() {
    const totalUnits = this.records.reduce((acc, r) => acc + r.units, 0);
    const totalEnergyKwh = round2(this.records.reduce((acc, r) => acc + r.energyKwh, 0));
    const totalCost = round2(this.records.reduce((acc, r) => acc + r.cost, 0));
    return {
      totalUnits,
      totalEnergyKwh,
      totalCost,
      avgUnitCost: totalUnits > 0 ? round3(totalCost / totalUnits) : null,
      kwhPerUnit: totalUnits > 0 ? round3(totalEnergyKwh / totalUnits) : null
    };
  }

  _inWindow(record, days) {
    if (days == null) return true;
    const t = new Date(record.completedAt).getTime();
    if (Number.isNaN(t)) return false;
    return t >= this._now - days * DAY_MS;
  }

  costReport({ departmentId = null, workshopId = null, days = 30, now = new Date() } = {}) {
    this._now = now.getTime();
    const window = this.records.filter((r) => this._inWindow(r, days));

    const workshopBuckets = new Map();
    const departmentBuckets = new Map();
    const monthBuckets = new Map();
    for (const dept of DEPARTMENTS) {
      departmentBuckets.set(dept.id, { units: 0, energyKwh: 0, records: 0 });
      for (const w of dept.workshops) workshopBuckets.set(w.id, { units: 0, energyKwh: 0, records: 0 });
    }

    const totals = { units: 0, energyKwh: 0, cost: 0, records: 0 };
    for (const r of window) {
      const inScope = workshopId ? r.workshopId === workshopId : departmentId ? r.departmentId === departmentId : true;

      const ws = workshopBuckets.get(r.workshopId);
      if (ws) {
        ws.units += r.units;
        ws.energyKwh += r.energyKwh;
        ws.records += 1;
      }
      const dp = departmentBuckets.get(r.departmentId);
      if (dp) {
        dp.units += r.units;
        dp.energyKwh += r.energyKwh;
        dp.records += 1;
      }

      if (!inScope) continue;

      totals.units += r.units;
      totals.energyKwh += r.energyKwh;
      totals.records += 1;

      const d = new Date(r.completedAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthBuckets.has(key)) {
        monthBuckets.set(key, {
          key,
          label: monthLabel(d.getMonth()),
          year: d.getFullYear(),
          month: d.getMonth(),
          units: 0,
          energyKwh: 0
        });
      }
      const m = monthBuckets.get(key);
      m.units += r.units;
      m.energyKwh += r.energyKwh;
    }

    totals.energyKwh = round2(totals.energyKwh);
    totals.cost = round2(totals.energyKwh * this.energyRatePerKwh);
    totals.kwhPerUnit = totals.units > 0 ? round3(totals.energyKwh / totals.units) : null;
    totals.dtPerUnit = totals.units > 0 ? round3(totals.cost / totals.units) : null;

    const priced = (units, energyKwh) => ({
      units,
      energyKwh: round2(energyKwh),
      cost: round2(round2(energyKwh) * this.energyRatePerKwh),
      kwhPerUnit: units > 0 ? round3(round2(energyKwh) / units) : null,
      dtPerUnit: units > 0 ? round3((round2(energyKwh) * this.energyRatePerKwh) / units) : null
    });

    const byWorkshop = DEPARTMENTS.flatMap((dept) =>
      dept.workshops.map((w) => ({
        id: w.id,
        name: w.name,
        departmentId: dept.id,
        departmentName: dept.name,
        color: dept.color,
        rgb: dept.rgb,
        shape: w.shape,
        ratedKva: w.peakKva,
        pf: w.pf,
        auxiliary: !w.kwhPerUnit,
        records: workshopBuckets.get(w.id).records,
        ...priced(workshopBuckets.get(w.id).units, workshopBuckets.get(w.id).energyKwh)
      }))
    );

    const byDepartment = DEPARTMENTS.map((dept) => {
      const b = departmentBuckets.get(dept.id);
      return {
        id: dept.id,
        name: dept.name,
        color: dept.color,
        rgb: dept.rgb,
        records: b.records,
        ...priced(b.units, b.energyKwh)
      };
    });

    const byMonth = [...monthBuckets.values()]
      .sort((a, b) => (a.key < b.key ? 1 : -1))
      .map((m) => ({ ...m, ...priced(m.units, m.energyKwh) }));

    const productive = byWorkshop.filter((w) => w.kwhPerUnit != null);
    const ranked = [...productive].sort((a, b) => a.kwhPerUnit - b.kwhPerUnit);
    const baseline = totals.kwhPerUnit;

    for (const w of byWorkshop) {
      w.vsAverage = w.kwhPerUnit != null && baseline != null ? round3(w.kwhPerUnit - baseline) : null;
      w.excessCost =
        w.vsAverage != null && w.vsAverage > 0 ? round2(w.vsAverage * w.units * this.energyRatePerKwh) : 0;
    }

    return {
      energyRatePerKwh: this.energyRatePerKwh,
      windowDays: days,
      scope: {
        departmentId,
        workshopId,
        department: departmentMeta(departmentId),
        workshop: workshopMeta(workshopId)
      },
      totals,
      byWorkshop,
      byDepartment,
      byMonth,
      mostEfficient: ranked[0] || null,
      leastEfficient: ranked[ranked.length - 1] || null,
      outlierCost: round2(byWorkshop.reduce((a, w) => a + w.excessCost, 0)),
      bestPracticeGap: ranked.length ? round3(ranked[ranked.length - 1].kwhPerUnit - ranked[0].kwhPerUnit) : 0
    };
  }

  snapshot(latestEnergy) {
    this.updateBatchEnergy(latestEnergy);
    const summary = this.summary;
    const live = {};
    if (this.batch) {
      live.active = true;
      live.id = this.batch.id;
      live.label = this.batch.label;
      live.departmentId = this.batch.departmentId;
      live.workshopId = this.batch.workshopId;
      live.workshop = workshopMeta(this.batch.workshopId);
      live.department = departmentMeta(this.batch.departmentId);
      live.startedAt = this.batch.startedAt;
      live.startEnergy = this.batch.startEnergy;
      live.currentEnergy = this.batch.currentEnergy;
      live.energyConsumed =
        live.startEnergy != null && live.currentEnergy != null && Number.isFinite(live.startEnergy)
          ? round2(Math.max(0, live.currentEnergy - live.startEnergy))
          : null;
    } else {
      live.active = false;
    }
    return {
      energyRatePerKwh: this.energyRatePerKwh,
      batch: live,
      records: this.records.slice(0, 20),
      summary,
      departments: DEPARTMENTS
    };
  }
}
