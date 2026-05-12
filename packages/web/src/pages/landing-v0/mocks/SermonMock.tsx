/**
 * Decorative sermon-output mockup. See `LibraryMock` for notes on the landing
 * page colour palette as documented exception.
 */
export function SermonMock() {
    return (
        <div className="rounded-xl border border-white/10 bg-[#0f1428] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0a0f1f]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Sermón · Romanos 12:1-2</div>
                <div className="text-[10px] font-mono text-slate-500">Exportar ↓</div>
            </div>
            <div className="p-7 font-reading text-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2">Título</div>
                <h4 className="text-[22px] text-white leading-tight mb-6 tracking-tight">
                    El culto racional: vidas transformadas como sacrificio vivo
                </h4>

                <div className="space-y-5 text-[13.5px] leading-relaxed">
                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-1.5">Proposición</div>
                        <div className="text-slate-300">
                            El creyente ofrece su vida entera a Dios como un acto racional de adoración,
                            renovado por el entendimiento transformador de la Palabra.
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2.5">Bosquejo</div>
                        <ol className="space-y-2.5 text-slate-300">
                            <li className="flex gap-3">
                                <span className="text-slate-500 tabular-nums text-[12px] pt-0.5">I.</span>
                                <div>
                                    <span className="text-white">El llamado: presentar los cuerpos</span>
                                    <span className="text-slate-500"> (v. 1a)</span>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-slate-500 tabular-nums text-[12px] pt-0.5">II.</span>
                                <div>
                                    <span className="text-white">La naturaleza: sacrificio vivo, santo, agradable</span>
                                    <span className="text-slate-500"> (v. 1b)</span>
                                </div>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-slate-500 tabular-nums text-[12px] pt-0.5">III.</span>
                                <div>
                                    <span className="text-white">El medio: renovación del entendimiento</span>
                                    <span className="text-slate-500"> (v. 2)</span>
                                </div>
                            </li>
                        </ol>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2">Fuentes consultadas</div>
                        <div className="font-sans text-[11.5px] text-slate-500 space-y-1">
                            <div>[1] Calvino · <span className="text-slate-300">Comentario a Romanos</span>, pp. 341–348</div>
                            <div>[2] Moo · <span className="text-slate-300">The Epistle to the Romans</span>, pp. 748–763</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
