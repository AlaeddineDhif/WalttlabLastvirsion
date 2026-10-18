const SIZES = {
  sidebar: 'h-8', // 32px
  sidebarCollapsed: 'h-7', // 28px
  header: 'h-8', // 32px
  login: 'h-12', // 48px
  invoice: 'h-9' // 36px
};

/**
 * The official WatLab logo, served from `public/` so the path is a bare site
 * URL. It is never recoloured, stretched or redrawn: one file, object-contain,
 * an explicit height per placement, and alt text that names the product.
 *
 * `plate` puts it on a small white tile — the logo is navy line art, so dark
 * chrome (the sidebar, the video login) needs the neutral backing to keep it
 * legible. Light surfaces can drop the plate.
 */
export default function BrandLogo({ size = 'sidebar', plate = false, className = '' }) {
  const mark = (
    <img
      src="/watlablog.png"
      alt="WatLab logo"
      className={`${SIZES[size] || SIZES.sidebar} w-auto object-contain`}
    />
  );

  if (!plate) return <span className={`inline-flex shrink-0 items-center ${className}`}>{mark}</span>;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md bg-white p-1 ${className}`}
    >
      {mark}
    </span>
  );
}
