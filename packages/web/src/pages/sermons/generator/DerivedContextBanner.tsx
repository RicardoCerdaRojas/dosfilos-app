import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useWizard } from './WizardContext';

interface DerivedContextBannerProps {
    /**
     * Optional per-step hint suffix key. The full i18n path is
     * resolved as `derivedContext.banner.{kind}.{suffix}` so paper-
     * derived and Faculty-derived sermons can surface variant-
     * specific guidance per Step (e.g. paper exegesis hint mentions
     * Greek Tutor regeneration; Faculty exegesis hint mentions
     * reopening the original conversation).
     *
     * When omitted, only the headline + open-link CTA render.
     */
    stepHintKey?: 'passageHint' | 'exegesisHint' | 'homileticsHint' | 'draftHint';
}

/**
 * Surfaces "Pre-cargado desde {origen}" provenance whenever the
 * wizard's state was pre-populated by an external source. Renders
 * nothing for wizard-native sermons (derivedContext === null).
 *
 * Variants:
 *   - kind 'paper'   → links to the source paper detail view, uses
 *                      paper-specific copy + tone interpolation.
 *   - kind 'faculty' → links back to the originating Faculty chat
 *                      session, uses Faculty-specific copy.
 *
 * The banner is intentionally non-blocking: it informs but doesn't
 * gate the user. Each Step passes `stepHintKey` to surface its own
 * follow-up message under the headline.
 */
export function DerivedContextBanner({ stepHintKey }: DerivedContextBannerProps) {
    const { t } = useTranslation('generator');
    const { derivedContext } = useWizard();

    if (!derivedContext) return null;

    const isFaculty = derivedContext.kind === 'faculty';
    const title = isFaculty
        ? derivedContext.sessionTitle
        : derivedContext.paperTitle;
    const linkTo = isFaculty
        ? `/dashboard/faculty/${derivedContext.sessionId}`
        : `/dashboard/exegesis/${derivedContext.paperId}`;
    const headlineKey = `derivedContext.banner.${derivedContext.kind}.headline`;
    const openLabelKey = `derivedContext.banner.${derivedContext.kind}.openLink`;
    const Icon = isFaculty ? MessageCircle : BookOpen;

    // Hint interpolation needs `tone` for the 'paper' variant; pass it
    // unconditionally — i18n placeholders that aren't referenced in
    // the target string are silently ignored by the formatter.
    const hintArgs: Record<string, string> = {};
    if (derivedContext.kind === 'paper') {
        hintArgs.tone = t(`derivedContext.tone.${derivedContext.tone}`);
    }

    return (
        <div className="mb-3 rounded-md border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-[12px]">
            <div className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                        {t(headlineKey, { title })}
                    </p>
                    {stepHintKey && (
                        <p className="mt-0.5 text-emerald-700/80 dark:text-emerald-300/80">
                            {t(`derivedContext.banner.${derivedContext.kind}.${stepHintKey}`, hintArgs)}
                        </p>
                    )}
                </div>
                <Link
                    to={linkTo}
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 font-medium shrink-0"
                >
                    {t(openLabelKey)}
                    <ExternalLink className="h-3 w-3" />
                </Link>
            </div>
        </div>
    );
}
