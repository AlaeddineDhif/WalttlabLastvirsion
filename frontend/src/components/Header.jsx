import { Menu, Timer, PlugZap, Gauge } from 'lucide-react';
import ModeSwitcher from './ModeSwitcher';
import { clockNow, fmt } from '../lib/format';

/**
 * The pill reports the data feed, not the transport. A broker can hold a healthy
 * MQTT session while the ESP32 has stopped publishing, so a green "Connected"
 * beside frozen gauges would be a lie.
 */
const FEED_STATUS = {
  live: { cls: 'border-energy-200 bg-energy-50 text-energy-700', dot: 'bg-energy-500', label: 'Live' },
  simulated: { cls: 'border-brand-200 bg-brand-50 text-brand-700', dot: 'bg-brand-500', label: 'Simulated' },
  waiting: { cls: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Waiting' },
  stale: { cls: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500', label: 'No data' },
  disconnected: { cls: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500', label: 'Server down' }
};

function Readout({ icon: Icon, children, title }) {
  return (
    <span
      title={title}
      className="hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-slate-600 tabular lg:flex"
    >
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      {children}
    </span>
  );
}

/**
 * Global application toolbar. Orientation, feed state and global controls live
 * here; the page's own title and actions belong to each page's header, so a
 * title is never printed twice.
 */
export default function Header({ broker, demo, clock, metrics, feed, onToggleDemo, onOpenSidebar, mode, onModeChange }) {
  const s = FEED_STATUS[feed?.status] || FEED_STATUS.waiting;
  const simActive = demo || feed?.isSimulated;
  const pf = metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={onOpenSidebar}
            aria-label="Open navigation"
            className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Readout icon={PlugZap} title="Active power">
            {metrics.power == null ? '--' : fmt(metrics.power / 1000, 1)} kW
          </Readout>
          <Readout icon={Gauge} title="Power factor">
            cos φ {pf == null ? '--' : fmt(pf, 2)}
          </Readout>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <ModeSwitcher mode={mode} onModeChange={onModeChange} />

          <span className="hidden h-5 w-px bg-slate-200 sm:block"></span>

          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${s.cls}`}
            title={`Broker: ${broker.state}${feed?.ageSec != null ? ` · last packet ${feed.ageSec}s ago` : ''}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`}></span>
            <span>{s.label}</span>
          </span>

          <Readout icon={Timer} title="Server clock">
            {clockNow(clock)}
          </Readout>

          <button
            onClick={onToggleDemo}
            title="Toggle the virtual-plant generator on the server"
            className={`hidden items-center gap-2 rounded-md border px-2.5 py-1 text-[11px] font-medium transition sm:flex ${
              simActive
                ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${simActive ? 'bg-brand-500' : 'bg-slate-400'}`}></span>
            {simActive ? 'Demo feed' : 'Live MQTT'}
          </button>
        </div>
      </div>
    </header>
  );
}
