import { cn } from '@/lib/utils';

/**
 * Hero chat mockup — faithful recreation of the actual tutor chat UI showing
 * a real response with inline citations and bibliography. Used as one of the
 * panels in the hero carousel.
 */
export function HeroChatMock() {
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
                    <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-3 px-2">Sesiones</div>
                    <div className="space-y-1">
                        {[
                            { t: 'Aspecto verbal en hebreo', active: true },
                            { t: 'El aoristo en Jn 1:14' },
                            { t: 'Pastoral — Rom 12:1-2' },
                            { t: 'Imagen de Dios' },
                            { t: 'Kenosis en Fil 2' },
                        ].map(({ t, active }) => (
                            <div
                                key={t}
                                className={cn(
                                    'px-2.5 py-1.5 rounded-md text-[12px] truncate',
                                    active ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/20' : 'text-slate-400'
                                )}
                            >
                                {t}
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="col-span-12 md:col-span-9 flex flex-col bg-[#0b1020]">
                    <div className="flex-1 overflow-hidden p-6 space-y-5">
                        <div className="flex justify-end">
                            <div className="max-w-[70%] bg-indigo-600 text-white text-[13px] rounded-2xl rounded-tr-sm px-4 py-2.5">
                                ¿Qué es el aspecto perfecto en hebreo bíblico?
                            </div>
                        </div>

                        <div className="max-w-[88%]">
                            <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-2">Dr. Berith · Hebreo</div>
                            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 font-reading text-[13.5px] leading-relaxed text-slate-200">
                                <div className="font-sans text-base font-semibold text-white mb-2 tracking-tight">
                                    El aspecto perfecto (qatal) en hebreo bíblico
                                </div>
                                <p className="mb-3">
                                    El hebreo bíblico, a diferencia del español, no marca primariamente el tiempo cronológico del verbo sino su <em>aspecto</em>
                                    <span className="inline-flex items-center justify-center mx-0.5 px-1.5 min-w-[1.3rem] h-[1.1rem] rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 align-super">1</span>
                                    .
                                </p>
                                <p>
                                    En <span className="text-emerald-400 underline decoration-dotted decoration-emerald-400/50 underline-offset-4">Gén 1:1</span>, el verbo{' '}
                                    <span dir="rtl" lang="he" className="font-hebrew text-[1.05em]">בָּרָא</span>{' '}
                                    presenta la creación como un hecho completo
                                    <span className="inline-flex items-center justify-center mx-0.5 px-1.5 min-w-[1.3rem] h-[1.1rem] rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 align-super">1</span>
                                    .
                                </p>

                                <div className="mt-4 pt-4 border-t border-white/10">
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Bibliografía</div>
                                    <div className="text-[12px] font-sans flex items-baseline gap-2">
                                        <span className="font-semibold text-indigo-300">[1]</span>
                                        <span className="text-slate-400">Farfan —</span>
                                        <span className="text-slate-200">Gramática Hebreo</span>
                                        <span className="text-slate-500">, pp. 41, 88</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-white/5 p-4">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-slate-500">
                            Continúa la conversación...
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
