import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { Reveal } from '../shared/Reveal';

interface FAQItemProps {
    q: string;
    a: string;
}

function FAQItem({ q, a }: FAQItemProps) {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <h3 className="m-0">
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="w-full flex items-start justify-between gap-6 py-6 text-left group"
                >
                    <span className="font-reading text-[19px] md:text-[21px] text-slate-900 tracking-tight leading-snug">
                        {q}
                    </span>
                    <ChevronDown
                        className={cn(
                            'h-5 w-5 shrink-0 text-slate-400 mt-1 transition-transform',
                            open && 'rotate-180'
                        )}
                    />
                </button>
            </h3>
            <div
                className={cn(
                    'overflow-hidden transition-all',
                    open ? 'max-h-96 pb-6' : 'max-h-0'
                )}
            >
                <p className="text-[15.5px] text-slate-600 leading-[1.65] max-w-3xl">{a}</p>
            </div>
        </div>
    );
}

/** FAQ accordion section, anchored at #faq. */
export function FAQ() {
    const { t } = useTranslation('landing');
    const items = t('faq.items', { returnObjects: true }) as Array<{ q: string; a: string }>;
    return (
        <section id="faq" className="bg-white py-28 md:py-36 px-6 lg:px-10 border-t border-slate-200">
            <div className="max-w-[960px] mx-auto">
                <Reveal>
                    <div className="max-w-2xl mb-12">
                        <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-600 font-medium mb-4">
                            {t('faq.eyebrow')}
                        </div>
                        <h2 className="font-reading text-[36px] md:text-[52px] leading-[1.05] tracking-[-0.02em] text-slate-900">
                            {t('faq.heading')}
                        </h2>
                    </div>
                </Reveal>

                <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
                    {items.map((it, idx) => (
                        <FAQItem key={idx} q={it.q} a={it.a} />
                    ))}
                </div>
            </div>
        </section>
    );
}
