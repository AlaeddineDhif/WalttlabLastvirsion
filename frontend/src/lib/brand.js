/**
 * Brand palette, derived from the official WatLab logo (`/watlablog.png`).
 *
 * The logo carries exactly two inks: a deep navy (~50% of its pixels) and a
 * light cyan (~40%). Every accent used by charts and inline styles comes from
 * this module, so a chart can never drift back to an unrelated blue.
 *
 * The same two hues drive the `brand` scale in `tailwind.config.js`; keep the
 * base values in step when one side changes.
 */

/** Logo navy — the identity colour. Buttons, main chart series, focus. */
export const BRAND_NAVY = '#023867';
/** Navy at hover strength (brand-700). */
export const BRAND_NAVY_STRONG = '#032D51';
/** Navy at soft/fill strength (brand-500) — accessible on white, not on dark. */
export const BRAND_NAVY_MID = '#0559A3';
/** Navy 10% — tinted fills behind brand content. */
export const BRAND_NAVY_TINT = 'rgba(2, 56, 103, 0.10)';

/** Logo cyan — the quiet accent (brand-400). Decorative fills only. */
export const BRAND_CYAN = '#79CBCD';
/** Cyan as an `r, g, b` triplet for rgba() fills. */
export const BRAND_CYAN_RGB = '121, 203, 205';
/** Cyan at accent strength (brand-700) — the lightest cyan legible on white. */
export const BRAND_CYAN_INK = '#2D8C8F';

/**
 * Chart series defaults. Main series in navy, comparison in cyan, previous
 * periods in neutral grey; green/amber/red stay reserved for semantic states.
 */
export const CHART_PRIMARY = BRAND_NAVY;
export const CHART_PRIMARY_RGB = '2, 56, 103';
export const CHART_SECONDARY = BRAND_CYAN_INK;
export const CHART_SECONDARY_RGB = '45, 140, 143';
export const CHART_MUTED = '#94a3b8';
export const CHART_MUTED_RGB = '148, 163, 184';
