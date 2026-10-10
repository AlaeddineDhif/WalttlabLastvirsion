import { Menu, Timer, PlugZap, Bolt, Gauge } from 'lucide-react';
import ModeSwitcher from './ModeSwitcher';
import { clockNow, fmt, formatTime } from '../lib/format';

const STATUS = {
  connected: { cls: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Connected' },
  connecting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Connecting' },
  reconnecting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Reconnecting' },
  offline: { cls: 'border-slate-300 bg-slate-100 text-slate-500', dot: 'bg-slate-400', label: 'Offline' },
  error: { cls: 'border-rose-300 bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Error' }
};

/**
 * The pill reports the data feed, not the transport. A broker can hold a healthy
 * MQTT session while the ESP32 has stopped publishing, so a green "Connected"
 * beside frozen gauges would be a lie.
 */
const FEED_STATUS = {
  live: { cls: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Live' },
  simulated: { cls: 'border-sky-300 bg-sky-50 text-sky-700', dot: 'bg-sky-500', label: 'Simulated' },
  waiting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Waiting' },
  stale: { cls: 'border-rose-300 bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'No data' },
  disconnected: { cls: 'border-rose-300 bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Server down' }
};

export default function Header({
  page,
  broker,
  demo,
  clock,
  metrics,
  feed,
  onToggleDemo,
  onOpenSidebar,
  mode,
  onModeChange
}) {
  const brokerState = STATUS[broker.state] || STATUS.connecting;
  const s = FEED_STATUS[feed?.status] || brokerState;
  const simActive = demo || feed?.isSimulated;
  const pf = metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex"
            style={{ background: `${page.accent}14` }}
          >
            <page.icon className="h-4 w-4" style={{ color: page.accent }} />
          </span>
          <div className="min-w-0 leading-tight">
            <h2 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">{page.label}</h2>
            <p className="truncate text-[10px] font-medium tracking-wide text-slate-500">{page.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <ModeSwitcher mode={mode} onModeChange={onModeChange} />

          <span className="hidden h-6 w-px bg-slate-200 sm:block"></span>

          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 tracking-wide ${s.cls}`}
            title={`Broker: ${brokerState.label}${feed?.ageSec != null ? ` · last packet ${feed.ageSec}s ago` : ''}`}
          >
            <span className={`h-2 w-2 rounded-full ${s.dot} pulse-dot`}></span>
            <span>{s.label}</span>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 lg:flex">
            <Bolt className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular">{metrics.power == null ? '--' : fmt(metrics.power / 1000, 1)} kW</span>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 md:flex">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular">cos φ {pf == null ? '--' : fmt(pf, 2)}</span>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 md:flex">
            <PlugZap className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular">{fmt(broker.messageCount || 0, 0)} msg</span>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 xl:flex">
            <Timer className="h-3.5 w-3.5 text-slate-400" />
            <span className="tabular">{formatTime(broker.lastMessageAt)}</span>
          </div>

          <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-500 sm:flex">
            <span className="tabular">{clockNow(clock)}</span>
          </div>

          <button
            onClick={onToggleDemo}
            title="Toggle the virtual-plant generator on the server"
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-semibold tracking-wide transition ${
              simActive
                ? 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className={`h-2 w-2 rounded-full pulse-dot ${simActive ? 'bg-sky-500' : 'bg-slate-400'}`}></span>
            {simActive ? 'Demo feed' : 'Live MQTT'}
          </button>
        </div>
      </div>
    </header>
  );
}
