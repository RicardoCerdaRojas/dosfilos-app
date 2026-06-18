import {
    FolderTree,
    Clock,
    ShieldAlert,
    Languages,
    Target,
    Sprout,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

/**
 * Problem section — agitation block that lands right after the
 * TrustStrip and before the Pillars. Connects with the visitor's
 * pain BEFORE we describe the product so the capability tour reads
 * as relief, not feature dump.
 *
 * Editorial choices:
 *   - Dark background (slate-950) breaks the all-light run from
 *     TrustStrip → PillarBiblioteca and gives the section the
 *     emotional weight it needs.
 *   - Lucide monoline icons (already a project dependency) instead
 *     of bespoke illustrations — keeps the editorial sobriety the
 *     rest of the landing has, no rotating decorative SVGs.
 *   - Five pain points cover the four target personas: pastor,
 *     seminarist, professor, counselor. Each pain is something the
 *     product directly addresses in a downstream pillar — the
 *     payoff structure stays coherent.
 */
const PAIN_POINT_ICONS = [FolderTree, Clock, ShieldAlert, Languages, Target, Sprout];

export function Problem() {
    const { t } = useTranslation('landing');

    const painPoints = t('problem.painPoints', { returnObjects: true }) as Array<{
        title: string;
        text: string;
    }>;

    return (
        <section
            id="problema"
            className="relative bg-slate-950 text-white py-28 md:py-36 px-6 lg:px-10 overflow-hidden"
        >
            {/* Same subtle architectural grid + radial glow vocabulary
                used in Hero / FinalCTA so the dark sections feel like
                one visual family. */}
            <div
                aria-hidden
                className="absolute inset-0 opacity-50 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(ellipse 1000px 500px at 70% -50px, rgba(99,102,241,0.10), transparent 60%)',
                }}
            />
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
                    backgroundSize: '56px 56px',
                    maskImage: 'radial-gradient(ellipse 60% 80% at 50% 50%, black 30%, transparent 85%)',
                }}
            />

            <div className="relative max-w-[1200px] mx-auto">
                <Reveal>
                    <div className="max-w-3xl mb-16">
                        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-indigo-300 font-medium mb-6">
                            <span className="h-1 w-1 rounded-full bg-indigo-400" />
                            {t('problem.eyebrow')}
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] lg:text-[60px] leading-[1.05] tracking-[-0.02em] text-white mb-8">
                            {t('problem.heading')}
                        </h2>
                        <p className="text-[17px] md:text-[19px] text-slate-300 leading-[1.65] max-w-2xl">
                            {t('problem.intro')}
                        </p>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10 rounded-xl overflow-hidden">
                    {PAIN_POINT_ICONS.map((Icon, idx) => {
                        const { title, text } = painPoints[idx];
                        return (
                            <Reveal key={title} delay={idx * 60}>
                                <div className="bg-slate-950 p-8 md:p-10 h-full">
                                    <Icon className="h-5 w-5 text-indigo-300 mb-5" strokeWidth={1.5} />
                                    <h3 className="font-reading text-[22px] text-white mb-3 tracking-tight">
                                        {title}
                                    </h3>
                                    <p className="text-[14.5px] text-slate-400 leading-[1.65]">
                                        {text}
                                    </p>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>

                <Reveal delay={400}>
                    <div className="mt-20 md:mt-24 pt-12 border-t border-white/10 max-w-3xl">
                        <p className="font-reading text-[20px] md:text-[24px] leading-[1.5] text-white">
                            {t('problem.closingLead')}{' '}
                            <span className="text-slate-400">
                                {t('problem.closingEmphasis')}
                            </span>
                        </p>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
