import { Router } from 'express';
import { config } from '../config.js';
import { signToken, validateCredentials, requireAuth } from '../auth.js';
import { computeAudit } from '../steg.js';

const round2 = (n) => Math.round(n * 100) / 100;

export function createApi({ broker, simulator, store, analytics, production, history }) {
  const router = Router();

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), ts: new Date().toISOString() });
  });

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!validateCredentials(username, password)) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = signToken({ sub: username, role: config.auth.role });
    res.json({
      token,
      user: {
        username,
        role: config.auth.role,
        displayName: config.auth.displayName
      }
    });
  });

  router.use(requireAuth);

  router.get('/status', (req, res) => {
    res.json({
      broker: broker.status,
      demo: simulator.isRunning(),
      messages: store.count,
      latest: store.latest
    });
  });

  router.get('/telemetry/latest', (req, res) => {
    res.json(store.latest || {});
  });

  router.get('/telemetry/history', (req, res) => {
    res.json(store.history);
  });

  router.post('/demo', (req, res) => {
    const requested =
      req.body && typeof req.body.enabled !== 'undefined' ? Boolean(req.body.enabled) : !simulator.isRunning();
    if (requested) simulator.start();
    else simulator.stop();
    res.json({ demo: simulator.isRunning() });
  });

  /* ---------------- STEG Tariff & Subscription Audit ---------------- */

  const auditFor = (contractedPower, peakPower) =>
    computeAudit({
      contractedPower,
      peakPower,
      primeRatePerKvaPerMonth: config.steg.primeRatePerKvaPerMonth,
      penaltyRatePerKvaPerMonth: config.steg.penaltyRatePerKvaPerMonth,
      tolerance: config.steg.tolerance,
      tranches: config.steg.tranches
    });

  const applySubscription = (power) => {
    analytics.setSubscription(power);
    history.setSubscription(analytics.subscribedPower);
  };

  router.get('/audit', (req, res) => {
    const steg = config.steg;
    res.json({
      contractedPower: analytics.subscribedPower,
      peak: analytics.peak,
      tariff: {
        currency: steg.currency,
        primeRatePerKvaPerMonth: steg.primeRatePerKvaPerMonth,
        penaltyRatePerKvaPerMonth: steg.penaltyRatePerKvaPerMonth,
        energyRatePerKwh: steg.energyRatePerKwh,
        tolerance: steg.tolerance,
        tranches: steg.tranches
      },
      audit: auditFor(analytics.subscribedPower, analytics.peakKva)
    });
  });

  router.post('/audit/subscription', (req, res) => {
    const requested = Number(req.body?.contractedPower);
    if (!Number.isFinite(requested) || requested <= 0) {
      return res.status(400).json({ error: 'contractedPower must be a positive number (kVA).' });
    }
    applySubscription(requested);
    res.json({
      contractedPower: analytics.subscribedPower,
      peak: analytics.peak,
      audit: auditFor(analytics.subscribedPower, analytics.peakKva)
    });
  });

  router.post('/audit/reset', (req, res) => {
    analytics.resetPeak();
    res.json({ ok: true, peak: analytics.peak });
  });

  router.get('/audit/history', (req, res) => {
    res.json({ ...history.snapshot(), optimization: history.optimize() });
  });

  /* ---------------- Production & Unit Energy Cost ---------------- */

  const withEnergy = (fn) => {
    const ctx = {
      latestEnergy: store.latest && Number.isFinite(Number(store.latest.energy)) ? Number(store.latest.energy) : null
    };
    return fn(ctx);
  };

  router.get('/production', (req, res) => {
    res.json(withEnergy((ctx) => production.snapshot(ctx.latestEnergy)));
  });

  router.get('/production/cost', (req, res) => {
    const days = Number(req.query.days);
    res.json(
      production.costReport({
        departmentId: req.query.department || null,
        workshopId: req.query.workshop || null,
        days: Number.isFinite(days) && days > 0 ? days : 90
      })
    );
  });

  router.post('/production/start', (req, res) => {
    const result = withEnergy((ctx) =>
      production.startBatch(req.body?.label, ctx.latestEnergy, {
        departmentId: req.body?.departmentId,
        workshopId: req.body?.workshopId
      })
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
  });

  router.post('/production/complete', (req, res) => {
    const units = Number(req.body?.units);
    const energyKwh =
      req.body?.energyKwh === undefined || req.body?.energyKwh === null || req.body?.energyKwh === ''
        ? undefined
        : Number(req.body.energyKwh);
    const result = withEnergy((ctx) => production.completeBatch(units, energyKwh, ctx.latestEnergy));
    if (result.error) return res.status(400).json(result);
    res.json(result);
  });

  router.post('/production/record', (req, res) => {
    const units = Number(req.body?.units);
    const energyKwh = Number(req.body?.energyKwh);
    if (!units || units <= 0 || !Number.isFinite(energyKwh) || energyKwh < 0) {
      return res.status(400).json({ error: 'units (pieces) and energyKwh are required.' });
    }
    const record = production.pushRecord({
      label: req.body?.label,
      units,
      energyKwh: round2(energyKwh),
      departmentId: req.body?.departmentId,
      workshopId: req.body?.workshopId,
      startedAt: req.body?.startedAt,
      completedAt: new Date().toISOString()
    });
    res.json({ record, snapshot: withEnergy((ctx) => production.snapshot(ctx.latestEnergy)) });
  });

  /* ---------------- Virtual Plant / Data Generator ---------------- */

  router.get('/workload', (req, res) => {
    res.json(simulator.plant());
  });

  return router;
}