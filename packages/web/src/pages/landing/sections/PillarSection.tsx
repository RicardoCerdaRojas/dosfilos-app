import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from '../shared/Reveal';

interface PillarSectionProps {
    id: string;
    /** Two-digit pillar number rendered as a large display numeral. */
    number: string;
    /** Small caps eyebrow above the title (e.g. "Pilar 01 · Biblioteca"). */
    eyebrow: string;
    title: string;
    description: string;
    bullets: string[];
    mockup: ReactNode;
    /** When true, mockup renders to the LEFT instead of right. */
    reversed?: boolean;
    /** When true, the section uses the dark slate-950 palette. */
    dark?: boolean;
}

/**
 * Generic split-screen pillar section. Title + description + bullet list on
 * one side, product mockup on the other. Alternates left/right via `reversed`
 * and supports a dark variant for visual contrast between pillars.
 */
export function PillarSection({
    id,
    number,
    eyebrow,
    title,
    description,
    bullets,
    mockup,
    reversed = false,
    dark = false,
}: PillarSectionProps) {
    return (
        <section
            id={id}
            className={cn(
                'py-24 md:py-32 px-6 lg:px-10',
                dark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
            )}
        >
            <div className="max-w-[1280px] mx-auto">
                <div
                    className={cn(
                        'grid lg:grid-cols-12 gap-12 lg:gap-16 items-center',
                        reversed && 'lg:[&>*:first-child]:order-2'
                    )}
                >
                    <div className="lg:col-span-5">
                        <Reveal>
                            <div className={cn('flex items-center gap-3 mb-8', dark ? 'text-slate-500' : 'text-slate-400')}>
                                <span className="font-reading text-[48px] md:text-[64px] leading-none tabular-nums font-light">{number}</span>
                                <div className="flex-1 h-px bg-current opacity-20" />
                            </div>
                            <div className={cn('text-[11px] uppercase tracking-[0.2em] font-medium mb-4', dark ? 'text-indigo-400' : 'text-indigo-600')}>
                                {eyebrow}
                            </div>
                            <h2 className={cn(
                                'font-reading text-[36px] md:text-[44px] leading-[1.05] tracking-[-0.02em] mb-6',
                                dark ? 'text-white' : 'text-slate-900'
                            )}>
                                {title}
                            </h2>
                            <p className={cn(
                                'text-[17px] leading-[1.65] mb-8',
                                dark ? 'text-slate-400' : 'text-slate-600'
                            )}>
                                {description}
                            </p>
                            <ul className="space-y-3">
                                {bullets.map(b => (
                                    <li
                                        key={b}
                                        className={cn(
                                            'flex gap-3 text-[14.5px] leading-relaxed',
                                            dark ? 'text-slate-300' : 'text-slate-700'
                                        )}
                                    >
                                        <span className={cn('shrink-0 mt-1 h-1 w-1 rounded-full', dark ? 'bg-indigo-400' : 'bg-indigo-600')} />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>
                    <div className="lg:col-span-7">
                        <Reveal delay={120}>
                            {mockup}
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    );
}
