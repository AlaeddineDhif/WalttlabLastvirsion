import { useEffect, useState } from 'react';
import Sidebar, { SidebarSpacer } from './Sidebar';
import Header from './Header';
import FeedBanner, { hasFeedNotice } from './FeedBanner';
import PenaltyBanner from './PenaltyBanner';
import { findNav, getDefaultView } from '../lib/nav';
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

  const page = findNav(view, mode) || findNav(getDefaultView(mode), mode);

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
    <div className="flex min-h-screen bg-slate-50">
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
          page={page}
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

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">
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
          {children}
        </main>

        <footer className="border-t border-slate-200 px-4 py-3 text-[10px] text-slate-400 sm:px-6">
          WattLab EMS — Tunisian industrial energy management · telemetry via MQTT, billing via STEG tariff model
        </footer>
      </div>
    </div>
  );
}
