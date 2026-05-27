import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';
import type { KeyWordCandidate, WordStudyLanguage } from '@dosfilos/domain';

interface Props {
    candidates: KeyWordCandidate[];
    selectedLemma: string | null;
    language: WordStudyLanguage;
    onSelect: (candidate: KeyWordCandidate) => void;
}

/**
 * Phase 1.5 — renders the 5-8 LLM-ranked key word candidates as chips.
 * Pastor selects one to drill down. Chip styling adapts to language:
 * Greek renders as default `font-serif`; Hebrew renders `dir="rtl"` and
 * a slightly larger glyph so vocalization stays legible.
 */
export function KeyWordsPicker({ candidates, selectedLemma, language, onSelect }: Props) {
    const { t } = useTranslation('wordStudy');
    const isRtl = language === 'hebrew';

    return (
        <div className="space-y-3">
            <header className="space-y-1">
                <h4 className="text-sm font-semibold">{t('picker.title')}</h4>
                <p className="text-xs text-muted-foreground">{t('picker.hint')}</p>
            </header>
            <ul className="flex flex-wrap gap-2">
                {candidates.map((c) => {
                    const selected = selectedLemma === c.lemma;
                    return (
                        <li key={`${c.lemma}-${c.verseRef}`}>
                            <button
                                type="button"
                                onClick={() => onSelect(c)}
                                aria-pressed={selected}
                                className={cn(
                                    'group flex flex-col items-start gap-1 rounded-md border px-3 py-2 text-left transition',
                                    'hover:border-foreground/40 hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring',
                                    selected
                                        ? 'border-foreground/60 bg-muted'
                                        : 'border-border bg-card',
                                )}
                            >
                                <div className="flex items-baseline gap-2">
                                    <span
                                        dir={isRtl ? 'rtl' : 'ltr'}
                                        className={cn(
                                            'font-serif font-medium',
                                            isRtl ? 'text-lg' : 'text-base',
                                        )}
                                    >
                                        {c.word}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{c.transliteration}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <span>{c.verseRef}</span>
                                    <span aria-hidden>·</span>
                                    <span>
                                        {t('picker.weightLabel')}: {Math.round(c.theologicalWeight)}/10
                                    </span>
                                    {c.curatedBoostApplied && (
                                        <>
                                            <span aria-hidden>·</span>
                                            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                                <Sparkles className="h-2.5 w-2.5" />
                                                {t('picker.curatedBadge')}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {c.rationale && (
                                    <p className="text-[11px] leading-snug text-muted-foreground line-clamp-2">
                                        {c.rationale}
                                    </p>
                                )}
                                {selected && (
                                    <span className="text-[10px] font-medium text-foreground">
                                        {t('picker.selected')}
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
