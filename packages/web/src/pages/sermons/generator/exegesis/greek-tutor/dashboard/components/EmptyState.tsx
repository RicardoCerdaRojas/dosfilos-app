import React from 'react';
import { useTranslation } from '@/i18n';
import { BookOpen, Sparkles } from 'lucide-react';

interface EmptyStateProps {
    onCreateNew: () => void;
    onQuickStart?: (passage: string) => void;
}

const SUGGESTED_PASSAGES = [
    { reference: 'Juan 1:1-5', description: 'El Verbo se hizo carne' },
    { reference: 'Juan 3:16', description: 'Porque de tal manera amó Dios...' },
    { reference: 'Romanos 8:1-4', description: 'Ninguna condenación' },
    { reference: '1 Corintios 13:1-3', description: 'El amor es...' },
    { reference: 'Filipenses 2:5-11', description: 'El himno de Cristo' },
    { reference: 'Hebreos 1:1-4', description: 'Dios habla por su Hijo' },
];

/**
 * Empty state for the Greek Tutor sessions dashboard
 * (`/dashboard/greek-tutor-dashboard`). Rendered when the user has
 * zero active sessions.
 *
 * Redesigned 2026-05-15 (fix/ux-iteration-batch-3) to:
 *  - drop the indigo/purple gradient icon-badge + CTA (not brand,
 *    not theme-aware)
 *  - drop the redundant "+ Nueva Sesión" CTA — the page header
 *    already carries that action; surfacing it twice in the same
 *    fold added noise without value. The suggested-passages grid
 *    becomes the primary affordance: each card IS a one-click
 *    session start
 *  - drop the bg-blue-50 / text-blue-900 tips block in favor of
 *    the warning-subtle semantic token pair so it adapts to dark mode
 *  - use brand primary throughout for icon, hover, and accent
 *
 * `onCreateNew` is kept in the props (unused here) to preserve the
 * upstream component contract — the dashboard parent expects it.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateNew: _onCreateNew, onQuickStart }) => {
    const { t } = useTranslation('greekTutor');

    return (
        <div className="flex flex-col items-center py-12 px-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6" />
            </div>

            <h2 className="font-serif text-2xl font-bold text-foreground mb-2 text-center">
                {t('emptyState.title')}
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                {t('emptyState.body')}
            </p>

            {onQuickStart && (
                <div className="w-full max-w-2xl">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t('emptyState.suggestedPassages')}
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {SUGGESTED_PASSAGES.map((passage) => (
                            <button
                                key={passage.reference}
                                onClick={() => onQuickStart(passage.reference)}
                                className="group p-4 rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                                <div className="flex items-center justify-between mb-1 gap-2">
                                    <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                        {passage.reference}
                                    </span>
                                    <BookOpen className="w-4 h-4 text-muted-foreground/70 group-hover:text-primary transition-colors shrink-0" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {passage.description}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-10 max-w-lg w-full">
                <div className="rounded-lg border border-warning/30 bg-warning-subtle/40 p-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-warning-subtle-foreground mb-1.5 inline-flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-warning" />
                        {t('emptyState.tipTitle')}
                    </h4>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                        {t('emptyState.tipBody')}
                    </p>
                </div>
            </div>
        </div>
    );
};
