import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertTriangle, ArrowDownToLine, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/i18n';
import { useSuggestParallels } from '@/hooks/useSuggestParallels';

interface Props {
    passage: string;
    /** Prefills the chat input with a scaffolded parallel line for the chosen reference. */
    onInsert: (text: string) => void;
    /** True while a turn is being sent — collapses the helper out of the way. */
    busy?: boolean;
}

/**
 * Inline helper for guided Step 5 (Reconocimiento canónico). Surfaces candidate
 * parallel passages (LLM-suggested, covering any passage) so the pastor doesn't
 * leave the flow to find them. The pastor still writes WHY each one relates
 * (system = data, pastor = discovery).
 */
export function GuidedCrossRefHelper({ passage, onInsert, busy }: Props) {
    const { t } = useTranslation('guidedSermon');
    const [open, setOpen] = useState(true);
    const { parallels, loading, error } = useSuggestParallels(passage, open);

    // Collapse out of the way while the pastor's turn is processed.
    useEffect(() => {
        if (busy) setOpen(false);
    }, [busy]);

    return (
        <div className="rounded-lg border border-info/30 bg-info/5 overflow-hidden">
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-info hover:bg-info/10 transition-colors"
                aria-expanded={open}
            >
                {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <GitBranch className="h-4 w-4" />
                {t('crossRef.helperTitle')}
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-3 max-h-[46vh] overflow-y-auto">
                    <p className="text-[11px] text-muted-foreground">{t('crossRef.helperHint')}</p>

                    {loading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {t('crossRef.loading')}
                        </div>
                    )}
                    {error && !loading && (
                        <div className="flex items-start gap-2 text-xs text-destructive">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {!loading && !error && parallels.length === 0 && (
                        <p className="text-xs text-muted-foreground">{t('crossRef.empty')}</p>
                    )}

                    {!loading && !error && parallels.length > 0 && (
                        <ul className="space-y-1.5">
                            {parallels.map((p) => (
                                <li
                                    key={p.reference}
                                    className="flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-foreground">{p.reference}</span>
                                            {p.topic && (
                                                <Badge variant="secondary" className="text-[10px] font-normal">
                                                    {p.topic}
                                                </Badge>
                                            )}
                                        </div>
                                        {p.rationale && (
                                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{p.rationale}</p>
                                        )}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 gap-1.5 text-xs border-info/30 text-info hover:bg-info/10 shrink-0"
                                        onClick={() => onInsert(`${p.reference}: `)}
                                    >
                                        <ArrowDownToLine className="h-3.5 w-3.5" />
                                        {t('crossRef.useInAnswer')}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <p className="text-[11px] text-info-subtle-foreground bg-info-subtle/40 rounded px-2 py-1">
                        {t('crossRef.discoveryPrompt')}
                    </p>
                </div>
            )}
        </div>
    );
}
