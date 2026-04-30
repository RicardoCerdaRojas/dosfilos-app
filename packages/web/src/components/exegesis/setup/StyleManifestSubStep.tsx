import { BookOpen } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ExegeticalPaper } from '@dosfilos/domain';

/**
 * Style guide manifest sub-step (Phase 2F placeholder shell).
 *
 * What lands here in 2F:
 *   - Surfaces the structured `StyleGuideManifest` extracted from
 *     the user's active style guide.
 *   - Renders sample citations (first mention, subsequent, ibid)
 *     using the manifest's templates so the student can verify what
 *     citations will look like in the generated paper.
 *   - Inline edit affordances for footnote templates, ibid label,
 *     block-quote threshold, quote marks.
 *   - "Re-extract" button if the manifest looks wrong and a newer
 *     model might do better.
 */
interface StyleManifestSubStepProps {
    paper: ExegeticalPaper;
}

export function StyleManifestSubStep({ paper }: StyleManifestSubStepProps) {
    const { t } = useTranslation('exegesis');

    return (
        <div className="space-y-4">
            <header className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {t('paperSetup.subSteps.manifest.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('paperSetup.subSteps.manifest.description')}
                    </p>
                </div>
            </header>

            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('paperSetup.subSteps.manifest.placeholderHint')}
                </p>
                {!paper.styleGuideId && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                        {t('paperSetup.subSteps.manifest.noGuide')}
                    </p>
                )}
            </div>
        </div>
    );
}
