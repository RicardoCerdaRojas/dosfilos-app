import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
    AiAssistType,
    ParallelRef,
    PASTORAL_SEED_THRESHOLDS,
    PastoralSeedTool,
    RecognitionStepData,
    StepValidationResult,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';
import { useCrossReferences } from '@/hooks/useCrossReferences';

interface Props {
    passage: string;
    data: RecognitionStepData;
    validation?: StepValidationResult;
    onChange: (patch: Partial<RecognitionStepData>) => void;
    onLogToolUsage: (tool: PastoralSeedTool) => void;
    /** Phase 2.5 (ADR-024 completion) — first-class assist audit. */
    onLogAiAssist?: (assistType: AiAssistType, outputWasEditedByUser: boolean) => void;
}

const T = PASTORAL_SEED_THRESHOLDS.recognition;

/**
 * Paso 4 — Reconocimiento.
 *
 * Surfaces TSK cross-reference suggestions (PR 0.5) + lets the pastor
 * add their own parallels. Each entry needs a relevanceNote ≥30 chars
 * — the pastor must articulate WHY the parallel matters, not just
 * accept the engine's link blindly. Engine suggestions are tagged
 * `cross-ref-engine-suggested` so audit + Phase 2 Testigo 2 can
 * distinguish "engine surfaced + pastor confirmed" from pastor-original.
 */
export function RecognitionStep({ passage, data, validation, onChange, onLogToolUsage, onLogAiAssist }: Props) {
    const { parallels: engineParallels, loading, error, refresh } = useCrossReferences(passage);
    const [draftRef, setDraftRef] = useState('');
    const [draftNote, setDraftNote] = useState('');
    const [loggedRefreshOnce, setLoggedRefreshOnce] = useState(false);

    useStepTimer({
        enabled: true,
        onFlush: (delta) =>
            delta > 0 && onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta }),
    });

    const parallels = data.parallels ?? [];

    const addParallel = (next: ParallelRef) => {
        if (parallels.length >= T.maxParallels) return;
        onChange({ parallels: [...parallels, next] });
    };

    const handleAddManual = () => {
        if (!draftRef.trim()) return;
        if (draftNote.trim().length < T.relevanceNoteMinChars) return;
        addParallel({
            reference: draftRef.trim(),
            relevanceNote: draftNote.trim(),
            source: 'pastor-suggested',
        });
        setDraftRef('');
        setDraftNote('');
    };

    const handleAcceptEngine = (ref: string) => {
        if (parallels.some((p) => p.reference === ref)) return;
        addParallel({
            reference: ref,
            relevanceNote: '',
            source: 'cross-ref-engine-suggested',
        });
        // ADR-024 completion (Phase 2.5): accepting a cross-ref engine
        // suggestion is a first-class assist. The pastor still writes the
        // relevanceNote themselves → output is edited, not verbatim.
        onLogAiAssist?.('crossRefEngine', true);
    };

    const handleRefresh = () => {
        if (!loggedRefreshOnce) {
            onLogToolUsage('cross-ref');
            setLoggedRefreshOnce(true);
        }
        void refresh();
    };

    const updateRelevance = (index: number, value: string) => {
        const next = [...parallels];
        next[index] = { ...next[index], relevanceNote: value };
        onChange({ parallels: next });
    };

    const removeParallel = (index: number) => {
        const next = [...parallels];
        next.splice(index, 1);
        onChange({ parallels: next });
    };

    return (
        <StepShell
            stepNumber={4}
            title="Reconocimiento"
            subtitle={`Encuentra ${T.minParallels}-${T.maxParallels} paralelos canónicos y anota por qué importan.`}
            passage={passage}
            validation={validation}
        >
            <div className="space-y-5">
                <StepHelp
                    label="¿Qué es un paralelo canónico? Ver guía rápida"
                    examples={[
                        {
                            title: 'Ejemplo: Romanos 8:1 ↔ Gálatas 5:1',
                            body: (
                                <>
                                    <p><span className="text-foreground">Referencia:</span> Gálatas 5:1</p>
                                    <p>
                                        <span className="text-foreground">Relevancia:</span> "Estad firmes en la libertad con que Cristo nos hizo libres" — desarrolla la misma doctrina de Romanos 8:1: el creyente está liberado de la condena legal. Pablo usa el mismo evangelio en dos cartas distintas; la convergencia confirma la lectura.
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        El <span className="font-medium">testimonio plural</span> es uno de los principios del manifiesto: ninguna doctrina sustantiva descansa sobre un solo versículo.
                    </p>
                    <p>
                        Selecciona 1-3 pasajes que <span className="font-medium">desarrollan, ilustran o confirman</span> la misma idea de tu pasaje principal. Pueden venir del motor (sugerencias automáticas) o de tu propio conocimiento bíblico.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Para cada paralelo escribe POR QUÉ es relevante — no solo cuál es. Esto fuerza convergencia exegética real, no proof-texting.
                    </p>
                </StepHelp>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium">Sugerencias del motor de paralelos</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            type="button"
                            disabled={loading}
                        >
                            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </Button>
                    </div>
                    {error && (
                        <p className="text-xs text-muted-foreground italic">
                            {error}. Puedes agregar paralelos manualmente abajo.
                        </p>
                    )}
                    {!error && engineParallels.length === 0 && !loading && (
                        <p className="text-xs text-muted-foreground italic">
                            Sin sugerencias del motor para este pasaje todavía.
                        </p>
                    )}
                    {engineParallels.length > 0 && (
                        <ul className="flex flex-wrap gap-2">
                            {engineParallels.slice(0, 12).map((p) => {
                                const ref = `${p.book} ${p.chapter}:${p.verse}`;
                                const accepted = parallels.some((x) => x.reference === ref);
                                return (
                                    <li key={ref}>
                                        <button
                                            type="button"
                                            disabled={accepted || parallels.length >= T.maxParallels}
                                            onClick={() => handleAcceptEngine(ref)}
                                            className={`text-xs px-2 py-1 border rounded-full transition-colors ${
                                                accepted
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 cursor-default'
                                                    : 'bg-muted/30 hover:bg-primary/10 hover:border-primary'
                                            }`}
                                        >
                                            {accepted ? '✓ ' : '+ '}{ref}{p.topic ? ` · ${p.topic}` : ''}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="border rounded-md p-4 space-y-3 bg-muted/20">
                    <p className="text-sm font-medium">Agregar paralelo manual</p>
                    <Input
                        placeholder="Referencia (ej. Gálatas 5:1)"
                        value={draftRef}
                        onChange={(e) => setDraftRef(e.target.value)}
                    />
                    <Textarea
                        placeholder={`¿Por qué este paralelo ilumina el pasaje? (mínimo ${T.relevanceNoteMinChars} caracteres)`}
                        value={draftNote}
                        onChange={(e) => setDraftNote(e.target.value)}
                        rows={3}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                            {draftNote.trim().length} / {T.relevanceNoteMinChars}
                        </span>
                        <Button
                            size="sm"
                            type="button"
                            disabled={parallels.length >= T.maxParallels}
                            onClick={handleAddManual}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                        </Button>
                    </div>
                </div>

                {parallels.length > 0 && (
                    <ul className="space-y-3">
                        {parallels.map((p, i) => (
                            <li key={`${p.reference}-${i}`} className="border rounded-md p-3 bg-card space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{p.reference}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                            {p.source === 'pastor-suggested' ? 'tú' : 'motor'}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeParallel(i)}
                                            type="button"
                                            aria-label="Eliminar paralelo"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <Textarea
                                    placeholder={`Nota de relevancia (≥${T.relevanceNoteMinChars} caracteres)`}
                                    value={p.relevanceNote}
                                    onChange={(e) => updateRelevance(i, e.target.value)}
                                    rows={2}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {p.relevanceNote.trim().length} / {T.relevanceNoteMinChars}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </StepShell>
    );
}
