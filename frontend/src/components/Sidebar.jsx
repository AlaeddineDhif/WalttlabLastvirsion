import { Zap, LogOut, ShieldCheck, PanelLeftClose, RadioTower } from 'lucide-react';
import { getNav } from '../lib/nav';
import { findMode } from '../lib/modes';
import BrandLogo from './BrandLogo';
import {
  BRAND_NAVY,
  BRAND_NAVY_TINT,
  BRAND_CYAN,
  BRAND_CYAN_RGB,
  BRAND_CYAN_INK
} from '../lib/brand';

export default function Sidebar({
  view,
  onNavigate,
  onLogout,
  user,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  demo,
  mode
}) {
  const nav = getNav(mode);
  const modeDef = findMode(mode);
  const ModeIcon = modeDef?.icon || Zap;

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-ink/50 lg:hidden" onClick={onClose}></div>}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[80px]' : 'lg:w-[248px]'} w-[248px]`}
        style={{ background: '#334155', color: '#CBD5E1', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Brand */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 px-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <BrandLogo size={collapsed ? 'sidebarCollapsed' : 'sidebar'} plate />
          <div className={`min-w-0 leading-tight ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="truncate text-[13px] font-semibold tracking-tight" style={{ color: '#FFFFFF' }}>
              WatLab
            </h1>
            <p className="truncate text-[9px] uppercase tracking-[0.14em]" style={{ color: '#94A3B8' }}>
              Energy management
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {/* Active mode */}
          <div
            className={`mb-3 rounded-md px-2.5 py-2 ${collapsed ? 'lg:hidden' : ''}`}
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#526277', borderRadius: '12px' }}
          >
            <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: '#F8FAFC' }}>
              <ModeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: '#CBD5E1' }} />
              <span className="truncate">{modeDef?.label || 'Live IoT Mode'}</span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] leading-4" style={{ color: '#94A3B8' }}>
              {modeDef?.tagline}
            </p>
          </div>

          <p
            className={`mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''}`}
            style={{ color: '#94A3B8' }}
          >
            Modules
          </p>

          <ul className="space-y-0.5">
            {nav.map((item) => {
              const active = item.id === view;
              const Icon = item.icon;
              const children = item.children || [];
              const childActive = children.some((c) => c.id === view);
              const openGroup = children.length > 0 && (active || childActive);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className="group relative flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition"
                    style={{
                      borderRadius: '10px',
                      ...(active
                        ? { background: '#DEEBF7', color: BRAND_NAVY, fontWeight: 600 }
                        : childActive
                          ? { background: BRAND_NAVY_TINT, color: '#F8FAFC' }
                          : { color: '#CBD5E1', background: 'transparent' })
                    }}
                    onMouseEnter={(e) => {
                      if (!active && !childActive) {
                        e.currentTarget.style.background = `rgba(${BRAND_CYAN_RGB},0.14)`;
                        e.currentTarget.style.color = '#FFFFFF';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) icon.style.color = BRAND_CYAN;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active && !childActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#CBD5E1';
                        const icon = e.currentTarget.querySelector('svg');
                        if (icon) icon.style.color = '#CBD5E1';
                      }
                    }}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 transition"
                      style={{
                        color: active ? BRAND_NAVY : childActive ? BRAND_CYAN : '#CBD5E1'
                      }}
                    />
                    <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                      <span className="block truncate text-[12.5px] leading-tight">
                        {item.label}
                      </span>
                    </span>
                  </button>

                  {openGroup && (
                    <ul
                      aria-label={`Sous-sections ${item.label}`}
                      className={`ml-4 mt-0.5 space-y-0.5 pl-2.5 ${collapsed ? 'lg:hidden' : ''}`}
                      style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      {children.map((child) => {
                        const cActive = child.id === view;
                        const CIcon = child.icon;
                        return (
                          <li key={child.id}>
                            <button
                              onClick={() => onNavigate(child.id)}
                              title={child.label}
                              aria-current={cActive ? 'page' : undefined}
                              className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition"
                              style={{
                                borderRadius: '10px',
                                ...(cActive
                                  ? { background: '#DEEBF7', color: BRAND_NAVY, fontWeight: 600 }
                                  : { color: '#CBD5E1', background: 'transparent' })
                              }}
                              onMouseEnter={(e) => {
                                if (!cActive) {
                                  e.currentTarget.style.background = `rgba(${BRAND_CYAN_RGB},0.14)`;
                                  e.currentTarget.style.color = '#FFFFFF';
                                  const icon = e.currentTarget.querySelector('svg');
                                  if (icon) icon.style.color = BRAND_CYAN;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!cActive) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#CBD5E1';
                                  const icon = e.currentTarget.querySelector('svg');
                                  if (icon) icon.style.color = '#CBD5E1';
                                }
                              }}
                            >
                              <CIcon
                                className="h-3.5 w-3.5 shrink-0 transition"
                                style={{ color: cActive ? BRAND_NAVY : '#CBD5E1' }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[11.5px] leading-tight">
                                {child.label}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Feed source */}
          <div className="mt-5">
            <p
              className={`mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider ${collapsed ? 'lg:hidden' : ''}`}
              style={{ color: '#94A3B8' }}
            >
              Feed source
            </p>
            <div
              className={`px-2.5 py-2 ${collapsed ? 'lg:hidden' : ''}`}
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#526277', borderRadius: '12px' }}
            >
              {modeDef?.id === 'analytics' ? (
                <>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: '#94A3B8' }}>
                    <RadioTower className="h-3.5 w-3.5" style={{ color: '#94A3B8' }} />
                    No source connected
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] leading-4" style={{ color: '#94A3B8' }}>
                    Historical dataset only
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: '#F8FAFC' }}>
                    <span className={`h-1.5 w-1.5 rounded-full ${demo ? 'bg-accent-400' : 'bg-amber-400'}`} />
                    {demo ? 'Virtual plant' : 'Live MQTT'}
                  </div>
                  <p className="mt-0.5 font-mono text-[10px] leading-4" style={{ color: '#94A3B8' }}>
                    {demo ? 'Simulated departmental workload' : 'Broker telemetry'}
                  </p>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Account + controls */}
        <div className="shrink-0 space-y-2 p-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            className={`flex items-center gap-2.5 px-2.5 py-2 ${collapsed ? 'lg:hidden' : ''}`}
            style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#526277', borderRadius: '12px' }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ background: '#526277' }}>
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: '#CBD5E1' }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-medium" style={{ color: '#F8FAFC' }}>
                {user?.displayName || 'Energy Manager'}
              </p>
              <p className="truncate font-mono text-[9px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                {user?.role || 'viewer'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium transition"
              style={{ color: '#CBD5E1', background: '#526277', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563EB';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#526277';
                e.currentTarget.style.color = '#CBD5E1';
              }}
            >
              <PanelLeftClose className={`h-3.5 w-3.5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
              <span className={collapsed ? 'lg:hidden' : ''}>Collapse</span>
            </button>
            <button
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center justify-center rounded-md px-2.5 py-1.5 transition"
              style={{ color: '#CBD5E1', background: '#334155', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                e.currentTarget.style.color = '#FCA5A5';
                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#526277';
                e.currentTarget.style.color = '#CBD5E1';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function SidebarSpacer({ collapsed }) {
  const width = collapsed ? 'lg:w-[80px]' : 'lg:w-[248px]';
  return <div className={`hidden lg:block ${width}`} aria-hidden="true" />;
}
