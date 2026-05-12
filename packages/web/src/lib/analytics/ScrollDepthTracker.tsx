import { useEffect } from 'react';
import { track } from './track';

/**
 * Headless tracker that emits `scroll_depth` events at the
 * 25/50/75/100% milestones — one event per milestone per page load.
 *
 * Drop-in: mount once anywhere on a page (typically inside the
 * page composer). No DOM output. Listens to `window` scroll,
 * computes the deepest visible point as `% of scrollable height`,
 * and fires the milestone exactly once.
 *
 * Why milestones not raw depth: GA4 charts are easier to interpret
 * with discrete buckets, and Meta lookalike audiences need
 * categorical "engaged" signals not continuous scrolls.
 *
 * Performance: scroll listener throttled via requestAnimationFrame
 * so we don't fire a calculation on every pixel. Memory cost is
 * one boolean per milestone.
 */
export function ScrollDepthTracker() {
    useEffect(() => {
        const fired = new Set<number>();
        const milestones = [25, 50, 75, 100];
        let raf = 0;

        const compute = () => {
            const doc = document.documentElement;
            const scrollTop = window.scrollY || doc.scrollTop;
            const viewport = window.innerHeight || doc.clientHeight;
            const total = doc.scrollHeight - viewport;
            if (total <= 0) return;
            const pct = Math.min(100, Math.round(((scrollTop + viewport) / doc.scrollHeight) * 100));

            for (const m of milestones) {
                if (pct >= m && !fired.has(m)) {
                    fired.add(m);
                    track('scroll_depth', { milestone: m });
                }
            }
        };

        const onScroll = () => {
            if (raf) return;
            raf = window.requestAnimationFrame(() => {
                raf = 0;
                compute();
            });
        };

        // Fire once on mount in case the page is already past 25%
        // (e.g. anchor link landing).
        compute();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', onScroll);
            if (raf) window.cancelAnimationFrame(raf);
        };
    }, []);

    return null;
}
