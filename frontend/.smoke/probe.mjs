import * as d from "./probeout/probe.js";
const f = (v, n = 1) => v.toLocaleString("en-US", { minimumFractionDigits: n, maximumFractionDigits: n });
const over = d.puissanceData.DAILY.filter((x) => x.peakKva > d.puissanceData.CONTRACT.ps);
console.log("jours          :", d.puissanceData.DAILY.length);
console.log("depassements   :", over.length, "->", over.map((x) => x.date + " " + x.peakKva + "kVA").join(" | "));
console.log("tolérance kVA  :", d.puissanceData.TOLERANCE_KVA);
console.log("prime mois/an  :", d.puissanceData.PRIME_MONTHLY, "/", d.puissanceData.PRIME_ANNUAL);
console.log("pointe max     :", d.puissanceData.PEAK_DAY.date, d.puissanceData.PEAK_DAY.peakKva);
console.log("marge max safe :", d.puissanceData.HIGHEST_SAFE_DAY.date, d.puissanceData.HIGHEST_SAFE_DAY.peakKva, "headroom", d.puissanceData.HEADROOM);
console.log("moyenne pointe :", d.puissanceData.AVG_PEAK, "utilisation", (d.puissanceData.UTILISATION * 100).toFixed(1) + "%");
console.log("mois dépassés  :", d.puissanceData.MONTHLY.filter((m) => m.exceeded).map((m) => m.label).join(", "));
console.log("");
console.log("mois      jours  pointe   moyenne  depass");
for (const m of d.puissanceData.MONTHLY) {
  console.log("  " + m.label.padEnd(8) + String(m.days).padStart(4) + f(m.peakKva).padStart(10) + f(m.averageKva).padStart(10) + String(m.exceedances).padStart(8));
}
console.log("");
for (const e of d.puissanceData.DEPASSEMENT_EVENTS) {
  console.log(e.severity.toUpperCase(), "|", e.id, "|", e.dateLabel, e.timeLabel, "|", f(e.peakKva), "kVA | +" + f(e.overrunKva), "| facturable", f(e.taxableKva), "kVA =", f(e.penaltyPerMonth, 2), "DT/mois");
}
console.log("");
console.log("range des pointes:", f(Math.min(...d.puissanceData.DAILY.map(x=>x.peakKva))), "->", f(Math.max(...d.puissanceData.DAILY.map(x=>x.peakKva))), "kVA (Ps = 150)");