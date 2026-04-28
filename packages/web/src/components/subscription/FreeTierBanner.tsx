import { ArrowRight, Sparkles } from 'lucide-react';

interface Props {
    onCtaClick: () => void;
}

/**
 * Compact inline Free-tier CTA — single row below the paid grid.
 *
 * Earlier iteration had Free as a 4th card (asymmetric, fewer features →
 * empty space) and then as a vertical banner block (too much vertical
 * spend). This single-row treatment keeps the page in one viewport while
 * still giving Free a distinct entry point separate from the paid grid.
 */
export function FreeTierBanner({ onCtaClick }: Props) {
    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
            <span className="text-[13px] text-slate-500">¿Solo quieres probar?</span>
            <button
                type="button"
                onClick={onCtaClick}
                className="group inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-300 bg-white hover:border-indigo-600 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 font-medium text-[13px] transition-all shadow-sm"
            >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Empezar gratis · sin tarjeta
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
            <span className="text-[12px] text-slate-400">50 consultas/mes</span>
        </div>
    );
}
