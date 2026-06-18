import { useEffect, useState, type ReactNode } from 'react';
import { HebrewMock } from '../mocks/HebrewMock';
import { GreekMock } from '../mocks/GreekMock';

const CYCLE_MS = 6000;

export interface LanguageMockCarouselProps {
    hebrew: React.ComponentProps<typeof HebrewMock>;
    greek: React.ComponentProps<typeof GreekMock>;
}

/**
 * Crossfading carousel for the "Original languages" pillar — alternates the
 * Hebrew and Greek tutor mockups. Auto-advances, pauses on hover, respects
 * `prefers-reduced-motion`.
 */
export function LanguageMockCarousel({ hebrew, greek }: LanguageMockCarouselProps) {
    const panels: Array<() => ReactNode> = [
        () => <HebrewMock {...hebrew} />,
        () => <GreekMock {...greek} />,
    ];

    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => {
            setIndex(i => (i + 1) % panels.length);
        }, CYCLE_MS);
        return () => clearInterval(id);
    }, [paused]);

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="relative">
                {panels.map((render, i) => (
                    <div
                        key={i}
                        className={`transition-all duration-700 ease-out ${
                            i === index
                                ? 'opacity-100 relative'
                                : 'opacity-0 absolute inset-0 pointer-events-none'
                        }`}
                        aria-hidden={i !== index}
                    >
                        {render()}
                    </div>
                ))}
            </div>

            <div className="flex justify-center gap-1.5 mt-5">
                {panels.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setIndex(i)}
                        className={`h-1 rounded-full transition-all ${
                            i === index ? 'w-6 bg-white' : 'w-3 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`Panel ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
