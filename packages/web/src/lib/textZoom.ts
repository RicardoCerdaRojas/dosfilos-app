/**
 * Shared text-zoom primitives — pairs with the `.text-zoom-large` /
 * `.text-zoom-larger` CSS scopes in `index.css` and the `<TextZoomControl>`
 * UI primitive. Kept separate from the component so changing the helper
 * doesn't bust Vite's HMR-only-exports-components rule.
 */
export type TextZoomLevel = 1 | 2 | 3;

export function getTextZoomClass(level: TextZoomLevel): string {
    if (level === 3) return 'text-zoom-larger';
    if (level === 2) return 'text-zoom-large';
    return '';
}
