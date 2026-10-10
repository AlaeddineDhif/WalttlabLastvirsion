import 'dotenv/config';

const env = process.env;

function required(name) {
  const value = env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. See backend/.env.example.`
    );
  }
  return value;
}

export const config = {
  port: Number(env.PORT || 4000),
  corsOrigin: env.CORS_ORIGIN || '*',
  historyLimit: Number(env.HISTORY_LIMIT || 240),
  mqtt: {
    url: env.MQTT_URL || '',
    username: env.MQTT_USERNAME || '',
    password: env.MQTT_PASSWORD || '',
    topic: env.MQTT_TOPIC || 'wattlab/telemetry',
    clientId:
      env.MQTT_CLIENT_ID ||
      'wattlab_backend_' + Math.random().toString(16).slice(2, 8)
  },
  demo: {
    enabled: env.DEMO_ENABLED !== 'false',
    intervalMs: Number(env.DEMO_INTERVAL_MS || 1600),
    seedDays: Number(env.DEMO_SEED_DAYS || 180)
  },
  workload: {
    historyMonths: Number(env.WORKLOAD_HISTORY_MONTHS || 12)
  },
  auth: {
    username: required('AUTH_USERNAME'),
    password: required('AUTH_PASSWORD'),
    tokenSecret: required('AUTH_SECRET'),
    tokenTtlMs: Number(env.AUTH_TOKEN_TTL_MS || 8 * 60 * 60 * 1000),
    role: 'industrial-energy-manager',
    displayName: 'Industrial Energy Manager'
  },
  steg: {
    currency: env.STEG_CURRENCY || 'DT',
    primeRatePerKvaPerMonth: Number(env.STEG_PRIME_RATE_DT_KVA_MONTH || 8.4),
    energyRatePerKwh: Number(env.STEG_ENERGY_RATE_DT_KWH || 0.25),
    penaltyRatePerKvaPerMonth: Number(env.STEG_PENALTY_RATE_DT_KVA_MONTH || 12.5),
    tolerance: Number(env.STEG_TOLERANCE || 0.1),
    contractedPowerDefault: Number(env.STEG_CONTRACTED_POWER || 150),
    tranches: env.STEG_TRANCHES
      ? env.STEG_TRANCHES.split(',').map((t) => Number(t.trim())).filter(Boolean)
      : [50, 100, 150, 200, 250, 300, 400, 500, 630, 800, 1000, 1250, 1600]
  }
};