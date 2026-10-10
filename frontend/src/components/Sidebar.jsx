import { Zap, LogOut, ShieldCheck, PanelLeftClose, ChevronRight } from 'lucide-react';
import { getNav } from '../lib/nav';
import { findMode } from '../lib/modes';

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
      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={onClose}></div>}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white transition-all duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'} w-[260px]`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-card">
            <Zap className="h-5 w-5 text-sky-400" />
          </div>
          <div className={`min-w-0 leading-tight ${collapsed ? 'lg:hidden' : ''}`}>
            <h1 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">
              WattLab <span className="font-medium text-slate-500">EMS</span>
            </h1>
            <p className="truncate text-[10px] font-medium tracking-wide text-slate-500">
              Energy Management System
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div
            className={`mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
              <ModeIcon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: modeDef?.id === 'live' ? '#059669' : '#4338ca' }}
              />
              <span className="truncate">{modeDef?.label || 'Live IoT Mode'}</span>
            </div>
            <p className="mt-1 font-mono text-[10px] leading-4 text-slate-500">
              {modeDef?.tagline}
            </p>
          </div>

          <p
            className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${
              collapsed ? 'lg:hidden' : ''
            }`}
          >
            Modules
          </p>
          <ul className="space-y-1">
            {nav.map((item) => {
              const active = item.id === view;
              const Icon = item.icon;
              const children = item.children || [];
              // The group opens when it is selected itself, or when one of its
              // sub-sections is: clicking the parent reveals its sub-menu.
              const childActive = children.some((c) => c.id === view);
              const open = children.length > 0 && (active || childActive);
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                      active
                        ? 'bg-slate-900 text-white shadow-card'
                        : childActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={active ? { background: 'rgba(255,255,255,0.12)' } : { background: `${item.accent}14` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: active ? '#ffffff' : item.accent }}
                      />
                    </span>
                    <span className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
                      <span className="block truncate text-[12px] font-semibold leading-tight">{item.label}</span>
                      <span
                        className={`mt-0.5 block truncate text-[10px] leading-tight ${
                          active ? 'text-slate-300' : 'text-slate-400'
                        } ${collapsed ? 'lg:hidden' : ''}`}
                      >
                        {item.description}
                      </span>
                    </span>
                    {active && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                  </button>

                  {open && (
                    <ul
                      aria-label={`Sous-sections ${item.label}`}
                      className={`ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-3 ${
                        collapsed ? 'lg:hidden' : ''
                      }`}
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
                              className={`flex w-full items-center gap-2 rounded-md py-1.5 pl-1.5 pr-2 text-left transition ${
                                cActive
                                  ? 'bg-white text-slate-900 shadow-card ring-1 ring-slate-200'
                                  : 'text-slate-500 hover:bg-white hover:text-slate-800'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className="h-3.5 w-0.5 shrink-0 rounded-full"
                                style={{ background: cActive ? child.accent : '#cbd5e1' }}
                              />
                              <CIcon
                                className="h-3.5 w-3.5 shrink-0"
                                style={{ color: cActive ? child.accent : 'currentColor' }}
                              />
                              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight">
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

          <div className="mt-6">
            <p
              className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              Feed source
            </p>
            <div
              className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${collapsed ? 'lg:hidden' : ''}`}
            >
              {modeDef?.id === 'analytics' ? (
                <>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                    Aucune source branchée
                  </div>
                  <p className="mt-1 font-mono text-[10px] leading-4 text-slate-500">
                    Modules réservés · relevés en attente
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
                    <span
                      className={`h-2 w-2 rounded-full pulse-dot ${
                        demo ? 'bg-sky-500' : 'bg-slate-400'
                      }`}
                    ></span>
                    {demo ? 'Virtual plant' : 'Live MQTT'}
                  </div>
                  <p className="mt-1 font-mono text-[10px] leading-4 text-slate-500">
                    {demo ? 'Simulated departmental workload' : 'Broker telemetry only'}
                  </p>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="shrink-0 space-y-2 border-t border-slate-200 p-3">
          <div className={`flex items-center gap-2 rounded-lg bg-slate-50 p-2 ${collapsed ? 'lg:hidden' : ''}`}>
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-slate-700">
                {user?.displayName || 'Energy Manager'}
              </p>
              <p className="truncate font-mono text-[9px] text-slate-400">{user?.role || 'viewer'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleCollapse}
              title={collapsed ? 'Expand menu' : 'Collapse menu'}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
              <span className={collapsed ? 'lg:hidden' : ''}>Collapse</span>
            </button>
            <button
              onClick={onLogout}
              title="Sign out"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
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
  return <div className={`hidden shrink-0 lg:block ${collapsed ? 'lg:w-[76px]' : 'lg:w-[260px]'}`}></div>;
}
