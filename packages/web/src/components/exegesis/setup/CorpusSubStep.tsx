import { FileStack } from 'lucide-react';
import { useTranslation } from '@/i18n';
import type { ExegeticalPaper } from '@dosfilos/domain';

/**
 * Corpus sub-step (Phase 2D placeholder shell).
 *
 * What lands here in 2D:
 *   - Granular `SourceType` picker grouped by family (Primary text,
 *     Lexical, Commentaries, Background, Methodological).
 *   - Per-type tooltip explaining what it is + examples (BDAG,
 *     WBC, deSilva, etc.) — pedagogical layer for novices.
 *   - Gap-detection card: "Tu rúbrica pide ≥2 commentary-critical;
 *     tenés 1. Faltan: 1 lexicon-technical, 1 historical-background."
 *     Computed by walking `paper.sources` against
 *     `paper.rubric.sourceRequirements`.
 *   - Suggested-source list (from a curated catalog) for each missing
 *     type — accepted in v1 as static suggestions; v1.5 may add
 *     "buy/find on Logos/online".
 *   - Generation gate: cannot proceed to writing without minimums met
 *     (or explicit waiver with reason).
 */
interface CorpusSubStepProps {
    paper: ExegeticalPaper;
}

export function CorpusSubStep({ paper }: CorpusSubStepProps) {
    const { t } = useTranslation('exegesis');
    const sourceCount = paper.sources.length;

    return (
        <div className="space-y-4">
            <header className="flex items-start gap-3">
                <FileStack className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {t('paperSetup.subSteps.corpus.heading')}
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('paperSetup.subSteps.corpus.description')}
                    </p>
                </div>
            </header>

            <div className="rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('paperSetup.subSteps.corpus.placeholderHint', { count: sourceCount })}
                </p>
            </div>
        </div>
    );
}
