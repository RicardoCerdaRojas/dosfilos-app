import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { History, ExternalLink } from 'lucide-react';
import {
    FunctionStepData,
    PASTORAL_SEED_THRESHOLDS,
    PastoralSeedTool,
    StepValidationResult,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';

interface Props {
    passage: string;
    data: FunctionStepData;
    suggestion?: string;
    validation?: StepValidationResult;
    onChange: (patch: Partial<FunctionStepData>) => void;
    onLogToolUsage: (tool: PastoralSeedTool) => void;
}

const MIN = PASTORAL_SEED_THRESHOLDS.function.originalAudienceFunctionMinChars;

/**
 * Paso 5 — Función.
 *
 * Free-text on what the text did to its original audience. Faculty
 * historical mode is reachable from here as an optional consultation;
 * it opens in a new tab (deep-link) rather than embedding because the
 * Faculty session model is its own surface and embedding it would
 * conflict with the wizard's autosave loop.
 */
export function FunctionStep({ passage, data, suggestion, validation, onChange, onLogToolUsage }: Props) {
    const [acknowledgedFaculty, setAcknowledgedFaculty] = useState(false);

    useStepTimer({
        enabled: true,
        onFlush: (delta) =>
            delta > 0 && onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta }),
    });

    const len = (data.originalAudienceFunction ?? '').trim().length;

    const openFaculty = () => {
        if (!acknowledgedFaculty) {
            onLogToolUsage('faculty-historical');
            setAcknowledgedFaculty(true);
        }
        const url = `/dashboard/faculty?mode=historical&passage=${encodeURIComponent(passage)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <StepShell
            stepNumber={5}
            title="Función"
            subtitle="¿Qué hace este texto a su audiencia original? Pastoral, no exhaustivo."
            passage={passage}
            validation={validation}
        >
            <div className="space-y-4">
                <StepHelp
                    label="¿Qué pregunto aquí? Ver guía rápida"
                    examples={[
                        {
                            title: 'Ejemplo: Romanos 8:1-4 al lector original',
                            body: (
                                <>
                                    <p>
                                        "A los creyentes romanos divididos entre judíos y gentiles, este texto les declara una posición común: ambos grupos, antes condenados por la ley, ahora viven en Cristo sin condenación. Pablo consuela a los judeocristianos atormentados por su incapacidad de cumplir la ley, y a los gentiles que dudaban de su lugar en el pueblo de Dios. Les libera del legalismo y los une bajo un mismo Espíritu."
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        Antes de aplicar el texto a tu congregación, pregúntate: <span className="font-medium">¿qué hizo este texto a su PRIMERA audiencia?</span>
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                        <li>¿A quién escribía el autor?</li>
                        <li>¿Qué problema enfrentaba esa comunidad?</li>
                        <li>¿Qué emoción, convicción o llamado producía el texto en ellos?</li>
                        <li>¿Qué les exigía? ¿Qué les consolaba?</li>
                    </ul>
                    <p className="text-xs text-muted-foreground">
                        Esto evita aplicaciones forzadas o atemporales. La aplicación a tu congregación viene después, anclada en lo que el texto hizo originalmente.
                    </p>
                </StepHelp>

                {suggestion && (
                    <div className="text-xs text-muted-foreground border-l-2 border-amber-400 pl-3 py-1">
                        <span className="font-medium text-amber-700 dark:text-amber-400">Sugerencia derivada:</span>{' '}
                        {suggestion}
                        <button
                            type="button"
                            onClick={() => onChange({ originalAudienceFunction: suggestion })}
                            className="ml-2 underline text-primary"
                        >
                            usar como base
                        </button>
                    </div>
                )}

                <Textarea
                    placeholder="¿Qué emoción, convicción o llamado producía este texto en sus primeros oyentes? ¿Qué les exigía? ¿Qué les consolaba?"
                    value={data.originalAudienceFunction ?? ''}
                    onChange={(e) => onChange({ originalAudienceFunction: e.target.value })}
                    rows={8}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Mínimo {MIN} caracteres.</span>
                    <span>{len} / {MIN}</span>
                </div>

                <div className="border-t pt-3">
                    <Button variant="outline" size="sm" onClick={openFaculty} type="button">
                        <History className="h-4 w-4 mr-2" />
                        Consultar contexto histórico en Faculty
                        <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        Faculty se abre en nueva pestaña; tu progreso aquí se guarda automáticamente.
                    </p>
                </div>
            </div>
        </StepShell>
    );
}
