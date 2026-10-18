import { useEffect, useState } from 'react';
import Sidebar, { SidebarSpacer } from './Sidebar';
import Header from './Header';
import FeedBanner, { hasFeedNotice } from './FeedBanner';
import PenaltyBanner from './PenaltyBanner';
import { useTelemetry } from '../context/TelemetryContext';

export default function AppShell({
  view,
  onNavigate,
  onLogout,
  user,
  mode,
  onModeChange,
  children
}) {
  const { broker, demo, metrics, clock, toggleDemo, penalty, feed } = useTelemetry();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('wattlab.sidebar') === 'collapsed';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setDrawer(false);
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem('wattlab.sidebar', collapsed ? 'collapsed' : 'expanded');
    } catch {
      /* storage unavailable */
    }
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        view={view}
        onNavigate={onNavigate}
        onLogout={onLogout}
        user={user}
        open={drawer}
        onClose={() => setDrawer(false)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        demo={demo}
        mode={mode}
      />
      <SidebarSpacer collapsed={collapsed} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          broker={broker}
          demo={demo}
          clock={clock}
          metrics={metrics}
          onToggleDemo={toggleDemo}
          onOpenSidebar={() => setDrawer(true)}
          feed={feed}
          mode={mode}
          onModeChange={onModeChange}
        />

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-7">
          {/* The offline state is a live-mode concern: analytics mode reads a
              historical dataset and never depends on the device. */}
          {mode === 'live' && hasFeedNotice(feed) && (
            <div className="mb-4">
              <FeedBanner feed={feed} broker={broker} />
            </div>
          )}
          {penalty.active && (
            <div className="mb-4">
              <PenaltyBanner
                active
                embedded
                value={metrics.cosPhi == null ? null : Math.abs(metrics.cosPhi)}
                duration={penalty.duration}
              />
            </div>
          )}
          <div className="page-enter">{children}</div>
        </main>

        <footer className="mt-auto border-t border-slate-200 px-4 py-3.5 text-[10px] tracking-wide text-slate-400 sm:px-6 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-slate-500">
              WatLab — Energy Management System
            </span>
            <span className="font-mono">telemetry via MQTT · billing via STEG tariff model</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
