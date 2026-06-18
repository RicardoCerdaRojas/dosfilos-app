import { useEffect, useState, type ReactNode } from 'react';
import { HebrewMock } from '../mocks/HebrewMock';
import { GreekMock } from '../mocks/GreekMock';
import { HeroChatMock } from '../mocks/HeroChatMock';
import { LibraryMock } from '../mocks/LibraryMock';
import { SermonMock } from '../mocks/SermonMock';

const CYCLE_MS = 5500;

interface Panel {
    label: string;
    sub: string;
}

export interface HeroCarouselProps {
    panels: Panel[];
    panelAriaLabel: string;
    hebrew: React.ComponentProps<typeof HebrewMock>;
    greek: React.ComponentProps<typeof GreekMock>;
    chat: React.ComponentProps<typeof HeroChatMock>;
    library: React.ComponentProps<typeof LibraryMock>;
    sermon: React.ComponentProps<typeof SermonMock>;
}

/**
 * Auto-advancing hero carousel that crossfades between product mockups every
 * 5.5s. Pauses on hover and respects `prefers-reduced-motion`.
 */
export function HeroCarousel({ panels, panelAriaLabel, hebrew, greek, chat, library, sermon }: HeroCarouselProps) {
    const renderers: Array<() => ReactNode> = [
        () => <HebrewMock {...hebrew} />,
        () => <GreekMock {...greek} />,
        () => <HeroChatMock {...chat} />,
        () => <LibraryMock {...library} />,
        () => <SermonMock {...sermon} />,
    ];

    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        if (paused) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => {
            setIndex(i => (i + 1) % renderers.length);
        }, CYCLE_MS);
        return () => clearInterval(id);
    }, [paused]);

    return (
        <div
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-indigo-400 font-medium">
                        {panels[index]?.label}
                    </div>
                    <div className="text-[13px] text-slate-400 mt-0.5">{panels[index]?.sub}</div>
                </div>
                <div className="flex gap-1.5">
                    {renderers.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setIndex(i)}
                            className={`h-1 rounded-full transition-all ${
                                i === index ? 'w-6 bg-white' : 'w-3 bg-white/20 hover:bg-white/40'
                            }`}
                            aria-label={panelAriaLabel.replace('{{number}}', String(i + 1))}
                        />
                    ))}
                </div>
            </div>

            <div className="relative">
                {renderers.map((render, i) => (
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
        </div>
    );
}
