import { useTranslation } from '@/i18n';
import type { BibleBookId, LibraryResourceScope } from '@dosfilos/domain';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { BibleBookMultiSelect } from './BibleBookMultiSelect';

interface ResourceMetadataEditorProps {
    coversBibleBooks: ReadonlyArray<BibleBookId>;
    scope: LibraryResourceScope;
    onCoversBibleBooksChange: (next: ReadonlyArray<BibleBookId>) => void;
    onScopeChange: (next: LibraryResourceScope) => void;
}

const SCOPE_OPTIONS: ReadonlyArray<LibraryResourceScope> = [
    'pericope',
    'book',
    'whole-testament',
    'whole-bible',
];

/**
 * v1.7 smart-match metadata sub-form: scope picker (4-option pill group)
 * + Bible-book multi-select. The book picker is hidden for scopes where
 * the per-book list isn't meaningful (`whole-bible` / `whole-testament`)
 * and a stub explanation is shown instead.
 *
 * Pure controlled component — caller owns the state and persistence.
 * Designed to embed inside `EditResourceModal` but kept independent
 * so a standalone "complete metadata" prompt could reuse it.
 */
export function ResourceMetadataEditor({
    coversBibleBooks,
    scope,
    onCoversBibleBooksChange,
    onScopeChange,
}: ResourceMetadataEditorProps) {
    const { t } = useTranslation('library');

    const showBookPicker = scope === 'book' || scope === 'pericope';

    return (
        <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="space-y-1.5">
                <Label className="text-[12.5px]">{t('metadataEditor.scopeLabel')}</Label>
                <div
                    className="grid grid-cols-2 gap-1.5"
                    role="radiogroup"
                    aria-label={t('metadataEditor.scopeLabel')}
                >
                    {SCOPE_OPTIONS.map(option => (
                        <ScopePill
                            key={option}
                            scope={option}
                            active={scope === option}
                            label={t(`metadataEditor.scope.${option}`)}
                            description={t(`metadataEditor.scopeHint.${option}`)}
                            onClick={() => {
                                onScopeChange(option);
                                // Whole-bible / whole-testament don't carry
                                // book-level metadata — clearing keeps the
                                // persistence layer self-consistent and
                                // avoids stale "covers HEB" on a BDAG-shaped doc.
                                if (option === 'whole-bible' || option === 'whole-testament') {
                                    if (coversBibleBooks.length > 0) onCoversBibleBooksChange([]);
                                }
                            }}
                        />
                    ))}
                </div>
            </div>

            {showBookPicker ? (
                <div className="space-y-1.5">
                    <Label className="text-[12.5px]">{t('metadataEditor.booksLabel')}</Label>
                    <BibleBookMultiSelect
                        selected={coversBibleBooks}
                        onChange={onCoversBibleBooksChange}
                    />
                    <p className="text-[10.5px] text-muted-foreground leading-snug">
                        {t('metadataEditor.booksHint')}
                    </p>
                </div>
            ) : (
                <p className="text-[10.5px] text-muted-foreground leading-snug pl-0.5">
                    {t('metadataEditor.booksNotApplicable')}
                </p>
            )}
        </div>
    );
}

interface ScopePillProps {
    scope: LibraryResourceScope;
    active: boolean;
    label: string;
    description: string;
    onClick: () => void;
}

function ScopePill({ active, label, description, onClick }: ScopePillProps) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            onClick={onClick}
            className={cn(
                'text-left rounded-md border px-2.5 py-1.5 transition-colors',
                active
                    ? 'border-info bg-info-subtle'
                    : 'border-border bg-card hover:border-foreground/30',
            )}
        >
            <div className={cn(
                'text-[12px] font-semibold',
                active ? 'text-info' : 'text-foreground',
            )}>
                {label}
            </div>
            <p className="text-[10.5px] text-muted-foreground leading-snug">
                {description}
            </p>
        </button>
    );
}
