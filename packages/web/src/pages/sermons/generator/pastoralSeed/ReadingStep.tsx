import { useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import {
    PASTORAL_SEED_THRESHOLDS,
    ReadingStepData,
    StepValidationResult,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';

interface Props {
    passage: string;
    data: ReadingStepData;
    suggestion?: string;
    validation?: StepValidationResult;
    onChange: (patch: Partial<ReadingStepData>) => void;
}

const MIN_CHARS = PASTORAL_SEED_THRESHOLDS.reading.firstImpressionMinChars;

/**
 * Paso 1 — Lectura.
 *
 * Manifesto Step 2 (texto ancla leído completo) + entry into Step 3
 * (observaciones exegéticas). The pastor records a first impression
 * after reading the passage — no AI suggestion, only the optional
 * `suggestion` block when the seed was pre-populated from a paper /
 * Faculty session (ADR-002 decision: pre-fill as editable hint, not
 * silent autocomplete).
 */
export function ReadingStep({ passage, data, suggestion, validation, onChange }: Props) {
    const accumulate = useCallback(
        (delta: number) => {
            if (delta <= 0) return;
            onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta });
        },
        [data.timeSpentSeconds, onChange],
    );
    useStepTimer({ enabled: true, onFlush: accumulate });

    const len = (data.firstImpression ?? '').trim().length;

    return (
        <StepShell
            stepNumber={1}
            title="Lectura"
            subtitle="Lee el pasaje completo. Escribe tu primera impresión con tus propias palabras."
            passage={passage}
            validation={validation}
        >
            <div className="space-y-3">
                <StepHelp
                    label="¿Qué escribo aquí? Ver guía rápida"
                    examples={[
                        {
                            title: 'Ejemplo',
                            body: (
                                <>
                                    <p>
                                        "Me llama la atención el contraste entre 'condenación' y 'libertad'. Pablo afirma algo absoluto: NINGUNA condenación. Surge la pregunta de cómo esto se sostiene si seguimos pecando — ¿qué hace que sea posible?"
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        Lee el pasaje completo (en RV1960 a la derecha). Sin estudiarlo todavía, escribe tu <span className="font-medium">primera reacción</span>:
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                        <li>¿Qué te impactó? ¿Qué imagen / palabra / contraste?</li>
                        <li>¿Qué preguntas surgen?</li>
                        <li>¿Qué sentiste / qué te confronta?</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                        Tu primera impresión es la entrada del Espíritu Santo a tu corazón pastoral. La exégesis viene después.
                    </p>
                </StepHelp>

                {suggestion && (
                    <div className="text-xs text-muted-foreground border-l-2 border-amber-400 pl-3 py-1">
                        <span className="font-medium text-amber-700 dark:text-amber-400">Sugerencia del paper/Faculty:</span>{' '}
                        {suggestion}
                        <button
                            type="button"
                            onClick={() => onChange({ firstImpression: suggestion })}
                            className="ml-2 underline text-primary"
                        >
                            usar como punto de partida
                        </button>
                    </div>
                )}
                <Textarea
                    placeholder="Después de leer el pasaje, ¿qué te llamó la atención? ¿Qué sentiste? ¿Qué preguntas surgen?"
                    value={data.firstImpression ?? ''}
                    onChange={(e) => onChange({ firstImpression: e.target.value })}
                    rows={6}
                    className="resize-y"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mínimo {MIN_CHARS} caracteres para continuar.</span>
                    <span>{len} / {MIN_CHARS}</span>
                </div>
            </div>
        </StepShell>
    );
}
