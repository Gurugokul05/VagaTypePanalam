/**
 * Route transition wrapper.
 *
 * `template.tsx` gets a unique key per route, so it remounts on every
 * navigation. The CSS animation replays each time, giving every page a
 * consistent fade/rise entrance without touching individual pages.
 * Respects prefers-reduced-motion via globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
