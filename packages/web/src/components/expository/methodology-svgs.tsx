/**
 * Inline SVG diagrams for the expository methodology presentation.
 *
 * Each diagram is a self-contained React component that uses Tailwind
 * tokens via `currentColor` so it adapts to the active theme without
 * per-mode duplication. No external assets — keeps the bundle small
 * and the diagrams editable as code.
 */

/**
 * Step 1 — "El problema y la promesa".
 * A bridge from a book glyph to a microphone glyph with a question
 * mark cluster above the gap, suggesting "the journey from text to
 * sermon is the hard part".
 */
export function ProblemBridgeDiagram() {
    return (
        <svg viewBox="0 0 320 160" className="w-full h-auto" aria-hidden="true">
            {/* Book on the left */}
            <g transform="translate(20, 70)">
                <rect width="60" height="48" rx="4" className="fill-emerald-500/20 stroke-emerald-600" strokeWidth="2" />
                <line x1="30" y1="0" x2="30" y2="48" className="stroke-emerald-600" strokeWidth="1" />
                <text x="30" y="68" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-mono">Texto</text>
            </g>

            {/* Microphone/pulpit on the right */}
            <g transform="translate(240, 70)">
                <circle cx="30" cy="14" r="14" className="fill-amber-500/20 stroke-amber-600" strokeWidth="2" />
                <rect x="28" y="28" width="4" height="20" className="fill-amber-600" />
                <line x1="14" y1="48" x2="46" y2="48" className="stroke-amber-600" strokeWidth="2" />
                <text x="30" y="68" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300 text-[10px] font-mono">Sermón</text>
            </g>

            {/* Bridge with gap (dashed) between book and mic */}
            <line x1="80" y1="94" x2="240" y2="94" className="stroke-slate-400" strokeWidth="1.5" strokeDasharray="6 4" />

            {/* Question marks in the gap */}
            <text x="130" y="50" className="fill-rose-500/70 text-[28px] font-bold" textAnchor="middle">?</text>
            <text x="160" y="40" className="fill-rose-500/70 text-[36px] font-bold" textAnchor="middle">?</text>
            <text x="190" y="55" className="fill-rose-500/70 text-[24px] font-bold" textAnchor="middle">?</text>
        </svg>
    );
}

/**
 * Step 2 — "Tres niveles distintos".
 * Three stacked horizontal layers — exegetical, argumentative,
 * preachable — connected by arrows showing the transformation.
 */
export function ThreeLevelsDiagram() {
    const layers: Array<{ label: string; tone: string; sub: string }> = [
        { label: 'EXEGÉTICA', tone: 'fill-emerald-500/15 stroke-emerald-600', sub: 'sintaxis del autor' },
        { label: 'ARGUMENTATIVA', tone: 'fill-blue-500/15 stroke-blue-600', sub: 'función en el libro' },
        { label: 'PREDICABLE', tone: 'fill-amber-500/15 stroke-amber-600', sub: 'unidad para el púlpito' },
    ];
    return (
        <svg viewBox="0 0 320 180" className="w-full h-auto" aria-hidden="true">
            {layers.map((l, i) => (
                <g key={l.label} transform={`translate(40, ${10 + i * 56})`}>
                    <rect width="240" height="40" rx="6" className={l.tone} strokeWidth="2" />
                    <text x="120" y="18" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100 text-[11px] font-bold tracking-wider">
                        {l.label}
                    </text>
                    <text x="120" y="32" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[9px] italic">
                        {l.sub}
                    </text>
                    {i < layers.length - 1 && (
                        <path
                            d="M 120 44 L 116 50 L 124 50 Z"
                            className="fill-slate-400"
                        />
                    )}
                </g>
            ))}
        </svg>
    );
}

/**
 * Step 3 — "Los 5 pases del pipeline".
 * Horizontal pipeline with 5 connected boxes.
 */
export function FivePassesDiagram() {
    const passes = ['Panorama', 'Macro', 'Micro', 'Predicable', 'Fidelidad'];
    return (
        <svg viewBox="0 0 320 100" className="w-full h-auto" aria-hidden="true">
            {passes.map((label, i) => (
                <g key={label} transform={`translate(${10 + i * 62}, 30)`}>
                    <rect
                        width="50"
                        height="40"
                        rx="6"
                        className="fill-emerald-500/20 stroke-emerald-600"
                        strokeWidth="2"
                    />
                    <text x="25" y="18" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[9px] font-bold">
                        FASE {i + 1}
                    </text>
                    <text x="25" y="32" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[8px] font-medium">
                        {label}
                    </text>
                    {i < passes.length - 1 && (
                        <path
                            d="M 50 20 L 60 20 L 56 16 M 60 20 L 56 24"
                            className="fill-none stroke-slate-400"
                            strokeWidth="1.5"
                        />
                    )}
                </g>
            ))}
        </svg>
    );
}

/**
 * Step 4 — "Lo que te entregamos".
 * Two side-by-side proposition cards (exegética + homilética).
 */
export function PropositionsDiagram() {
    return (
        <svg viewBox="0 0 320 140" className="w-full h-auto" aria-hidden="true">
            {/* Left: Exegética */}
            <g transform="translate(20, 20)">
                <rect width="130" height="100" rx="8" className="fill-emerald-500/15 stroke-emerald-600" strokeWidth="2" />
                <text x="65" y="22" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-bold">
                    HIPÓTESIS EXEGÉTICA
                </text>
                <text x="65" y="40" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[8px] italic">
                    qué hace el autor
                </text>
                <line x1="20" y1="50" x2="110" y2="50" className="stroke-emerald-600/40" strokeWidth="1" strokeDasharray="2 2" />
                <text x="65" y="70" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[8px]">
                    "El texto sugiere
                </text>
                <text x="65" y="82" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[8px]">
                    que Pedro establece..."
                </text>
            </g>

            {/* Right: Homilética */}
            <g transform="translate(170, 20)">
                <rect width="130" height="100" rx="8" className="fill-amber-500/15 stroke-amber-600" strokeWidth="2" />
                <text x="65" y="22" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300 text-[10px] font-bold">
                    LÍNEA HOMILÉTICA
                </text>
                <text x="65" y="40" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[8px] italic">
                    cómo recibe el oyente
                </text>
                <line x1="20" y1="50" x2="110" y2="50" className="stroke-amber-600/40" strokeWidth="1" strokeDasharray="2 2" />
                <text x="65" y="70" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[8px]">
                    "Si Dios ya nos dio
                </text>
                <text x="65" y="82" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[8px]">
                    todo, vivamos con..."
                </text>
            </g>

            {/* Connector arrow */}
            <path
                d="M 150 70 L 170 70 L 165 65 M 170 70 L 165 75"
                className="fill-none stroke-slate-400"
                strokeWidth="1.5"
            />
        </svg>
    );
}

/**
 * Step 5 — "Texto original cuando se puede".
 * Two source files (Greek + Hebrew) flowing into the assistant,
 * with a fallback path to translation.
 */
export function OriginalTextDiagram() {
    return (
        <svg viewBox="0 0 320 160" className="w-full h-auto" aria-hidden="true">
            {/* SBLGNT */}
            <g transform="translate(20, 20)">
                <rect width="80" height="40" rx="4" className="fill-emerald-500/20 stroke-emerald-600" strokeWidth="2" />
                <text x="40" y="18" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-bold">
                    SBLGNT
                </text>
                <text x="40" y="32" textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 text-[8px]">
                    griego NT
                </text>
            </g>

            {/* WLC */}
            <g transform="translate(20, 80)">
                <rect width="80" height="40" rx="4" className="fill-emerald-500/20 stroke-emerald-600" strokeWidth="2" />
                <text x="40" y="18" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[10px] font-bold">
                    WLC
                </text>
                <text x="40" y="32" textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 text-[8px]">
                    hebreo AT
                </text>
            </g>

            {/* RVR fallback (dashed) */}
            <g transform="translate(20, 130)" opacity="0.5">
                <rect width="80" height="22" rx="4" className="fill-amber-500/20 stroke-amber-600" strokeWidth="1" strokeDasharray="3 2" />
                <text x="40" y="15" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300 text-[8px] italic">
                    RVR/ASV (fallback)
                </text>
            </g>

            {/* Arrows converging into assistant */}
            <path d="M 100 40 L 200 70" className="fill-none stroke-emerald-500" strokeWidth="1.5" />
            <path d="M 100 100 L 200 80" className="fill-none stroke-emerald-500" strokeWidth="1.5" />
            <path d="M 100 141 L 200 90" className="fill-none stroke-amber-500" strokeWidth="1" strokeDasharray="3 2" />

            {/* Assistant box */}
            <g transform="translate(200, 60)">
                <rect width="100" height="50" rx="8" className="fill-slate-100 dark:fill-zinc-800 stroke-slate-400" strokeWidth="2" />
                <text x="50" y="22" textAnchor="middle" className="fill-slate-800 dark:fill-slate-100 text-[10px] font-bold">
                    Asistente
                </text>
                <text x="50" y="36" textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 text-[8px]">
                    cita marcadores
                </text>
                <text x="50" y="46" textAnchor="middle" className="fill-slate-600 dark:fill-slate-400 text-[8px]">
                    sintácticos
                </text>
            </g>
        </svg>
    );
}

/**
 * Step 6 — "De dónde viene esto".
 * Three small portrait circles representing Robinson, Chapell, Greidanus.
 */
export function HeritageDiagram() {
    const figures: Array<{ name: string; initials: string }> = [
        { name: 'Robinson', initials: 'HR' },
        { name: 'Chapell', initials: 'BC' },
        { name: 'Greidanus', initials: 'SG' },
    ];
    return (
        <svg viewBox="0 0 320 130" className="w-full h-auto" aria-hidden="true">
            {figures.map((f, i) => (
                <g key={f.name} transform={`translate(${50 + i * 90}, 20)`}>
                    <circle cx="35" cy="35" r="32" className="fill-emerald-500/15 stroke-emerald-600" strokeWidth="2" />
                    <text x="35" y="42" textAnchor="middle" className="fill-emerald-700 dark:fill-emerald-300 text-[18px] font-bold">
                        {f.initials}
                    </text>
                    <text x="35" y="92" textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-medium">
                        {f.name}
                    </text>
                </g>
            ))}
            {/* "Tu sermón" arrow flowing from the three down to a target */}
            <text x="160" y="120" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[9px] italic">
                ↓ síntesis aplicada al wizard
            </text>
        </svg>
    );
}
