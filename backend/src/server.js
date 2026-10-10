import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { store } from './store.js';
import { MqttBroker } from './mqtt/broker.js';
import { Simulator } from './simulator.js';
import { attachSocket, CLIENT_EVENTS } from './socket.js';
import { createApi } from './routes/api.js';
import { Analytics } from './analytics.js';
import { ProductionStore } from './production.js';
import { EnergyHistory } from './history.js';

const app = express();
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true
  })
);
app.use(express.json());

const server = http.createServer(app);
const io = attachSocket(server);

const steg = config.steg;
const broker = new MqttBroker();
const analytics = new Analytics({ contractedPower: steg.contractedPowerDefault });
const history = new EnergyHistory({
  energyRatePerKwh: steg.energyRatePerKwh,
  months: config.workload.historyMonths,
  subscribedPower: steg.contractedPowerDefault,
  tariff: steg
});
const production = new ProductionStore({
  energyRatePerKwh: steg.energyRatePerKwh,
  seedDays: config.demo.seedDays
});
const simulator = new Simulator({
  intervalMs: config.demo.intervalMs,
  initialEnergy: history.lifetimeKwh() * 2.2,
  initialUnits: 480000
});

const publish = (packet) => {
  store.push(packet);
  analytics.observe(packet);
  history.observe(packet);
  io.emit(CLIENT_EVENTS.telemetry, packet);
};

broker.on('telemetry', (packet) => {
  if (simulator.isRunning()) simulator.stop();
  publish(packet);
});

broker.on('status', (status) => io.emit(CLIENT_EVENTS.brokerStatus, status));

simulator.on('telemetry', publish);

app.use('/api', createApi({ broker, simulator, store, analytics, production, history }));

io.on('connection', (socket) => {
  socket.emit(CLIENT_EVENTS.brokerStatus, broker.status);
  socket.emit(CLIENT_EVENTS.demoStatus, simulator.isRunning());
  if (store.latest) socket.emit(CLIENT_EVENTS.telemetry, store.latest);
});

server.listen(config.port, () => {
  console.log(`[wattlab] REST + Socket.io listening on http://localhost:${config.port}`);
  broker.connect();
  if (config.demo.enabled) {
    simulator.start();
    console.log('[wattlab] Demo telemetry feed started (auto-pauses on live MQTT packets)');
  }
});

const shutdown = () => {
  simulator.stop();
  broker.end();
  io.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);