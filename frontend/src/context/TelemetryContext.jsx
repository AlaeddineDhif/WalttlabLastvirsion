import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiFetch } from '../lib/api';
import { METRICS } from '../lib/metrics';

const HISTORY_LIMIT = 120;
const PENALTY_THRESHOLD = 0.85;
const NO_LOAD_AMP = 0.05;

/**
 * A packet is considered dead when nothing has arrived for this long. The ESP32
 * telemetry cadence is well under this, so a silent feed means the hardware or
 * the broker is gone rather than merely slow.
 */
export const FEED_STALE_MS = 10000;

export { NO_LOAD_AMP };

const EMPTY_METRICS = Object.fromEntries(METRICS.map((m) => [m.key, null]));
const EMPTY_CHARTS = Object.fromEntries(METRICS.map((m) => [m.key, []]));

const CHART_MAP = {
  voltage: (p) => ({ t: p.ts, v: p.voltage }),
  current: (p) => ({ t: p.ts, v: p.current }),
  power: (p) => ({ t: p.ts, v: p.power == null ? null : p.power / 1000 }),
  energy: (p) => ({ t: p.ts, v: p.energy }),
  frequency: (p) => ({ t: p.ts, v: p.frequency }),
  cosPhi: (p) => ({ t: p.ts, v: p.cosPhi == null ? null : Math.abs(p.cosPhi) })
};

const TelemetryContext = createContext(null);

function pickMetrics(p) {
  const out = {};
  for (const key of Object.keys(EMPTY_METRICS)) {
    if (p[key] != null) out[key] = p[key];
  }
  return out;
}

export function TelemetryProvider({ children }) {
  const [broker, setBroker] = useState({
    state: 'connecting',
    messageCount: 0,
    lastMessageAt: null,
    broker: null,
    topic: null,
    clientId: null
  });
  const [demo, setDemo] = useState(true);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [charts, setCharts] = useState(EMPTY_CHARTS);
  const [packet, setPacket] = useState(null);
  const [clock, setClock] = useState(() => new Date());
  const [penalty, setPenalty] = useState({ active: false, since: null, duration: null });

  // Feed provenance. `src` comes from the packet itself, which is the only
  // authoritative signal: the demo-status event is not rebroadcast when the
  // backend auto-pauses the simulator on the first live packet.
  const [socketUp, setSocketUp] = useState(false);
  const [lastRxAt, setLastRxAt] = useState(null);
  const [src, setSrc] = useState(null);

  const penaltySinceRef = useRef(null);

  useEffect(() => {
    const socket = io({ path: '/socket.io' });

    socket.on('connect', () => setSocketUp(true));
    socket.on('disconnect', () => setSocketUp(false));
    socket.on('connect_error', () => setSocketUp(false));
    socket.on('broker-status', (state) => setBroker(state));
    socket.on('demo-status', setDemo);
    socket.on('telemetry', (p) => {
      setPacket(p);
      setLastRxAt(Date.now());
      setSrc(p?.src === 'demo' ? 'demo' : 'mqtt');
      setMetrics((prev) => ({ ...prev, ...pickMetrics(p) }));
      setCharts((prev) => {
        const next = {};
        for (const key of Object.keys(CHART_MAP)) {
          const pt = CHART_MAP[key](p);
          next[key] = pt.v == null ? prev[key] : [...prev[key], pt].slice(-HISTORY_LIMIT);
        }
        return next;
      });
    });

    return () => socket.disconnect();
  }, []);

  /**
   * Derived feed state. This is the single source of truth for "are these numbers
   * real?", so no page has to re-derive liveness from a frozen value.
   */
  const feed = useMemo(() => {
    const ageMs = lastRxAt == null ? null : clock.getTime() - lastRxAt;
    const base = { src, ageMs, ageSec: ageMs == null ? null : Math.max(0, Math.round(ageMs / 1000)) };

    if (!socketUp) {
      return { ...base, status: 'disconnected', isLive: false, isSimulated: false, isFrozen: true };
    }
    if (lastRxAt == null) {
      return {
        ...base,
        status: 'waiting',
        isLive: false,
        isSimulated: false,
        isFrozen: false
      };
    }
    if (ageMs >= FEED_STALE_MS) {
      return { ...base, status: 'stale', isLive: false, isSimulated: false, isFrozen: true };
    }
    if (src === 'demo') {
      return { ...base, status: 'simulated', isLive: false, isSimulated: true, isFrozen: false };
    }
    return { ...base, status: 'live', isLive: true, isSimulated: false, isFrozen: false };
  }, [socketUp, lastRxAt, src, clock]);

  // A frozen reading must not keep asserting an active power-factor penalty.
  useEffect(() => {
    if (feed.isFrozen) {
      penaltySinceRef.current = null;
      setPenalty({ active: false, since: null, duration: null });
      return;
    }
    const pf = metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi);
    const loaded = Math.abs(metrics.current || 0) > NO_LOAD_AMP;
    const active = pf !== null && loaded && pf < PENALTY_THRESHOLD;
    if (active && penaltySinceRef.current === null) penaltySinceRef.current = Date.now();
    if (!active) penaltySinceRef.current = null;
    setPenalty((prev) => ({
      active,
      since: penaltySinceRef.current,
      duration: active ? Math.max(0, Math.round((Date.now() - penaltySinceRef.current) / 1000)) : null
    }));
  }, [metrics.cosPhi, metrics.current, feed.isFrozen]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date());
      if (penaltySinceRef.current) {
        setPenalty((prev) =>
          prev.active
            ? { ...prev, duration: Math.max(0, Math.round((Date.now() - penaltySinceRef.current) / 1000)) }
            : prev
        );
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleDemo = useCallback(async () => {
    try {
      const res = await apiFetch('/api/demo', { method: 'POST' });
      const data = await res.json();
      setDemo(Boolean(data.demo));
    } catch {
      /* keep local state */
    }
  }, []);

  const value = useMemo(
    () => ({ broker, demo, metrics, charts, packet, penalty, clock, feed, toggleDemo }),
    [broker, demo, metrics, charts, packet, penalty, clock, feed, toggleDemo]
  );

  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error('useTelemetry must be used inside a TelemetryProvider.');
  return ctx;
}
