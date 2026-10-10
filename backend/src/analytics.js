const round2 = (n) => Math.round(n * 100) / 100;

function demandKva(packet) {
  if (!packet || typeof packet !== 'object') return null;
  const cosPhi = packet.cosPhi == null ? null : Math.abs(packet.cosPhi);
  if (packet.power != null && cosPhi != null && Number.isFinite(packet.power) && cosPhi > 0.05) {
    return packet.power / 1000 / cosPhi;
  }
  if (packet.power != null && Number.isFinite(packet.power)) {
    return packet.power / 1000;
  }
  if (packet.voltage != null && packet.current != null && Number.isFinite(packet.voltage) && Number.isFinite(packet.current)) {
    return (Math.sqrt(3) * packet.voltage * packet.current) / 1000;
  }
  return null;
}

export class Analytics {
  constructor({ contractedPower = 150 } = {}) {
    this.subscribedPower = contractedPower;
    this.peakKva = 0;
    this.peakPacket = null;
  }

  observe(packet) {
    const kva = demandKva(packet);
    if (kva != null && kva > this.peakKva) {
      this.peakKva = kva;
      this.peakPacket = packet;
    }
  }

  setSubscription(power) {
    if (Number.isFinite(power) && power > 0) this.subscribedPower = power;
  }

  resetPeak() {
    this.peakKva = 0;
    this.peakPacket = null;
  }

  get peak() {
    return {
      kva: round2(this.peakKva),
      at: this.peakPacket ? this.peakPacket.ts : null
    };
  }
}

export const demandKvaOf = demandKva;