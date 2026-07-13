import { useCallback, useMemo, useState } from 'react';
import { pastoralSeedService } from '@dosfilos/application';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, BookMarked, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
    ContextGenreStepData,
    inferGenreFromBook,
    isSentinelGenre,
    LITERARY_GENRE_LABELS_ES,
    type LiteraryGenre,
    parsePassageReference,
    PASTORAL_SEED_THRESHOLDS,
    SELECTABLE_GENRES,
    StepValidationResult,
    type AiAssistType,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';

interface Props {
    passage: string;
    data: ContextGenreStepData;
    validation?: StepValidationResult;
    onChange: (patch: Partial<ContextGenreStepData>) => void;
    /** Records a first-class assist log (ADR-024). No-ops if not wired. */
    onLogAiAssist?: (assistType: AiAssistType, outputWasEditedByUser: boolean) => void;
}

// 0b-A S2 — el selector consume el SSOT de dominio (predicables autorados), no las
// keys crudas del enum. Así los centinelas (gospel/mixed) y el stub (parable) quedan
// fuera de los chips por diseño, no por un filtro ad-hoc.
const GENRE_OPTIONS = SELECTABLE_GENRES;
const MIN_CHARS = PASTORAL_SEED_THRESHOLDS.contextGenre.genreImplicationMinChars;

/**
 * 0b-A S3 (§11.0) — cuando la inferencia del libro es un centinela (evangelio o
 * mixto) el libro NO rinde un género único: cambia por perícopa. No hay propuesta
 * que confirmar de un clic; el pastor elige el género que gobierna su pasaje.
 * Copy provisional (§4.4, deuda de UX pendiente de revisión del fundador).
 */
function sentinelGenreHint(genre: LiteraryGenre): string {
    if (genre === 'gospel') {
        return 'Los evangelios combinan relato, parábola y discurso: no hay un único género para todo el libro. Elige el que gobierna tu perícopa.';
    }
    return 'Este libro combina varios géneros según la sección. Elige el que gobierna tu perícopa.';
}

interface BackgroundChunk {
    text: string;
    source: string;
}

/**
 * Paso 2 — Contexto y Género (NUEVO, ADR-024).
 *
 * Genre governs the rules of reading, so it precedes structural analysis.
 * The assistant *proposes* the literary genre (deterministic book→genre
 * map, v1 — zero hallucination); the pastor confirms or overrides, then
 * writes the interpretive implication in their own words. Historical
 * background is retrieved via RAG over public-domain sources (ruta C) and
 * degrades gracefully when no material exists yet for the book.
 */
export function ContextGenreStep({ passage, data, validation, onChange, onLogAiAssist }: Props) {
    const [bgLoading, setBgLoading] = useState(false);
    const [bgChunks, setBgChunks] = useState<BackgroundChunk[] | null>(null);
    const [bgError, setBgError] = useState<string | null>(null);

    useStepTimer({
        enabled: true,
        onFlush: (delta) => {
            if (delta > 0) onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta });
        },
    });

    const proposedGenre = useMemo<LiteraryGenre | null>(() => {
        const parsed = parsePassageReference(passage);
        if (!parsed.ok) return null;
        return inferGenreFromBook(parsed.book.id);
    }, [passage]);

    const implicationLen = (data.genreImplication ?? '').trim().length;

    // 0b-A S3 — la inferencia del libro puede ser un centinela (gospel; mixed para
    // Daniel o libro no reconocido). En ese caso NO se confirma de un clic: el pastor
    // elige un predicable en los chips (la perícopa manda).
    const proposedIsSentinel = proposedGenre != null && isSentinelGenre(proposedGenre);

    const acceptProposed = useCallback(() => {
        // Nunca confirmar un centinela como género: el botón de propuesta solo aplica
        // a predicables. Guard en la fuente (el botón queda oculto cuando es centinela).
        if (!proposedGenre || isSentinelGenre(proposedGenre)) return;
        const edited = data.genre !== '' && data.genre !== proposedGenre;
        onChange({ genre: proposedGenre, genreConfirmed: true });
        onLogAiAssist?.('genreProposal', edited);
    }, [proposedGenre, data.genre, onChange, onLogAiAssist]);

    const selectGenre = (genre: LiteraryGenre) => {
        // Manual override of the proposal still counts as confirmed.
        onChange({ genre, genreConfirmed: true });
        if (proposedGenre && genre !== proposedGenre) onLogAiAssist?.('genreProposal', true);
    };

    const consultBackground = useCallback(async () => {
        setBgLoading(true);
        setBgError(null);
        try {
            const chunks = await pastoralSeedService.retrieveHistoricalContext(passage);
            setBgChunks(chunks);
            onChange({ historicalContextConsulted: true });
            if (chunks.length > 0) onLogAiAssist?.('historicalContext', false);
        } catch {
            // Degrade gracefully — the founder may not have ingested PD
            // background yet (ruta C). Never invents background with a
            // fake citation (§8 #7 del spec).
            setBgChunks([]);
            setBgError('Aún no hay material de trasfondo histórico para este libro.');
            onChange({ historicalContextConsulted: true });
        } finally {
            setBgLoading(false);
        }
    }, [passage, onChange, onLogAiAssist]);

    return (
        <StepShell
            stepNumber={2}
            title="Contexto y Género"
            subtitle="El género gobierna las reglas de lectura. Confirma el género antes de analizar la estructura."
            passage={passage}
            validation={validation}
        >
            <div className="space-y-5">
                <StepHelp
                    label="¿Por qué el género va primero? Ver guía rápida"
                    examples={[
                        {
                            title: 'Ejemplo: Salmos vs. Romanos',
                            body: (
                                <>
                                    <p>
                                        Un salmo (poesía) se lee con paralelismo e imágenes; una epístola
                                        (Romanos) se lee siguiendo el argumento lógico. Confundir el género
                                        lleva a leer poesía como tratado o tratado como poesía.
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        El <span className="font-medium">género literario</span> determina las reglas con
                        las que lees el texto. Por eso lo defines <span className="font-medium">antes</span>{' '}
                        del análisis estructural.
                    </p>
                </StepHelp>

                {/* Genre proposal + confirm */}
                <div className="border rounded-md p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        <p className="text-sm font-medium">Género literario</p>
                    </div>
                    {proposedGenre && !data.genreConfirmed && !proposedIsSentinel && (
                        <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>
                                Propuesta:{' '}
                                <span className="font-medium text-foreground">
                                    {LITERARY_GENRE_LABELS_ES[proposedGenre]}
                                </span>
                            </span>
                            <button type="button" onClick={acceptProposed} className="underline text-primary">
                                confirmar
                            </button>
                            <span>· o elige otro abajo</span>
                        </div>
                    )}
                    {proposedGenre && !data.genreConfirmed && proposedIsSentinel && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground/80">
                            {sentinelGenreHint(proposedGenre)}
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                        {GENRE_OPTIONS.map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => selectGenre(g)}
                                className={
                                    'rounded-full border px-3 py-1 text-xs transition-colors ' +
                                    (data.genre === g
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium'
                                        : 'border-muted bg-muted/30 text-muted-foreground hover:bg-primary/10')
                                }
                            >
                                {LITERARY_GENRE_LABELS_ES[g]}
                            </button>
                        ))}
                    </div>
                    {data.genreConfirmed && data.genre && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Género confirmado: {LITERARY_GENRE_LABELS_ES[data.genre as LiteraryGenre]}
                        </p>
                    )}
                    {/* Non-blocking mismatch note: the pastor chose a genre that
                        differs from the assistant's proposal for this book. Verifier,
                        not generator — surface the contrast, let the pastor decide. */}
                    {data.genreConfirmed &&
                        proposedGenre &&
                        data.genre &&
                        data.genre !== proposedGenre &&
                        !proposedIsSentinel && (
                            <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
                                <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Revisa el género antes de seguir
                                </p>
                                <p className="text-amber-900/80 dark:text-amber-200/80 mt-1">
                                    Para este libro el asistente esperaría{' '}
                                    <span className="font-medium">{LITERARY_GENRE_LABELS_ES[proposedGenre]}</span>, no{' '}
                                    <span className="font-medium">{LITERARY_GENRE_LABELS_ES[data.genre as LiteraryGenre]}</span>.
                                    Las reglas de lectura cambian mucho entre géneros: una epístola sigue un
                                    argumento; una profecía anuncia juicio/restauración. Si fue intencional, perfecto;
                                    si no, ajústalo.
                                </p>
                                <button
                                    type="button"
                                    onClick={acceptProposed}
                                    className="mt-1 underline text-amber-700 dark:text-amber-400"
                                >
                                    Usar {LITERARY_GENRE_LABELS_ES[proposedGenre]}
                                </button>
                            </div>
                        )}
                </div>

                {/* Genre implication — human */}
                <div className="grid gap-2">
                    <label className="text-sm font-medium">
                        ¿Qué implica este género para leer el pasaje? (tu lectura)
                    </label>
                    <p className="text-xs text-muted-foreground">
                        Ej: "Como es narrativa, no busco un mandato directo sino el patrón de cómo Dios
                        actúa con su pueblo, y leo el detalle a la luz del arco del relato."
                    </p>
                    <Textarea
                        placeholder="Escribe qué reglas de lectura impone este género sobre tu pasaje."
                        value={data.genreImplication ?? ''}
                        onChange={(e) => onChange({ genreImplication: e.target.value })}
                        rows={4}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mínimo {MIN_CHARS} caracteres.</span>
                        <span>{implicationLen} / {MIN_CHARS}</span>
                    </div>
                </div>

                {/* Book location — human, optional */}
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Ubicación de la perícopa en el libro (opcional)</label>
                    <Textarea
                        placeholder="¿Dónde está esta perícopa en el argumento/relato del libro? ¿Qué la precede y qué sigue?"
                        value={data.bookLocationNote ?? ''}
                        onChange={(e) => onChange({ bookLocationNote: e.target.value })}
                        rows={3}
                    />
                </div>

                {/* Historical-cultural background — RAG, degrade-first */}
                <div className="space-y-2">
                    <Button variant="outline" size="sm" onClick={consultBackground} type="button" disabled={bgLoading}>
                        {bgLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <BookMarked className="h-4 w-4 mr-2" />
                        )}
                        Consultar trasfondo histórico-cultural
                    </Button>
                    {bgError && <p className="text-xs text-muted-foreground">{bgError}</p>}
                    {bgChunks && bgChunks.length > 0 && (
                        <ul className="space-y-2">
                            {bgChunks.map((c, i) => (
                                <li key={i} className="border rounded-md p-3 bg-card text-xs">
                                    <p className="text-muted-foreground">{c.text}</p>
                                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                        Fuente: {c.source}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </StepShell>
    );
}
