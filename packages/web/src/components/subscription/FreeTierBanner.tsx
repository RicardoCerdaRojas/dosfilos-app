import { ArrowRight, Sparkles } from 'lucide-react';

interface Props {
    onCtaClick: () => void;
    /** Forces a centered layout for use in full-bleed sections (default: true). */
    centered?: boolean;
}

/**
 * Standalone CTA strip for the Free tier — sits below the paid pricing grid.
 *
 * Free was originally a 4th card alongside Personal/Pro/Equipo, but the
 * comparison-grid pattern doesn't fit Free's intent: paid cards answer
 * "which plan?", Free answers "or try first?". Mixing both made Free look
 * incomplete (fewer features → empty space) and forced an apples-to-oranges
 * comparison the user shouldn't be making at the moment of evaluation.
 *
 * Treatment: secondary visual weight, eyebrow framing question, outline pill
 * CTA, helper text below. Reads as a permission-giver, not a competing option.
 */
export function FreeTierBanner({ onCtaClick, centered = true }: Props) {
    return (
        <div className={centered ? 'text-center mt-12' : 'mt-12'}>
            <p className="text-[13px] text-slate-500 mb-4 font-medium">
                ¿Quieres probar antes de comprometerte?
            </p>

            <button
                type="button"
                onClick={onCtaClick}
                className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-full border-2 border-slate-300 bg-white hover:border-indigo-600 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 font-medium text-[14px] transition-all shadow-sm hover:shadow-md"
            >
                <Sparkles className="h-4 w-4 text-indigo-600" />
                Empezar gratis · sin tarjeta
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className="text-[12px] text-slate-500 mt-3">
                Acceso a biblioteca curada · 50 consultas al mes
            </p>
        </div>
    );
}
