/**
 * Inline keyframes for the landing page hero "fade-up" entrance animation.
 *
 * Lives as a string injected via `<style>` (not in a global stylesheet) because
 * it's only used on the public landing page — keeping it scoped avoids polluting
 * the design system stylesheet for authenticated app surfaces.
 */
export const LANDING_STYLES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up {
  opacity: 0;
  animation: fadeUp 800ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
@media (prefers-reduced-motion: reduce) {
  .animate-fade-up { animation: none; opacity: 1; transform: none; }
}
`;
