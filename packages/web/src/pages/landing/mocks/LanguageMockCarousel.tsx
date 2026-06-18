import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { HebrewMock } from './HebrewMock';
import { GreekMock } from './GreekMock';

const PANELS: Array<() => ReactNode> = [
    () => <HebrewMock />,
    () => <GreekMock />,
];

const CYCLE_MS = 6000;

/**
 * Crossfading carousel for the "Original languages" pillar — alternates the
 * Hebrew and Greek tutor mockups so the illustration shows both languages the
 * pillar talks about. Auto-advances, pauses on hover, respects
 * `prefers-reduced-motion`. Each mock carries its own header, so no extra
 * labels are needed here — only the dot indicators below.
 */
export function LanguageMockCarousel() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => {
            setIndex(i => (i + 1) % PANELS.length);
        }, CYCLE_MS);
        return () => clearInterval(id);
    }, [paused]);

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="relative">
                {PANELS.map((render, i) => (
                    <div
                        key={i}
                        className={cn(
                            'transition-all duration-700 ease-out',
                            i === index
                                ? 'opacity-100 relative'
                                : 'opacity-0 absolute inset-0 pointer-events-none'
                        )}
                        aria-hidden={i !== index}
                    >
                        {render()}
                    </div>
                ))}
            </div>

            <div className="flex justify-center gap-1.5 mt-5">
                {PANELS.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={cn(
                            'h-1 rounded-full transition-all',
                            i === index ? 'w-6 bg-white' : 'w-3 bg-white/20 hover:bg-white/40'
                        )}
                        aria-label={`Panel ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
