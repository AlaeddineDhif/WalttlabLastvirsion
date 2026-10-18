import { MODES } from '../lib/modes';

/**
 * Segmented switcher with a sliding pill. The two options live in a 2-column
 * grid so they always share the exact same width, which lets a single
 * translateX(100%) land the indicator precisely on the second column.
 */
export default function ModeSwitcher({ mode, onModeChange }) {
  const activeIndex = Math.max(
    0,
    MODES.findIndex((m) => m.id === mode)
  );

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:inline">
        Mode
      </span>
      <div
        role="tablist"
        aria-label="Operational mode"
        className="relative grid grid-cols-2 rounded-full border border-slate-200 bg-canvasAlt p-1"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full border border-brand-200 bg-white shadow-card transition-transform duration-300 ease-out"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = m.id === mode;
          return (
            <button
              key={m.id}
              role="tab"
              type="button"
              aria-selected={active}
              title={`${m.label} — ${m.tagline}`}
              onClick={() => onModeChange(m.id)}
              className={`relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors duration-200 ${
                active ? 'text-ink' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 transition-colors duration-200 ${
                  active ? 'text-brand-600' : 'text-slate-400'
                }`}
              />
              <span>{m.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
