import { Wand2, Sparkles, BookOpen } from 'lucide-react';
import { STUDY_UNIT_USD } from '@dosfilos/domain';

interface ProcessingQuotaBlockProps {
    standardPagesPerMonth?: number;
    premiumPagesPerMonth?: number;
    /** USD allowance for the exégesis bucket (Pro=10, Team=30, others=0). */
    exegesisUsdPerMonth?: number;
}

/**
 * Surface the monthly processing quota included in a plan, right at
 * the buy decision (landing pricing + dashboard subscription). Hidden
 * for plans without quota (Free) so we don't shout "0 pages" where
 * paid plans show real numbers.
 *
 * Below the quota a soft note about credit packs sets the expectation
 * upfront — no surprise gating later. Hardcoded Spanish copy to match
 * the rest of the pricing surfaces (i18n is a separate cleanup task).
 */
export function ProcessingQuotaBlock({
    standardPagesPerMonth,
    premiumPagesPerMonth,
    exegesisUsdPerMonth,
}: ProcessingQuotaBlockProps) {
    const standard = Number(standardPagesPerMonth ?? 0);
    const premium = Number(premiumPagesPerMonth ?? 0);
    const exegesisUsd = Number(exegesisUsdPerMonth ?? 0);
    const studies = exegesisUsd > 0 ? Math.round(exegesisUsd / STUDY_UNIT_USD) : 0;
    if (standard === 0 && premium === 0 && studies === 0) return null;

    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/80 mb-2">
                Incluye cada mes
            </p>
            <div className="grid grid-cols-2 gap-2">
                <QuotaRow icon={Wand2} value={standard} unit="págs." label="estándar" />
                <QuotaRow icon={Sparkles} value={premium} unit="págs." label="premium" />
                {studies > 0 && (
                    <QuotaRow icon={BookOpen} value={studies} unit="" label={studies === 1 ? 'estudio' : 'estudios'} span2 />
                )}
            </div>
            <p className="text-[10.5px] text-muted-foreground mt-2 leading-snug">
                ¿Necesitas más? Compra packs prepago desde $3.
            </p>
        </div>
    );
}

function QuotaRow({ icon: Icon, value, unit, label, span2 }: { icon: typeof Wand2; value: number; unit: string; label: string; span2?: boolean }) {
    return (
        <div className={`flex items-baseline gap-1.5${span2 ? ' col-span-2' : ''}`}>
            <Icon className="h-3 w-3 text-primary self-center shrink-0" />
            <span className="text-base font-bold tabular-nums text-foreground">
                {value.toLocaleString()}
            </span>
            <span className="text-[11px] text-muted-foreground">{unit ? `${unit} ` : ''}{label}</span>
        </div>
    );
}
