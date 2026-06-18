/**
 * Decorative sermon-output mockup. See `LibraryMock` for notes on the landing
 * page colour palette as documented exception.
 */
import { useTranslation } from '@/i18n';

export function SermonMock() {
    const { t } = useTranslation('landing');
    const outline = t('mocks.sermon.outline', { returnObjects: true }) as string[];
    const verseRefs = [' (v. 1a)', ' (v. 1b)', ' (v. 2)'];
    const numerals = ['I.', 'II.', 'III.'];
    return (
        <div className="rounded-xl border border-white/10 bg-[#0f1428] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0a0f1f]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{t('mocks.sermon.header')}</div>
                <div className="text-[10px] font-mono text-slate-500">{t('mocks.sermon.export')}</div>
            </div>
            <div className="p-7 font-reading text-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2">{t('mocks.sermon.titleLabel')}</div>
                <h4 className="text-[22px] text-white leading-tight mb-6 tracking-tight">
                    {t('mocks.sermon.title')}
                </h4>

                <div className="space-y-5 text-[13.5px] leading-relaxed">
                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-1.5">{t('mocks.sermon.propositionLabel')}</div>
                        <div className="text-slate-300">
                            {t('mocks.sermon.proposition')}
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2.5">{t('mocks.sermon.outlineLabel')}</div>
                        <ol className="space-y-2.5 text-slate-300">
                            {outline.map((point, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="text-slate-500 tabular-nums text-[12px] pt-0.5">{numerals[i]}</span>
                                    <div>
                                        <span className="text-white">{point}</span>
                                        <span className="text-slate-500">{verseRefs[i]}</span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2">{t('mocks.sermon.sourcesLabel')}</div>
                        <div className="font-sans text-[11.5px] text-slate-500 space-y-1">
                            <div>[1] {t('mocks.sermon.source1Author')} · <span className="text-slate-300">{t('mocks.sermon.source1Book')}</span>, pp. 341–348</div>
                            <div>[2] {t('mocks.sermon.source2Author')} · <span className="text-slate-300">{t('mocks.sermon.source2Book')}</span>, pp. 748–763</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
