/**
 * Decorative Greek-tutor mockup. See `LibraryMock` for notes on the landing
 * page colour palette as documented exception. Strings come in as props.
 */
interface Morph {
    label: string;
    value: string;
}

interface GreekMockProps {
    header: string;
    morphologyLabel: string;
    gloss: string;
    analysisOf: string;
    morphology: Morph[];
}

export function GreekMock({ header, morphologyLabel, gloss, analysisOf, morphology }: GreekMockProps) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#0f1428] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0a0f1f]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{header}</div>
                <div className="text-[10px] font-mono text-slate-500">{morphologyLabel}</div>
            </div>
            <div className="p-8">
                <div lang="el" className="font-greek text-center text-[34px] md:text-[42px] leading-[1.45] text-white mb-6">
                    Καὶ ὁ λόγος σὰρξ ἐγένετο
                </div>
                <div className="text-center font-reading italic text-slate-400 text-[14px] mb-8">
                    kaí ho lógos sárx egéneto — {gloss}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-6">
                    <div className="col-span-2 mb-2">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">{analysisOf}</div>
                        <div lang="el" className="font-greek text-2xl text-white">ἐγένετο</div>
                    </div>
                    {morphology.map(m => (
                        <div key={m.label} className="rounded-md bg-white/[0.03] border border-white/5 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</div>
                            <div className="text-[13px] text-slate-100 mt-0.5 font-medium">{m.value}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
