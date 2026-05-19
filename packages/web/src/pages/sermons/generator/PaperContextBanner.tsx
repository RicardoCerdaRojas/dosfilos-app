import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useWizard } from './WizardContext';

interface PaperContextBannerProps {
    /**
     * Optional per-step hint text key. When present, rendered as a
     * small secondary line under the main banner copy so each step can
     * surface its own context-specific message (e.g. Step 2 hints that
     * the approach was derived from the tone).
     */
    stepHintKey?: string;
}

/**
 * Surfaces the "Pre-cargado desde paper {X}" provenance whenever the
 * wizard's state was populated by `GenerateSermonFromPaperUseCase`.
 * Renders nothing for wizard-native sermons (paperContext === null).
 *
 * The banner is intentionally non-blocking: it informs but doesn't
 * gate the user. Each step can pass `stepHintKey` to surface its own
 * follow-up message under the headline. The CTA to "Ver paper origen"
 * deep-links into the source paper detail view so the user can audit
 * the upstream exegetical work without losing wizard state.
 */
export function PaperContextBanner({ stepHintKey }: PaperContextBannerProps) {
    const { t } = useTranslation('generator');
    const { paperContext } = useWizard();

    if (!paperContext) return null;

    return (
        <div className="mb-3 rounded-md border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-[12px]">
            <div className="flex items-start gap-2">
                <BookOpen className="h-3.5 w-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-emerald-800 dark:text-emerald-200">
                        {t('paperContext.banner.headline', { title: paperContext.paperTitle })}
                    </p>
                    {stepHintKey && (
                        <p className="mt-0.5 text-emerald-700/80 dark:text-emerald-300/80">
                            {t(stepHintKey, { tone: t(`paperContext.tone.${paperContext.tone}`) })}
                        </p>
                    )}
                </div>
                <Link
                    to={`/dashboard/exegesis/${paperContext.paperId}`}
                    className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 font-medium shrink-0"
                >
                    {t('paperContext.banner.openPaper')}
                    <ExternalLink className="h-3 w-3" />
                </Link>
            </div>
        </div>
    );
}
