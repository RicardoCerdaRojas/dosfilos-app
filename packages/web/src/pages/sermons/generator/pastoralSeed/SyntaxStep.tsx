import { useCallback, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import {
    PASTORAL_SEED_THRESHOLDS,
    PastoralSeedTool,
    StepValidationResult,
    SyntaxStepData,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';
import { SblgntPassagePanel } from './SblgntPassagePanel';

interface Props {
    passage: string;
    data: SyntaxStepData;
    suggestion?: string;
    validation?: StepValidationResult;
    onChange: (patch: Partial<SyntaxStepData>) => void;
    onLogToolUsage: (tool: PastoralSeedTool) => void;
}

const MIN_CHARS = PASTORAL_SEED_THRESHOLDS.syntax.pastorNoteMinChars;

/**
 * Paso 2 — Sintaxis.
 *
 * Pastor identifies the main clause of the pericope. The SBLGNT panel
 * surfaces the original Greek (read-only v1 per ADR decision); no
 * interactive clause analyzer in this phase. Pastor types the clause
 * reference + a personal note explaining what the clause does for the
 * passage's argument.
 */
export function SyntaxStep({ passage, data, suggestion, validation, onChange, onLogToolUsage }: Props) {
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

    const updateClause = (patch: Partial<SyntaxStepData['mainClause']>) => {
        onChange({
            mainClause: {
                reference: data.mainClause?.reference ?? '',
                pastorNote: data.mainClause?.pastorNote ?? '',
                ...patch,
            },
        });
    };

    const handleOpenOriginal = () => {
        if (!originalLanguageOpen) onLogToolUsage('canonical-analyzer');
        setOriginalLanguageOpen((open) => !open);
    };

    return (
        <StepShell
            stepNumber={2}
            title="Sintaxis"
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
                                        <span className="text-foreground">Nota:</span> "y el Verbo era Dios" — predicado nominal sin artículo, afirma la divinidad esencial del Logos. Las dos cláusulas previas (eternidad + relación con Dios) preparan esta afirmación climática.
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
                        placeholder="Ej: 'El Verbo era Dios' — predicado nominal sin artículo griego, afirma la divinidad esencial del Logos. Las cláusulas previas (eternidad, relación con Dios) preparan esta declaración climática."
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
