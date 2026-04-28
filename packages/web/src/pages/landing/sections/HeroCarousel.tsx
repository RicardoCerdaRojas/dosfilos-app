import { ReactNode, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LibraryMock } from '../mocks/LibraryMock';
import { HebrewMock } from '../mocks/HebrewMock';
import { GreekMock } from '../mocks/GreekMock';
import { SermonMock } from '../mocks/SermonMock';
import { HeroChatMock } from './HeroChatMock';

interface CarouselPanel {
    label: string;
    sub: string;
    render: () => ReactNode;
}

const PANELS: CarouselPanel[] = [
    { label: '01 · Hebreo bíblico', sub: 'Entrenador con análisis morfológico', render: () => <HebrewMock /> },
    { label: '02 · Griego koiné', sub: 'Tutor con morfología del NT', render: () => <GreekMock /> },
    { label: '03 · Consulta con citas', sub: 'Tutores expertos por área', render: () => <HeroChatMock /> },
    { label: '04 · Tu biblioteca', sub: 'Corpus personal y especializado', render: () => <LibraryMock /> },
    { label: '05 · Producción ministerial', sub: 'Sermones con respaldo exegético', render: () => <SermonMock /> },
];

const CYCLE_MS = 5500;

/**
 * Auto-advancing hero carousel that crossfades between product mockups every
 * 5.5s. Pauses on hover and respects `prefers-reduced-motion`.
 */
export function HeroCarousel() {
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
            className="relative"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-indigo-400 font-medium">
                        {PANELS[index].label}
                    </div>
                    <div className="text-[13px] text-slate-400 mt-0.5">{PANELS[index].sub}</div>
                </div>
                <div className="flex gap-1.5">
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

            <div className="relative">
                {PANELS.map((panel, i) => (
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
                        {panel.render()}
                    </div>
                ))}
            </div>
        </div>
    );
}
