import { Check, BookOpen, Search } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { useNavigate } from 'react-router-dom';
import {
    getRecommendationId,
    type SourceRecommendation,
    type SourceType,
} from '@dosfilos/domain';
import { cn } from '@/lib/utils';
import { useOwnedRecommendations } from '@/hooks/exegesis/useOwnedRecommendations';
import { useTrackActivity } from '@/hooks/useTrackActivity';

interface RecommendationCardProps {
    recommendation: SourceRecommendation;
    /** Source type the recommendation was surfaced under — for telemetry. */
    sourceType: SourceType;
    /** Paper id for telemetry. */
    paperId: string;
}

/**
 * Single recommendation card surfaced under a rubric gap. Renders:
 *   - Title + author
 *   - Series · publisher · year
 *   - Optional rationale (one-liner explaining the work's contribution)
 *   - Tier badge (essential / recommended / standard) + language badge
 *   - Two actions:
 *       - "Ya la tengo" — toggles localStorage flag + telemetry event
 *       - "Buscar en mi biblioteca" — navigates to library with title prefilled
 *
 * Stateless beyond the owned toggle. Pure presentational + persistence
 * + telemetry. No data fetching here — the parent passes the shape.
 */
export function RecommendationCard({ recommendation, sourceType, paperId }: RecommendationCardProps) {
    const { t, i18n } = useTranslation('exegesis');
    const navigate = useNavigate();
    const { isOwned, toggle } = useOwnedRecommendations();
    const { trackActivity } = useTrackActivity();

    const recommendationId = getRecommendationId(recommendation);
    const owned = isOwned(recommendationId);
    const isSpanish = i18n.language?.toLowerCase().startsWith('es');

    const handleToggleOwned = () => {
        toggle(recommendationId);
        // Fire telemetry only when MARKING owned (the interesting
        // direction). Un-toggling is rare correction noise.
        if (!owned) {
            void trackActivity('feature_used', {
                feature: 'corpus_recommendations',
                action: 'recommendation_marked_owned',
                recommendationId,
                sourceType,
                paperId,
                tier: recommendation.tier,
            });
        }
    };

    const handleSearchLibrary = () => {
        // Use the first significant chunk of the title (drop subtitles
        // after a colon — too long for a search query). Authors aren't
        // included because library titles often don't carry the author.
        const titleQuery = recommendation.title.split(':')[0]!.trim();
        void trackActivity('feature_used', {
            feature: 'corpus_recommendations',
            action: 'recommendation_searched_library',
            recommendationId,
            sourceType,
            paperId,
            query: titleQuery,
        });
        navigate(`/dashboard/library?search=${encodeURIComponent(titleQuery)}`);
    };

    return (
        <article
            className={cn(
                'rounded-md border px-3 py-2.5 space-y-1.5 transition-colors',
                owned
                    ? 'border-success/40 bg-success-subtle/30'
                    : 'border-border bg-card hover:bg-accent/40',
            )}
        >
            <header className="flex items-start gap-2">
                <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium text-foreground leading-snug">
                        {recommendation.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                        {recommendation.author}
                    </p>
                    <p className="text-[10.5px] text-muted-foreground/80 leading-snug">
                        {[recommendation.series, recommendation.publisher, recommendation.year]
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>
                <TierBadge tier={recommendation.tier} t={t} />
            </header>

            {recommendation.rationale && (
                <p className="text-[11px] text-muted-foreground italic leading-snug pl-5">
                    {recommendation.rationale}
                </p>
            )}

            <div className="flex items-center justify-between gap-2 pl-5">
                <LanguageBadges
                    languages={recommendation.languages}
                    paperLanguage={isSpanish ? 'es' : 'en'}
                    t={t}
                />
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={handleToggleOwned}
                        className={cn(
                            'inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded font-medium transition-colors',
                            owned
                                ? 'text-success bg-success-subtle'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        )}
                        aria-pressed={owned}
                    >
                        <Check className={cn('h-2.5 w-2.5', !owned && 'opacity-0')} aria-hidden />
                        {t(owned ? 'paperSetup.subSteps.corpus.recommendations.ownedYes' : 'paperSetup.subSteps.corpus.recommendations.ownedNo')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSearchLibrary}
                        className="inline-flex items-center gap-1 text-[10.5px] px-1.5 py-0.5 rounded font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title={t('paperSetup.subSteps.corpus.recommendations.searchLibraryHint')}
                    >
                        <Search className="h-2.5 w-2.5" aria-hidden />
                        {t('paperSetup.subSteps.corpus.recommendations.searchLibrary')}
                    </button>
                </div>
            </div>
        </article>
    );
}

function TierBadge({
    tier,
    t,
}: {
    tier: SourceRecommendation['tier'];
    t: (key: string) => string;
}) {
    const toneClass = {
        essential: 'bg-success-subtle text-success-subtle-foreground border-success/30',
        recommended: 'bg-info-subtle text-info-subtle-foreground border-info/30',
        standard: 'bg-muted text-muted-foreground border-border',
    }[tier];
    return (
        <span
            className={cn(
                'shrink-0 text-[9.5px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded border',
                toneClass,
            )}
        >
            {t(`paperSetup.subSteps.corpus.recommendations.tier.${tier}`)}
        </span>
    );
}

function LanguageBadges({
    languages,
    paperLanguage,
    t,
}: {
    languages: ReadonlyArray<'es' | 'en' | 'de' | 'fr'>;
    paperLanguage: 'es' | 'en';
    t: (key: string, opts?: Record<string, unknown>) => string;
}) {
    if (languages.length === 0) return null;
    return (
        <div className="flex items-center gap-1">
            {languages.map(lang => (
                <span
                    key={lang}
                    className={cn(
                        'text-[9.5px] uppercase font-bold px-1 py-0.5 rounded',
                        lang === paperLanguage
                            ? 'bg-success-subtle text-success-subtle-foreground'
                            : 'bg-muted text-muted-foreground',
                    )}
                    title={t(`paperSetup.subSteps.corpus.recommendations.languageHint.${lang}`)}
                >
                    {lang}
                </span>
            ))}
        </div>
    );
}
