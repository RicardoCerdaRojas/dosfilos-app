import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

/**
 * Hero chat mockup — faithful recreation of the actual tutor chat UI showing
 * a real response with inline citations and bibliography. Used as one of the
 * panels in the hero carousel.
 */
export function HeroChatMock() {
    const { t } = useTranslation('landing');

    const sessionTitles = t('mocks.chat.sessions', { returnObjects: true }) as string[];
    const sessionActive = [true, false, false, false, false];
    const sessions = sessionTitles.map((title, i) => ({ t: title, active: sessionActive[i] }));

    return (
        <div className="rounded-2xl border border-white/10 bg-[#0b1020] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-[#0a0f1c]">
                <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                    <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="text-[11px] text-slate-500 font-mono">preach.dosfilos.app/dashboard/faculty</div>
                </div>
            </div>

            <div className="grid grid-cols-12 h-[500px]">
                <aside className="hidden md:block col-span-3 border-r border-white/5 bg-[#0a0f1c] p-4">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3 px-2">{t('mocks.chat.sessionsTitle')}</div>
                    <div className="space-y-1">
                        {sessions.map(({ t: title, active }) => (
                            <div
                                key={title}
                                className={cn(
                                    'px-2.5 py-1.5 rounded-md text-[12px] truncate',
                                    active ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/20' : 'text-slate-400'
                                )}
                            >
                                {title}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="col-span-12 md:col-span-9 flex flex-col bg-[#0b1020]">
                    <div className="flex-1 overflow-hidden p-6 space-y-5">
                        <div className="flex justify-end">
                            <div className="max-w-[70%] bg-indigo-600 text-white text-[13px] rounded-2xl rounded-tr-sm px-4 py-2.5">
                                {t('mocks.chat.userMessage')}
                            </div>
                        </div>

                        <div className="max-w-[88%]">
                            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">{t('mocks.chat.author')}</div>
                            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 font-reading text-[13.5px] leading-relaxed text-slate-200">
                                <div className="font-sans text-base font-semibold text-white mb-2 tracking-tight">
                                    {t('mocks.chat.answerTitle')}
                                </div>
                                <p className="mb-3">
                                    {t('mocks.chat.para1pre')} <em>{t('mocks.chat.para1emphasis')}</em>
                                    <span className="inline-flex items-center justify-center mx-0.5 px-1.5 min-w-[1.3rem] h-[1.1rem] rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 align-super">1</span>
                                    .
                                </p>
                                <p>
                                    {t('mocks.chat.para2pre')} <span className="text-emerald-400 underline decoration-dotted decoration-emerald-400/50 underline-offset-4">{t('mocks.chat.para2ref')}</span>{t('mocks.chat.para2mid')}{' '}
                                    <span dir="rtl" lang="he" className="font-hebrew text-[1.05em]">בָּרָא</span>{' '}
                                    {t('mocks.chat.para2post')}
                                    <span className="inline-flex items-center justify-center mx-0.5 px-1.5 min-w-[1.3rem] h-[1.1rem] rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 align-super">1</span>
                                    .
                                </p>

                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">{t('mocks.chat.bibliographyTitle')}</div>
                                    <div className="text-[12px] font-sans flex items-baseline gap-2">
                                        <span className="font-semibold text-indigo-300">[1]</span>
                                        <span className="text-slate-400">Farfan —</span>
                                        <span className="text-slate-200">{t('mocks.chat.bibBook')}</span>
                                        <span className="text-slate-500">, pp. 41, 88</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 p-4">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-slate-500">
                            {t('mocks.chat.continuePlaceholder')}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
