import { buildHistory, DEPARTMENTS, monthLabel } from './workload.js';
import { demandKvaOf } from './analytics.js';

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const round3 = (n) => Math.round(n * 1000) / 1000;

const RESET_GUARD_KWH = 100000;

function emptyDepartment(dept) {
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

export class EnergyHistory {
  constructor({ energyRatePerKwh = 0.25, months = 12, subscribedPower = 150, tariff = {}, now = new Date() } = {}) {
    this.energyRatePerKwh = energyRatePerKwh;
    this.subscribedPower = subscribedPower;
    this.tariff = tariff;
    this.months = buildHistory({ energyRatePerKwh, months, now });
    this.currentKey = this.months.length ? this.months[this.months.length - 1].key : null;
    this.today = this._emptyDay(now);
  }

  _emptyDay(now) {
    return {
      date: now.toISOString().slice(0, 10),
      energyKwh: 0,
      cost: 0,
      units: 0,
      peakKva: 0,
      peakAt: null,
      lastEnergy: null,
      lastUnits: null,
      byDepartment: Object.fromEntries(DEPARTMENTS.map((d) => [d.id, emptyDepartment(d)]))
    };
  }

  setSubscription(power) {
    if (Number.isFinite(power) && power > 0) this.subscribedPower = power;
  }

  observe(packet) {
    if (!packet || typeof packet !== 'object') return;
    const energy = Number(packet.energy);
    if (Number.isFinite(energy)) {
      if (this.today.lastEnergy == null) {
        this.today.lastEnergy = energy;
      } else {
        const delta = energy - this.today.lastEnergy;
        if (delta > 0 && delta < RESET_GUARD_KWH) {
          this.today.energyKwh += delta;
          this.today.lastEnergy = energy;
        } else if (delta < 0) {
          this.today.lastEnergy = energy;
        }
      }
    }

    const units = Number(packet.units);
    if (Number.isFinite(units)) {
      if (this.today.lastUnits == null) {
        this.today.lastUnits = units;
      } else {
        const delta = units - this.today.lastUnits;
        if (delta > 0 && delta < 1e7) this.today.units += delta;
        this.today.lastUnits = units;
      }
    }

    const kva = demandKvaOf(packet);
    if (kva != null && kva > this.today.peakKva) {
      this.today.peakKva = kva;
      this.today.peakAt = packet.ts || new Date().toISOString();
    }
  }

  _liveMonth() {
    const base = this.months[this.months.length - 1];
    if (!base) return null;

    const byDepartment = base.byDepartment.map((seed) => {
      const live = this.today.byDepartment[seed.id];
      const energyKwh = round2(seed.energyKwh + live.energyKwh);
      return {
        ...seed,
        energyKwh,
        cost: round2(energyKwh * this.energyRatePerKwh),
        units: seed.units + live.units,
        peakKva: round1(Math.max(seed.peakKva, live.peakKva)),
        kwhPerUnit: seed.units + live.units > 0 ? round3(energyKwh / (seed.units + live.units)) : null,
        dtPerUnit:
          seed.units + live.units > 0
            ? round3((energyKwh * this.energyRatePerKwh) / (seed.units + live.units))
            : null
      };
    });

    const energyKwh = round2(base.energyKwh + this.today.energyKwh);
    const units = base.units + Math.round(this.today.units);

    return {
      ...base,
      energyKwh,
      cost: round2(energyKwh * this.energyRatePerKwh),
      units,
      days: base.days + 1,
      peakKva: round1(Math.max(base.peakKva, this.today.peakKva)),
      peakAt: this.today.peakKva >= base.peakKva ? this.today.peakAt : base.peakAt,
      kwhPerUnit: units > 0 ? round3(energyKwh / units) : null,
      dtPerUnit: units > 0 ? round3((energyKwh * this.energyRatePerKwh) / units) : null,
      partial: true,
      byDepartment
    };
  }

  _monthly(month) {
    const ps = this.subscribedPower;
    const tolerance = this.tariff.tolerance == null ? 0.1 : this.tariff.tolerance;
    const excess = round1(Math.max(0, month.peakKva - ps));
    const taxable = round1(Math.max(0, excess - ps * tolerance));
    const penaltyRate = this.tariff.penaltyRatePerKvaPerMonth == null ? 0 : this.tariff.penaltyRatePerKvaPerMonth;
    return {
      ...month,
      contractedPower: ps,
      excess,
      taxable,
      exceeded: month.peakKva > ps,
      utilization: ps > 0 ? round2(month.peakKva / ps) : 0,
      monthlyPrime: round2(ps * (this.tariff.primeRatePerKvaPerMonth || 0)),
      monthlyPenalty: round2(taxable * penaltyRate),
      headroom: round1(ps - month.peakKva)
    };
  }

  annual() {
    const ps = this.subscribedPower;
    const months = this.months.map((m) => this._monthly(m));
    const live = this._liveMonth();
    if (live) months[months.length - 1] = this._monthly(live);

    const totalEnergyKwh = round2(months.reduce((a, m) => a + m.energyKwh, 0));
    const totalCost = round2(months.reduce((a, m) => a + m.cost, 0));
    const units = months.reduce((a, m) => a + m.units, 0);
    const peakKva = months.reduce((a, m) => Math.max(a, m.peakKva), 0);
    const primeRate = this.tariff.primeRatePerKvaPerMonth == null ? 0 : this.tariff.primeRatePerKvaPerMonth;
    const penaltyRate = this.tariff.penaltyRatePerKvaPerMonth == null ? 0 : this.tariff.penaltyRatePerKvaPerMonth;
    const annualPenalty = round2(months.reduce((a, m) => a + m.monthlyPenalty, 0));
    const annualPrime = round2(ps * primeRate * 12);

    return {
      months,
      current: months[months.length - 1] || null,
      year: months.length ? months[months.length - 1].year : null,
      totalEnergyKwh,
      totalCost,
      units,
      peakKva,
      peakMonth: months.reduce((a, m) => (m.peakKva > (a ? a.peakKva : 0) ? m : a), null),
      monthsOver: months.filter((m) => m.exceeded).length,
      monthsPenalized: months.filter((m) => m.monthlyPenalty > 0).length,
      annualPenalty,
      annualPrime,
      annualTotal: round2(annualPrime + annualPenalty + totalCost),
      kwhPerUnit: units > 0 ? round3(totalEnergyKwh / units) : null,
      dtPerUnit: units > 0 ? round3(totalCost / units) : null,
      contractedPower: ps
    };
  }

  optimize() {
    const annual = this.annual();
    const tolerance = this.tariff.tolerance == null ? 0.1 : this.tariff.tolerance;
    const primeRate = this.tariff.primeRatePerKvaPerMonth || 0;
    const penaltyRate = this.tariff.penaltyRatePerKvaPerMonth || 0;
    const tranches = Array.isArray(this.tariff.tranches) && this.tariff.tranches.length ? this.tariff.tranches : [50, 100, 150, 200, 250, 300];

    const needed = annual.months.reduce((a, m) => Math.max(a, m.peakKva), 0);
    const candidates = Array.from(
      new Set([...tranches, Math.round(needed / 10) * 10, this.subscribedPower].map((v) => Math.max(10, Math.round(v))))
    ).sort((a, b) => a - b);

    const rows = candidates.map((ps) => {
      const annualPrime = round2(ps * primeRate * 12);
      let annualPenalty = 0;
      let monthsOver = 0;
      let worstTaxable = 0;
      for (const m of annual.months) {
        const taxable = Math.max(0, m.peakKva - ps * (1 + tolerance));
        if (m.peakKva > ps) monthsOver += 1;
        if (taxable > worstTaxable) worstTaxable = taxable;
        annualPenalty += taxable * penaltyRate;
      }
      annualPenalty = round2(annualPenalty);
      return {
        power: ps,
        annualPrime,
        annualPenalty,
        annualTotal: round2(annualPrime + annualPenalty),
        monthsOver,
        worstExcess: round1(worstTaxable),
        headroom: round1(ps - needed),
        utilization: needed > 0 ? round2(needed / ps) : 0
      };
    });

    const optimal = rows.reduce((a, b) => (b.annualTotal < a.annualTotal ? b : a), rows[0]);
    const current = rows.find((r) => r.power === Math.round(this.subscribedPower)) || null;
    const penaltyFree = rows.find((r) => r.annualPenalty === 0) || null;

    return {
      rows,
      optimal,
      current,
      penaltyFree,
      highestPeak: round1(needed),
      savings: current && optimal ? round2(current.annualTotal - optimal.annualTotal) : 0
    };
  }

  snapshot() {
    const annual = this.annual();
    return {
      subscribedPower: this.subscribedPower,
      energyRatePerKwh: this.energyRatePerKwh,
      today: {
        date: this.today.date,
        energyKwh: round2(this.today.energyKwh),
        units: Math.round(this.today.units),
        peakKva: round1(this.today.peakKva),
        peakAt: this.today.peakAt
      },
      ...annual
    };
  }

  lifetimeKwh() {
    return round2(this.months.reduce((a, m) => a + m.energyKwh, 0));
  }

  static monthLabel(monthIndex) {
    return monthLabel(monthIndex);
  }
}
