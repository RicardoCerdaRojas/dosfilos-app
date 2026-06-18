import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { LibraryMock } from '../mocks/LibraryMock';
import { HebrewMock } from '../mocks/HebrewMock';
import { GreekMock } from '../mocks/GreekMock';
import { SermonMock } from '../mocks/SermonMock';
import { HeroChatMock } from './HeroChatMock';

const PANEL_RENDERERS: Array<() => ReactNode> = [
    () => <HebrewMock />,
    () => <GreekMock />,
    () => <HeroChatMock />,
    () => <LibraryMock />,
    () => <SermonMock />,
];

const CYCLE_MS = 5500;

/**
 * Auto-advancing hero carousel that crossfades between product mockups every
 * 5.5s. Pauses on hover and respects `prefers-reduced-motion`.
 */
export function HeroCarousel() {
    const { t } = useTranslation('landing');
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const panels = t('heroCarousel.panels', { returnObjects: true }) as Array<{
        label: string;
        sub: string;
    }>;

    useEffect(() => {
        if (paused) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const id = setInterval(() => {
            setIndex(i => (i + 1) % PANEL_RENDERERS.length);
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
                    {PANEL_RENDERERS.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setIndex(i)}
                            className={cn(
                                'h-1 rounded-full transition-all',
                                i === index ? 'w-6 bg-white' : 'w-3 bg-white/20 hover:bg-white/40'
                            )}
                            aria-label={t('heroCarousel.panelAriaLabel', { number: i + 1 })}
                        />
                    ))}
                </div>
            </div>

            <div className="relative">
                {PANEL_RENDERERS.map((render, i) => (
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
        </div>
    );
}
