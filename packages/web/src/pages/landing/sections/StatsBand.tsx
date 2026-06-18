import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

interface Stat {
    value: string;
    label: string;
    sub: string;
}

/** Dark stats band — visual breather between sections + key product metrics. */
export function StatsBand() {
    const { t } = useTranslation('landing');
    const stats = t('statsBand.stats', { returnObjects: true }) as Stat[];
    return (
        <section className="bg-slate-950 text-white py-20 md:py-24 px-6 lg:px-10 border-y border-white/5">
            <div className="max-w-[1280px] mx-auto">
                <div className="grid md:grid-cols-4 gap-px bg-white/5">
                    {stats.map(({ value, label, sub }, idx) => (
                        <Reveal key={label} delay={idx * 80}>
                            <div className="bg-slate-950 p-8">
                                <div className="font-reading text-[28px] md:text-[36px] leading-none text-white mb-3 tracking-tight">
                                    {value}
                                </div>
                                <div className="text-[13px] text-slate-200 mb-1 font-medium">{label}</div>
                                <div className="text-[11.5px] text-slate-500">{sub}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
