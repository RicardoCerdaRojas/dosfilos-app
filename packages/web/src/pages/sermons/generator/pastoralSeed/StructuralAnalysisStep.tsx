import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
    AiAssistType,
    PASTORAL_SEED_THRESHOLDS,
    PastoralSeedTool,
    StepValidationResult,
    StructuralAnalysisStepData,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';
import { SblgntPassagePanel } from './SblgntPassagePanel';

interface Props {
    passage: string;
    data: StructuralAnalysisStepData;
    suggestion?: string;
    validation?: StepValidationResult;
    onChange: (patch: Partial<StructuralAnalysisStepData>) => void;
    onLogToolUsage: (tool: PastoralSeedTool) => void;
    /** Phase 2.5 (ADR-024 completion) — first-class assist audit. */
    onLogAiAssist?: (assistType: AiAssistType, outputWasEditedByUser: boolean) => void;
}

const MIN_CHARS = PASTORAL_SEED_THRESHOLDS.structuralAnalysis.pastorNoteMinChars;

/**
 * Paso 3 — Análisis Estructural (antes "Sintaxis", ADR-022).
 *
 * Pastor identifies the main clause of the pericope (Kaiser *syntactical
 * display* / Schreiner *tracing the argument*). The SBLGNT panel surfaces
 * the original Greek (read-only v1); no interactive clause analyzer in
 * this phase. Pastor types the clause reference + a personal note
 * explaining what the clause does for the passage's argument.
 */
export function StructuralAnalysisStep({ passage, data, suggestion, validation, onChange, onLogToolUsage, onLogAiAssist }: Props) {
    const [originalLanguageOpen, setOriginalLanguageOpen] = useState(false);

    const accumulate = useCallback(
        (delta: number) => {
            if (delta <= 0) return;
            onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta });
        },
        [data.timeSpentSeconds, onChange],
    );
    useStepTimer({ enabled: true, onFlush: accumulate });

    const len = (data.mainClause?.pastorNote ?? '').trim().length;

    const updateClause = (patch: Partial<StructuralAnalysisStepData['mainClause']>) => {
        onChange({
            mainClause: {
                reference: data.mainClause?.reference ?? '',
                pastorNote: data.mainClause?.pastorNote ?? '',
                ...patch,
            },
        });
    };

    const handleOpenOriginal = () => {
        if (!originalLanguageOpen) {
            onLogToolUsage('canonical-analyzer');
            // ADR-024 completion (Phase 2.5): the original-language structural
            // display is a first-class assist. Read-only display → not edited.
            onLogAiAssist?.('structuralDisplay', false);
        }
        setOriginalLanguageOpen((open) => !open);
    };

    return (
        <StepShell
            stepNumber={3}
            title="Análisis Estructural"
            subtitle="Identifica la oración principal de la perícopa. Anota qué hace estructuralmente."
            passage={passage}
            validation={validation}
        >
            <div className="space-y-4">
                {suggestion && (
                    <div className="text-xs text-muted-foreground border-l-2 border-amber-400 pl-3 py-1">
                        <span className="font-medium text-amber-700 dark:text-amber-400">Sugerencia derivada:</span>{' '}
                        {suggestion}
                        <button
                            type="button"
                            onClick={() => updateClause({ pastorNote: suggestion })}
                            className="ml-2 underline text-primary"
                        >
                            usar como base
                        </button>
                    </div>
                )}

                <StepHelp
                    label="¿Qué es la oración principal? Ver guía rápida"
                    examples={[
                        {
                            title: 'Ejemplo: Romanos 8:1-4',
                            body: (
                                <>
                                    <p><span className="text-foreground">Referencia:</span> Romanos 8:1a</p>
                                    <p>
                                        <span className="text-foreground">Nota:</span> "Ahora, pues, ninguna condenación hay para los que están en Cristo Jesús" — indicativo declarativo, presente, establece el estado actual del creyente. Los versículos 2-4 son subordinados explicando POR QUÉ no hay condenación.
                                    </p>
                                </>
                            ),
                        },
                        {
                            title: 'Ejemplo: Juan 1:1',
                            body: (
                                <>
                                    <p><span className="text-foreground">Referencia:</span> Juan 1:1c</p>
                                    <p>
                                        <span className="text-foreground">Nota:</span> "y el Verbo era Dios" es la cláusula climática del versículo: la afirmación central que el resto del prólogo desarrolla. Las dos cláusulas previas ("en el principio era el Verbo", "el Verbo era con Dios") la preparan, sosteniéndola en eternidad + relación intratrinitaria. (El detalle léxico-morfológico va en el paso de Palabras clave.)
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        La <span className="font-medium">oración principal</span> es la frase que carga el peso del argumento de la perícopa.
                        Suele ser una declaración indicativa (afirma algo) más que una pregunta, exhortación o condicional secundaria.
                    </p>
                    <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Cómo identificarla</p>
                        <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                            <li>Busca el <span className="font-medium text-foreground">verbo principal</span> en indicativo.</li>
                            <li>Identifica la cláusula independiente (las que dependen de ella son subordinadas).</li>
                            <li>Pregúntate: si tuviera que resumir esta perícopa en una sola oración, ¿cuál sería?</li>
                        </ul>
                    </div>
                </StepHelp>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Referencia de la oración principal</label>
                    <p className="text-xs text-muted-foreground">
                        Ej. <span className="font-mono">Juan 1:1c</span> o <span className="font-mono">Romanos 8:1a</span> — usa letras (a/b/c) si la cláusula es parte de un versículo.
                    </p>
                    <Input
                        placeholder="Ej. Juan 1:1c"
                        value={data.mainClause?.reference ?? ''}
                        onChange={(e) => updateClause({ reference: e.target.value })}
                    />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">¿Qué afirma esta oración? ¿Qué carga del argumento lleva?</label>
                    <p className="text-xs text-muted-foreground">
                        Describe lo que el texto declara, qué peso teológico tiene, qué tipo de verbo es (indicativo / imperativo) y cómo el resto de la perícopa se ordena bajo esta oración.
                    </p>
                    <Textarea
                        placeholder="Ej: la cláusula 'el Verbo era Dios' es la afirmación central — declarativa, en posición climática. Las dos cláusulas previas ('en el principio era el Verbo', 'el Verbo era con Dios') la preparan y la sostienen. Todo lo que sigue en el prólogo desarrolla esta declaración. (El análisis léxico/morfológico va en el paso de Palabras clave.)"
                        value={data.mainClause?.pastorNote ?? ''}
                        onChange={(e) => updateClause({ pastorNote: e.target.value })}
                        rows={5}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mínimo {MIN_CHARS} caracteres.</span>
                        <span>{len} / {MIN_CHARS}</span>
                    </div>
                </div>

                <div>
                    <Button variant="outline" size="sm" onClick={handleOpenOriginal} type="button">
                        <Languages className="h-4 w-4 mr-2" />
                        {originalLanguageOpen ? 'Ocultar texto original' : 'Ver texto original (SBLGNT / MorphHB)'}
                    </Button>
                </div>
                {originalLanguageOpen && <SblgntPassagePanel passage={passage} />}
            </div>
        </StepShell>
    );
}
