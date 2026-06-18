import { GraduationCap, HeartHandshake, LibraryBig, Mic2 } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

/**
 * Use-cases section — temporary bridge that lives in the social-proof
 * slot until we have real testimonials. The conversion analysis was
 * explicit: do NOT invent testimonials. So instead we show four
 * concrete usage patterns per persona — what they actually do INSIDE
 * the product when they sit down to work.
 *
 * When the first real testimonials arrive, this section gets replaced
 * one-to-one (or merged): same composer slot, same anchor, same
 * `Reveal` rhythm.
 *
 * Positioning rationale:
 *   - Sits between Principios (responsibility/trust framing) and
 *     Pricing (commercial ask). That sequence matches the narrative
 *     flow the analysis recommended:
 *       "Puedo confiar en sus fuentes" → "Puedo probarlo sin riesgo".
 *   - Light background continues the visual rhythm before Pricing
 *     (which is slate-50). Pillars 2/4 + Problem + FinalCTA already
 *     carry the dark-section quota — adding another dark block here
 *     would make the bottom third of the page feel heavy.
 */
const USE_CASE_ICONS = [Mic2, GraduationCap, LibraryBig, HeartHandshake];

type UseCasePersona = {
    persona: string;
    headline: string;
    steps: string[];
    outcome: string;
};

export function UseCases() {
    const { t } = useTranslation('landing');

    const personas = t('useCases.personas', { returnObjects: true }) as UseCasePersona[];
    const useCases = personas.map((persona, idx) => ({
        icon: USE_CASE_ICONS[idx],
        ...persona,
    }));

    return (
        <section id="casos-de-uso" className="bg-white py-28 md:py-36 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[1280px] mx-auto">
                <Reveal>
                    <div className="max-w-3xl mb-16">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-4">
                            {t('useCases.eyebrow')}
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-6">
                            {t('useCases.title')}
                        </h2>
                        <p className="text-[16px] text-slate-600 leading-[1.65] max-w-2xl">
                            {t('useCases.intro')}
                        </p>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                    {useCases.map(({ icon: Icon, persona, headline, steps, outcome }, idx) => (
                        <Reveal key={persona} delay={idx * 80}>
                            <div className="bg-white p-8 md:p-10 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-5">
                                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-md bg-indigo-50 text-indigo-600">
                                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                                    </span>
                                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">
                                        {persona}
                                    </span>
                                </div>

                                <h3 className="font-reading text-[22px] md:text-[24px] text-slate-900 mb-5 leading-[1.25] tracking-tight">
                                    {headline}
                                </h3>

                                <ol className="space-y-2.5 mb-6 flex-1">
                                    {steps.map((step, stepIdx) => (
                                        <li
                                            key={stepIdx}
                                            className="flex gap-3 text-[14px] text-slate-600 leading-[1.55]"
                                        >
                                            <span className="font-reading text-[13px] text-indigo-600 tabular-nums shrink-0 pt-0.5">
                                                {String(stepIdx + 1).padStart(2, '0')}
                                            </span>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ol>

                                <p className="text-[13.5px] text-slate-500 italic leading-[1.6] pt-5 border-t border-slate-100">
                                    {outcome}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal delay={400}>
                    <p className="text-[12.5px] text-slate-400 italic mt-10 text-center max-w-2xl mx-auto">
                        {t('useCases.footnote')}
                    </p>
                </Reveal>
            </div>
        </section>
    );
}
