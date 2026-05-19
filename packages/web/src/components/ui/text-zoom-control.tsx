import { Type } from 'lucide-react';
import type { TextZoomLevel } from '@/lib/textZoom';

/**
 * Three-level A/A/A toggle that pairs with the `.text-zoom-large` /
 * `.text-zoom-larger` CSS scopes in `index.css`. Wrap the readable
 * region in `getTextZoomClass(level)` (from `@/lib/textZoom`) and
 * surface this control in the region's toolbar so the user can scale
 * body text without zooming the whole UI chrome (which collapses
 * sidebars).
 */
export function TextZoomControl({
    value,
    onChange,
    label,
    levelLabels,
    className,
}: {
    value: TextZoomLevel;
    onChange: (z: TextZoomLevel) => void;
    label: string;
    levelLabels: [string, string, string];
    className?: string;
}) {
    const sizeClass = ['text-xs', 'text-sm', 'text-base'] as const;
    return (
        <div
            className={
                'inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 p-0.5'
                + (className ? ` ${className}` : '')
            }
            role="group"
            aria-label={label}
            title={label}
        >
            <Type className="h-3.5 w-3.5 text-slate-400 ml-1.5" />
            {([1, 2, 3] as const).map((level) => (
                <button
                    key={level}
                    type="button"
                    onClick={() => onChange(level)}
                    aria-pressed={value === level}
                    aria-label={levelLabels[level - 1]}
                    title={levelLabels[level - 1]}
                    className={`px-2 py-1 rounded ${sizeClass[level - 1]} font-semibold transition-colors ${
                        value === level
                            ? 'bg-emerald-500 text-slate-900'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                >
                    A
                </button>
            ))}
        </div>
    );
}

