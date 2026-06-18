import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

/** Philosophy / mission statement section — anchored at #filosofia. */
export function Philosophy() {
    const { t } = useTranslation('landing');

    const principles = t('philosophy.principles', { returnObjects: true }) as Array<{
        title: string;
        text: string;
    }>;

    return (
        <section id="filosofia" className="bg-white py-32 md:py-40 px-6 lg:px-10">
            <div className="max-w-[1100px] mx-auto">
                <Reveal>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-8">
                        {t('philosophy.eyebrow')}
                    </div>

                    <h2 className="font-reading text-[36px] md:text-[52px] lg:text-[64px] leading-[1.05] tracking-[-0.02em] text-slate-900 mb-12 max-w-3xl">
                        {t('philosophy.heading')}
                    </h2>

                    <div className="max-w-2xl text-[17px] md:text-[19px] text-slate-600 leading-[1.65] mb-16">
                        <p>{t('philosophy.intro')}</p>
                    </div>
                </Reveal>

                <div className="grid md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden mb-16">
                    {principles.map(({ title, text }, idx) => (
                        <Reveal key={title} delay={idx * 80}>
                            <div className="bg-white p-8 h-full">
                                <h3 className="font-reading text-[22px] text-slate-900 mb-3 tracking-tight">
                                    {title}
                                </h3>
                                <p className="text-[14.5px] text-slate-600 leading-[1.65]">
                                    {text}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal>
                    <div className="border-t border-slate-200 pt-10 max-w-2xl">
                        <blockquote className="font-reading text-[22px] md:text-[28px] leading-[1.35] tracking-tight text-slate-900 italic">
                            {t('philosophy.quote')}
                        </blockquote>
                        <cite className="not-italic block mt-4 text-[12px] uppercase tracking-[0.2em] text-slate-500 font-medium">
                            {t('philosophy.quoteCite')}
                        </cite>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
