import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ScrollText } from 'lucide-react';
import {
    LITERARY_GENRE_LABELS_ES,
    SELECTABLE_GENRES,
    inferGenreFromBook,
    isSentinelGenre,
    parsePassageReference,
    type LiteraryGenre,
} from '@dosfilos/domain';
import { useTranslation } from '@/i18n';

interface Props {
    /** Pasaje de la sesión guiada — de él se infiere la propuesta del libro. */
    passage: string;
    /** Registra el acto. Devuelve la procedencia resultante. */
    onPronounce: (genre: LiteraryGenre) => Promise<'userConfirmed' | 'userOverride' | null>;
    /** True mientras corre un turno — el selector no compite con el envío. */
    busy?: boolean;
}

/**
 * Redacción v2 0b-B (§4.4) — el ACTO sobre el género en el paso 2 guiado.
 *
 * El flujo conversacional no tenía forma de que el pastor CONFIRMARA el género:
 * el seed nacía con el inferido del libro y la procedencia se adivinaba
 * escaneando su prosa, que casi nunca nombra el género → cero `userConfirmed`
 * medidos en prod. Este selector es el mismo acto que el wizard ya tenía
 * (mismos 7 predicables del SSOT `SELECTABLE_GENRES`), traído a la superficie
 * donde el estudio realmente ocurre.
 *
 * Elegir ES confirmar. Un clic escribe el acto en el seed; la implicancia
 * interpretativa la sigue escribiendo el pastor en su propio mensaje.
 */
export function GuidedGenreSelector({ passage, onPronounce, busy }: Props) {
    const { t } = useTranslation('guidedSermon');
    const [chosen, setChosen] = useState<LiteraryGenre | null>(null);
    const [saving, setSaving] = useState<LiteraryGenre | null>(null);
    const [failed, setFailed] = useState(false);

    const proposedGenre = useMemo<LiteraryGenre | null>(() => {
        const parsed = parsePassageReference(passage);
        if (!parsed.ok) return null;
        return inferGenreFromBook(parsed.book.id);
    }, [passage]);

    // Centinela (gospel / mixed) → no se ofrece confirmar de un clic: el pastor
    // elige el predicable que gobierna SU perícopa (0b-A, §11.0).
    const proposedIsSentinel = proposedGenre != null && isSentinelGenre(proposedGenre);

    const pronounce = useCallback(
        async (genre: LiteraryGenre) => {
            if (busy || saving) return;
            setSaving(genre);
            setFailed(false);
            try {
                const provenance = await onPronounce(genre);
                if (provenance) setChosen(genre);
                else setFailed(true);
            } catch {
                setFailed(true);
            } finally {
                setSaving(null);
            }
        },
        [busy, saving, onPronounce],
    );

    return (
        <div className="rounded-lg border border-info/30 bg-info/5 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold text-info">
                <ScrollText className="h-4 w-4" />
                {t('genre.title')}
            </div>

            <div className="px-3 pb-3 space-y-3">
                {proposedGenre && !proposedIsSentinel && !chosen && (
                    <p className="text-[11px] text-muted-foreground">
                        {t('genre.proposal', { genre: LITERARY_GENRE_LABELS_ES[proposedGenre] })}
                    </p>
                )}
                {proposedIsSentinel && !chosen && (
                    <p className="text-[11px] text-foreground/80">{t('genre.sentinelHint')}</p>
                )}

                <div className="flex flex-wrap gap-2">
                    {SELECTABLE_GENRES.map((g) => (
                        <button
                            key={g}
                            type="button"
                            disabled={busy || saving !== null}
                            onClick={() => pronounce(g)}
                            className={
                                'rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-60 ' +
                                (chosen === g
                                    ? 'border-success bg-success/10 text-success font-medium'
                                    : 'border-muted bg-muted/30 text-muted-foreground hover:bg-primary/10')
                            }
                        >
                            {saving === g ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                LITERARY_GENRE_LABELS_ES[g]
                            )}
                        </button>
                    ))}
                </div>

                {chosen && (
                    <p className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('genre.confirmed', { genre: LITERARY_GENRE_LABELS_ES[chosen] })}
                    </p>
                )}
                {failed && <p className="text-xs text-destructive">{t('genre.error')}</p>}
                <p className="text-[11px] text-muted-foreground">{t('genre.thenWrite')}</p>
            </div>
        </div>
    );
}
