import { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Gauge,
  Lock,
  ShieldCheck,
  TriangleAlert,
  User,
  Wifi,
  Zap
} from 'lucide-react';

const SPECS = [
  { icon: Wifi, label: 'MQTT', sub: 'telemetry 1 Hz' },
  { icon: Activity, label: 'Socket.io', sub: 'live push' },
  { icon: Gauge, label: 'STEG', sub: 'tariff audit' },
  { icon: Cpu, label: 'ESP32', sub: 'edge meter' }
];

const FIELD =
  'w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100';

export default function Login({ onLogin, error, loading }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [deviceImage, setDeviceImage] = useState(true);

  const submit = (e) => {
    e.preventDefault();
    onLogin(username.trim(), password);
  };

  const fillDefaults = () => {
    setUsername('admin');
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 grid-drift"></div>
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-emerald-200/40 blur-[120px]"></div>
        <div className="absolute -bottom-32 right-0 h-[380px] w-[380px] rounded-full bg-teal-200/40 blur-[120px]"></div>
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-16">
        <section className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot"></span>
            Edge telemetry · STEG tariff engine
          </span>

          <h1 className="mt-5 text-[2.4rem] font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-[2.8rem] xl:text-[3.1rem]">
            Welcome to{' '}
            <span className="title-gradient-light">Energy Management System</span>
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-500">
            Edge measurements from the ESP32 smart meter, streamed over MQTT and turned into
            supervision, tariff audit and unit-cost intelligence.
          </p>

          <div className="group relative mt-9 flex justify-center lg:justify-start">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="neon-pulse absolute h-64 w-64 rounded-full border border-emerald-300/60"></div>
              <div className="neon-pulse absolute h-80 w-80 rounded-full border border-teal-200"></div>
            </div>

            <div className="float-device relative">
              <div className="device-tilt relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                <div className="pointer-events-none absolute inset-0 z-10">
                  <div className="sweep h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent"></div>
                </div>
                {deviceImage ? (
                  <img
                    src="/wattlab-device.png"
                    alt="WattLab edge energy meter"
                    onError={() => setDeviceImage(false)}
                    className="relative h-64 w-full object-contain"
                  />
                ) : (
                  <div className="relative h-64 w-full">
                    <DeviceMockup />
                  </div>
                )}
                <div className="relative mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="font-mono text-[10px] text-slate-500">WattLab Edge Meter</span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-dot"></span>
                    online
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-9 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {SPECS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-card"
              >
                <Icon className="h-3.5 w-3.5 text-emerald-600" />
                <p className="mt-1.5 text-[11px] font-bold text-slate-800">{label}</p>
                <p className="font-mono text-[9px] text-slate-400">{sub}</p>
              </div>
            ))}
          </div>
        </section>

        <main className="w-full min-w-0">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 shadow-card">
                <Zap className="h-5 w-5 text-emerald-400" />
              </span>
              <div className="leading-tight">
                <p className="text-[15px] font-extrabold tracking-tight text-slate-900">
                  WattLab <span className="font-medium text-slate-500">EMS</span>
                </p>
                <p className="text-[10px] font-medium tracking-wide text-slate-500">
                  Industrial Energy Management System
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-card">
              <div className="mb-5 h-1 w-12 rounded-full bg-emerald-600"></div>

              <h2 className="text-lg font-bold text-slate-900">Sign in to console</h2>
              <p className="mt-1 text-sm text-slate-500">
                Authenticate to access live energy intelligence.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Username
                  </span>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={FIELD}
                      placeholder="admin"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={reveal ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${FIELD} pr-11`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setReveal((r) => !r)}
                      aria-label={reveal ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:text-emerald-600"
                    >
                      {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !username || !password}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold tracking-wide text-white shadow-card transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={fillDefaults}
              className="mt-4 flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-card transition hover:border-emerald-300"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1 text-[11px] leading-5 text-slate-500">
                <span className="font-semibold text-slate-700">Role:</span> Industrial Energy
                Manager. Credentials are set in{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                  backend/.env
                </code>
              </span>
              <span className="mt-0.5 shrink-0 text-[9px] font-bold uppercase tracking-wider text-emerald-600">
                Fill user
              </span>
            </button>

            <p className="mt-6 text-center text-[10px] tracking-wider text-slate-400">
              MQTT · REST · Socket.io · STEG Tariff Intelligence
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function DeviceMockup() {
  const terminals = ['L', 'N', 'CT+', 'CT-', 'S', 'T'];

  return (
    <svg
      viewBox="0 0 220 300"
      className="h-full w-full"
      role="img"
      aria-label="WattLab edge energy meter"
    >
      <defs>
        <linearGradient id="wl-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
        <linearGradient id="wl-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#052e26" />
          <stop offset="100%" stopColor="#021a16" />
        </linearGradient>
        <linearGradient id="wl-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <rect x="14" y="10" width="192" height="280" rx="16" fill="url(#wl-body)" stroke="#cbd5e1" strokeWidth="1.5" />
      <rect x="14" y="10" width="192" height="4" rx="2" fill="url(#wl-edge)" />

      <text x="32" y="44" fill="#e2e8f0" fontSize="13" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.4">
        WattLab
      </text>
      <text x="188" y="44" fill="#64748b" fontSize="8" textAnchor="end" fontFamily="JetBrains Mono, monospace">
        ESP32
      </text>

      <rect x="28" y="56" width="164" height="86" rx="8" fill="url(#wl-screen)" stroke="#10b981" strokeOpacity="0.45" />
      <text x="40" y="78" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono, monospace">
        384.2 V
      </text>
      <text x="40" y="96" fill="#22d3ee" fontSize="11" fontFamily="JetBrains Mono, monospace">
        12.47 A
      </text>
      <text x="40" y="117" fill="#a7f3d0" fontSize="13" fontWeight="700" fontFamily="JetBrains Mono, monospace">
        2.314 kW
      </text>
      <text x="180" y="78" fill="#34d399" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono, monospace">
        cosφ 0.94
      </text>
      <rect x="40" y="124" width="140" height="6" rx="3" fill="#064e3b" />
      <rect x="40" y="124" width="96" height="6" rx="3" fill="#34d399" />

      <circle cx="44" cy="164" r="9" fill="#34d399" opacity="0.2" className="neon-pulse" style={{ transformOrigin: '44px 164px' }} />
      <circle cx="44" cy="164" r="4.5" fill="#34d399" />
      <text x="58" y="167" fill="#94a3b8" fontSize="8" fontFamily="Inter, sans-serif">
        MQTT LINK
      </text>
      <circle cx="140" cy="164" r="4.5" fill="#22d3ee" />
      <text x="152" y="167" fill="#94a3b8" fontSize="8" fontFamily="Inter, sans-serif">
        LIVE
      </text>

      <rect x="28" y="186" width="164" height="54" rx="8" fill="#0b1220" stroke="#1e293b" />
      {terminals.map((label, i) => (
        <g key={label}>
          <text x={48 + i * 26} y="200" fill="#475569" fontSize="6.5" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
            {label}
          </text>
          <rect x={38 + i * 26} y="204" width="20" height="30" rx="4" fill="#111c30" stroke="#334155" />
          <circle cx={48 + i * 26} cy="213" r="3.2" fill="#64748b" />
          <circle cx={48 + i * 26} cy="225" r="3.2" fill="#64748b" />
        </g>
      ))}

      <rect x="28" y="250" width="164" height="30" rx="8" fill="#0b1220" stroke="#1e293b" />
      <circle cx="48" cy="265" r="11" fill="none" stroke="#334155" strokeWidth="3" />
      <circle cx="48" cy="265" r="4" fill="#020617" />
      <text x="66" y="262" fill="#94a3b8" fontSize="7.5" fontFamily="Inter, sans-serif">
        Current clamp
      </text>
      <text x="66" y="273" fill="#475569" fontSize="7" fontFamily="JetBrains Mono, monospace">
        100 A CT
      </text>

      <text x="110" y="288" fill="#334155" fontSize="7" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
        DIN RAIL · 230V 50Hz
      </text>
    </svg>
  );
}
