import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightIcon, CheckIcon, ClockIcon, SearchIcon } from 'lucide-react';
import type { RecentVerse } from '../../hooks/useRecentVerses';

/**
 * Empty / idle state for the Discovery Mode page.
 *
 * ── Design language note ──────────────────────────────────────────────────
 * The curated quick-start verses use a per-record decorative gradient palette
 * (blue/amber/emerald/violet/rose/sky). This is an intentional data-driven
 * design palette for the suggestion cards — same architectural exception as
 * `colorMap` in the library `ResourceCard`, NOT ad-hoc colour literals.
 */

interface QuickVerse {
    book: string;
    chapter: number;
    verse: number;
    refKey: string;
    subtitleKey: string;
    grammar: string;
    words: number;
    levelKey: 'intro' | 'basic' | 'intermediate' | 'advanced';
    gradient: string;
    border: string;
    levelColor: string;
}

const TRANSLATION_QUICK_VERSES: ReadonlyArray<QuickVerse> = [
    {
        book: 'Gen', chapter: 1, verse: 1,
        refKey: 'Génesis 1:1', subtitleKey: 'gen11',
        grammar: 'Verbo Qal · Sust.', words: 7, levelKey: 'intro',
        gradient: 'from-blue-500/10 to-indigo-500/10',
        border: 'border-blue-500/20 hover:border-blue-500/40',
        levelColor: 'text-blue-600 dark:text-blue-400',
    },
    {
        book: 'Gen', chapter: 3, verse: 10,
        refKey: 'Génesis 3:10', subtitleKey: 'gen310',
        grammar: 'Qal Impf. · Estado constr.', words: 9, levelKey: 'intermediate',
        gradient: 'from-amber-500/10 to-orange-500/10',
        border: 'border-amber-500/20 hover:border-amber-500/40',
        levelColor: 'text-amber-600 dark:text-amber-400',
    },
    {
        book: 'Ps', chapter: 23, verse: 1,
        refKey: 'Salmos 23:1', subtitleKey: 'ps231',
        grammar: 'Participio · Sufijo pron.', words: 4, levelKey: 'basic',
        gradient: 'from-emerald-500/10 to-teal-500/10',
        border: 'border-emerald-500/20 hover:border-emerald-500/40',
        levelColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        book: 'Jonah', chapter: 1, verse: 1,
        refKey: 'Jonás 1:1', subtitleKey: 'jonah11',
        grammar: 'Wayyiqtol · Prepos.', words: 8, levelKey: 'intro',
        gradient: 'from-violet-500/10 to-purple-500/10',
        border: 'border-violet-500/20 hover:border-violet-500/40',
        levelColor: 'text-violet-600 dark:text-violet-400',
    },
    {
        book: 'Prov', chapter: 3, verse: 5,
        refKey: 'Proverbios 3:5', subtitleKey: 'prov35',
        grammar: 'Imperativo · Sufijo pron.', words: 6, levelKey: 'basic',
        gradient: 'from-rose-500/10 to-pink-500/10',
        border: 'border-rose-500/20 hover:border-rose-500/40',
        levelColor: 'text-rose-600 dark:text-rose-400',
    },
    {
        book: 'Isa', chapter: 6, verse: 1,
        refKey: 'Isaías 6:1', subtitleKey: 'isa61',
        grammar: 'Wayyiqtol · Hiphil', words: 12, levelKey: 'advanced',
        gradient: 'from-sky-500/10 to-cyan-500/10',
        border: 'border-sky-500/20 hover:border-sky-500/40',
        levelColor: 'text-sky-600 dark:text-sky-400',
    },
];

const FLOW_STEPS: ReadonlyArray<{ n: number; key: 'choose' | 'investigate' | 'compose' | 'compare'; icon: string }> = [
    { n: 1, key: 'choose', icon: '📖' },
    { n: 2, key: 'investigate', icon: '🔍' },
    { n: 3, key: 'compose', icon: '✍️' },
    { n: 4, key: 'compare', icon: '⚖️' },
];

interface DiscoveryEmptyStateProps {
    onQuickStart: (book: string, chapter: number, verse: number) => void;
    openMobileSheet: () => void;
    recents: RecentVerse[];
}

export const DiscoveryEmptyState: React.FC<DiscoveryEmptyStateProps> = ({ onQuickStart, openMobileSheet, recents }) => {
    const { t } = useTranslation('hebrewTutor');

    return (
        <div className="flex flex-col items-center justify-center h-full py-8 px-4 max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-2xl mb-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
                    <SearchIcon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {t('discovery.flow.title')}
                    </span>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-4 gap-2 mb-5">
                        {FLOW_STEPS.map((step) => (
                            <div key={step.n} className="flex flex-col items-center gap-1.5 text-center">
                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-base">
                                    {step.icon}
                                </div>
                                <div className="text-[10px] text-muted-foreground leading-tight font-medium">
                                    {t(`discovery.flow.steps.${step.key}`)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden sm:flex items-center justify-center gap-1 -mt-3 mb-4">
                        {FLOW_STEPS.map((_, i) => i < FLOW_STEPS.length - 1 && (
                            <React.Fragment key={i}>
                                <div className="flex-1 h-px bg-primary/30" />
                                <ArrowRightIcon className="w-3 h-3 text-primary/60 shrink-0" />
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="rounded-xl border border-primary/30 bg-background/60 p-4">
                        <div className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary">2</span>
                            {t('discovery.flow.investigating')}
                        </div>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-3xl font-hebrew text-primary" dir="rtl" lang="he">בָּרָא</span>
                                <span className="text-[10px] text-muted-foreground italic">bā-rāʾ</span>
                                <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full border">
                                    {t('discovery.flow.qalVerb')}
                                </span>
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="rounded-lg bg-muted/30 border border-border/40 px-3 py-2">
                                    <div className="text-[9px] text-muted-foreground mb-0.5">{t('discovery.flow.yourTranslation')}</div>
                                    <div className="text-xs text-foreground/40 italic">________________</div>
                                </div>
                                <div className="rounded-lg bg-success/10 border border-success/30 px-3 py-2 flex items-start gap-1.5">
                                    <CheckIcon className="w-3 h-3 text-success mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-[9px] text-success/80 mb-0.5">{t('discovery.flow.expertHidden')}</div>
                                        <div className="text-xs font-semibold text-success">{t('discovery.flow.expertExample')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {recents.length > 0 && (
                <div className="w-full max-w-2xl mb-5">
                    <div className="flex items-center gap-2 mb-2">
                        <ClockIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {t('discovery.recent')}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {recents.map((r) => (
                            <button
                                key={`${r.book}-${r.chapter}-${r.verse}`}
                                onClick={() => onQuickStart(r.book, r.chapter, r.verse)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40 text-sm text-foreground hover:bg-muted hover:border-primary/40 transition-all active:scale-[0.97]"
                            >
                                <span className="font-medium">{r.bookName} {r.chapter}:{r.verse}</span>
                                <ArrowRightIcon className="w-3 h-3 text-muted-foreground" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="w-full max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {t('discovery.suggested')}
                    </span>
                </div>

                <button
                    onClick={openMobileSheet}
                    className="md:hidden w-full group flex items-center justify-between p-4 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98] mb-3"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <SearchIcon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-semibold text-foreground text-sm">{t('discovery.empty.search')}</div>
                            <div className="text-xs text-muted-foreground">{t('discovery.empty.searchDesc')}</div>
                        </div>
                    </div>
                    <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {TRANSLATION_QUICK_VERSES.map((v) => (
                        <button
                            key={`${v.book}-${v.chapter}-${v.verse}`}
                            onClick={() => onQuickStart(v.book, v.chapter, v.verse)}
                            className={`group flex flex-col gap-2 p-3.5 rounded-2xl bg-gradient-to-br ${v.gradient} border ${v.border} shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-foreground text-sm leading-tight">{v.refKey}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                                        {t(`discovery.verses.${v.subtitleKey}.subtitle`)}
                                    </div>
                                </div>
                                <ArrowRightIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5" />
                            </div>
                            <div className="flex flex-col gap-1 pt-1 border-t border-border/20">
                                <div className={`text-[10px] font-semibold ${v.levelColor}`}>
                                    {t(`discovery.levels.${v.levelKey}`)}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{v.grammar}</div>
                                <div className="text-[10px] text-muted-foreground/70">
                                    {v.words} {t('discovery.words')}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
