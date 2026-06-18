/**
 * Decorative sermon-output mockup. See `LibraryMock` for notes on the landing
 * page colour palette as documented exception. Strings come in as props.
 */
interface SermonMockProps {
    header: string;
    export: string;
    titleLabel: string;
    title: string;
    propositionLabel: string;
    proposition: string;
    outlineLabel: string;
    outline: string[];
    sourcesLabel: string;
    source1Author: string;
    source1Book: string;
    source2Author: string;
    source2Book: string;
}

const VERSE_REFS = [' (v. 1a)', ' (v. 1b)', ' (v. 2)'];
const NUMERALS = ['I.', 'II.', 'III.'];

export function SermonMock(props: SermonMockProps) {
    const {
        header, export: exportLabel, titleLabel, title, propositionLabel, proposition,
        outlineLabel, outline, sourcesLabel,
        source1Author, source1Book, source2Author, source2Book,
    } = props;
    return (
        <div className="rounded-xl border border-white/10 bg-[#0f1428] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0a0f1f]">
                <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{header}</div>
                <div className="text-[10px] font-mono text-slate-500">{exportLabel}</div>
            </div>
            <div className="p-7 font-reading text-slate-200">
                <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2">{titleLabel}</div>
                <h4 className="text-[22px] text-white leading-tight mb-6 tracking-tight">
                    {title}
                </h4>

                <div className="space-y-5 text-[13.5px] leading-relaxed">
                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-1.5">{propositionLabel}</div>
                        <div className="text-slate-300">
                            {proposition}
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2.5">{outlineLabel}</div>
                        <ol className="space-y-2.5 text-slate-300">
                            {outline.map((point, i) => (
                                <li key={i} className="flex gap-3">
                                    <span className="text-slate-500 tabular-nums text-[12px] pt-0.5">{NUMERALS[i]}</span>
                                    <div>
                                        <span className="text-white">{point}</span>
                                        <span className="text-slate-500">{VERSE_REFS[i]}</span>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="border-t border-white/5 pt-5">
                        <div className="text-[11px] uppercase tracking-wider text-indigo-400 mb-2">{sourcesLabel}</div>
                        <div className="font-sans text-[11.5px] text-slate-500 space-y-1">
                            <div>[1] {source1Author} · <span className="text-slate-300">{source1Book}</span>, pp. 341–348</div>
                            <div>[2] {source2Author} · <span className="text-slate-300">{source2Book}</span>, pp. 748–763</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
