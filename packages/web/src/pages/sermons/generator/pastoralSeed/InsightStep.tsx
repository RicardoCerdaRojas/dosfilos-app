import { AlertTriangle, ClipboardPaste, Lock, Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    InsightField,
    InsightStepData,
    PASTORAL_SEED_THRESHOLDS,
    PasteEvent,
    type PastoralSeed,
    StepValidationResult,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';
import { useInlineCoreTripwire } from '@/hooks/useInlineCoreTripwire';

interface Props {
    passage: string;
    seed: PastoralSeed;
    data: InsightStepData;
    validation?: StepValidationResult;
    onChange: (patch: Partial<InsightStepData>) => void;
    onPasteEvent: (event: PasteEvent) => void;
}

const T = PASTORAL_SEED_THRESHOLDS.insight;

/**
 * Paso 6 — Insight.
 *
 * AI-forbidden by design (ADR-002 + manifesto Step 5). No suggestions,
 * no chat panel, no autocomplete. The pastor produces:
 *  - Idea central (≥30 chars) — verbatim required in the final draft.
 *  - 3+ observaciones (≥40 chars each)
 *  - Pregunta abierta (≥30 chars)
 *  - Anécdota pastoral (≥80 chars)
 *  - Aplicación doxológica (manifiesto Paso 8, ≥80 chars)
 *
 * DOM paste events on any of the AI-forbidden fields are logged via
 * `onPasteEvent`. We never block paste (intrusive + frustrating for
 * normal flows like copying their own outline) — we audit it.
 */
export function InsightStep({ passage, seed, data, validation, onChange, onPasteEvent }: Props) {
    const tripwire = useInlineCoreTripwire();
    useStepTimer({
        enabled: true,
        onFlush: (delta) =>
            delta > 0 && onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta }),
    });

    const handleCentralIdeaChange = (value: string) => {
        onChange({ centralIdea: value });
        // Tier-1 inline tripwire (core-only, non-blocking) — ADR-023.
        tripwire.check({
            seed: { ...seed, insight: { ...data, centralIdea: value } },
            claimKey: 'centralIdea',
            text: value,
        });
    };

    const handlePaste = (field: InsightField) => (e: React.ClipboardEvent) => {
        const text = e.clipboardData?.getData('text') ?? '';
        if (!text) return;
        onPasteEvent({
            step: 'insight',
            field,
            charsCount: text.length,
            at: new Date(),
        });
    };

    const updateObservation = (i: number, value: string) => {
        const next = [...(data.observations ?? [])];
        next[i] = value;
        onChange({ observations: next });
    };

    const addObservation = () => {
        onChange({ observations: [...(data.observations ?? []), ''] });
    };

    const removeObservation = (i: number) => {
        const next = [...(data.observations ?? [])];
        next.splice(i, 1);
        onChange({ observations: next });
    };

    const observations = data.observations ?? [];
    const pasteCount = data.pasteEvents?.length ?? 0;

    return (
        <StepShell
            stepNumber={8}
            title="Insight"
            subtitle="Tu voz pastoral. Sin asistencia generativa. Esto es lo que el sistema desarrollará."
            passage={passage}
            validation={validation}
        >
            <div className="space-y-6">
                <StepHelp
                    label="¿Qué escribo en cada campo? Ver guía rápida"
                    examples={[
                        {
                            title: 'Idea central',
                            body: (
                                <p>
                                    "Cristo nos liberó de la condena por la obra perfecta del Espíritu en nuestra carne mortal."
                                </p>
                            ),
                        },
                        {
                            title: 'Aplicación doxológica',
                            body: (
                                <p>
                                    "Adorar al Dios cuya justicia cumplió en Cristo lo que nuestra carne nunca pudo. Vivir la libertad evangélica con santidad gozosa, no con resignación legalista."
                                </p>
                            ),
                        },
                    ]}
                >
                    <p>
                        Este paso es <span className="font-medium">tu voz pastoral</span>. NO hay asistencia AI aquí — el sermón se construye sobre lo que TÚ escribas en esta pantalla.
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                        <li><span className="text-foreground">Idea central</span>: una oración que sintetiza el sermón. Aparecerá VERBATIM en el borrador final.</li>
                        <li><span className="text-foreground">Observaciones</span>: 3+ verdades que el texto afirma. Cada una será una sección del sermón.</li>
                        <li><span className="text-foreground">Pregunta abierta</span>: la pregunta que tu sermón responde.</li>
                        <li><span className="text-foreground">Anécdota pastoral</span>: historia o ejemplo que conecta el texto con vida real.</li>
                        <li><span className="text-foreground">Aplicación doxológica</span>: a qué adoración, vida santa o ministerio fiel debe llevar este sermón (manifiesto Paso 8).</li>
                    </ul>
                </StepHelp>

                <div className="border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 p-4 rounded-r-md">
                    <p className="text-sm font-medium flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Lock className="h-4 w-4" />
                        Sin asistencia AI en este paso
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                        El borrador se construye sobre tus palabras exactas en esta pantalla. Si las pegas desde otra
                        herramienta, lo registramos para tu propio audit — no para juzgarte, sí para que sepas qué
                        tanto de tu sermón es realmente tuyo.
                    </p>
                    {pasteCount > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-center gap-1">
                            <ClipboardPaste className="h-3 w-3" /> {pasteCount} evento{pasteCount === 1 ? '' : 's'} de pegado registrado
                            {pasteCount === 1 ? '' : 's'} en esta sesión.
                        </p>
                    )}
                </div>

                <Field
                    label={`Idea central (1 oración, mínimo ${T.centralIdeaMinChars} caracteres)`}
                    hint="Aparecerá verbatim en tu sermón final. Sé preciso."
                    value={data.centralIdea}
                    min={T.centralIdeaMinChars}
                    rows={2}
                    onChange={handleCentralIdeaChange}
                    onPaste={handlePaste('centralIdea')}
                />
                {tripwire.warning?.claimKey === 'centralIdea' && (
                    <div className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" /> Revisa esta afirmación antes de seguir
                        </p>
                        <p className="text-amber-900/80 dark:text-amber-200/80 text-xs mt-1">
                            {tripwire.warning.reasoning}
                        </p>
                        <button
                            type="button"
                            onClick={tripwire.dismiss}
                            className="text-xs underline text-amber-700 dark:text-amber-400 mt-1"
                        >
                            Entendido
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">
                            Observaciones (mínimo {T.minObservations}, cada una ≥{T.observationMinChars} caracteres)
                        </label>
                        <Button variant="outline" size="sm" onClick={addObservation} type="button">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Agregar
                        </Button>
                    </div>
                    {observations.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                            Agrega tus observaciones — qué afirma el texto, qué exige, qué descarta.
                        </p>
                    )}
                    {observations.map((obs, i) => {
                        const len = obs.trim().length;
                        return (
                            <div key={i} className="border rounded-md p-3 space-y-1 bg-muted/20">
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground pt-2">#{i + 1}</span>
                                    <Textarea
                                        value={obs}
                                        rows={2}
                                        onChange={(e) => updateObservation(i, e.target.value)}
                                        onPaste={handlePaste('observations')}
                                        placeholder="Una observación del texto."
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeObservation(i)}
                                        type="button"
                                        aria-label="Eliminar observación"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-right text-xs text-muted-foreground">
                                    {len} / {T.observationMinChars}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <Field
                    label={`Pregunta abierta (mínimo ${T.openQuestionMinChars} caracteres)`}
                    hint="La pregunta que tu sermón ayudará a responder."
                    value={data.openQuestion}
                    min={T.openQuestionMinChars}
                    rows={2}
                    onChange={(v) => onChange({ openQuestion: v })}
                    onPaste={handlePaste('openQuestion')}
                />

                <Field
                    label={`Anécdota pastoral (mínimo ${T.pastoralAnecdoteMinChars} caracteres)`}
                    hint="Una historia, ejemplo o ilustración que conecta el texto con la vida real."
                    value={data.pastoralAnecdote}
                    min={T.pastoralAnecdoteMinChars}
                    rows={4}
                    onChange={(v) => onChange({ pastoralAnecdote: v })}
                    onPaste={handlePaste('pastoralAnecdote')}
                />

                <Field
                    label={`Aplicación doxológica (mínimo ${T.doxologicalApplicationMinChars} caracteres)`}
                    hint="¿A qué adoración, vida santa o ministerio fiel debe llevar este sermón? (Manifiesto Paso 8)"
                    value={data.doxologicalApplication}
                    min={T.doxologicalApplicationMinChars}
                    rows={4}
                    onChange={(v) => onChange({ doxologicalApplication: v })}
                    onPaste={handlePaste('doxologicalApplication')}
                />
            </div>
        </StepShell>
    );
}

interface FieldProps {
    label: string;
    hint?: string;
    value: string;
    min: number;
    rows: number;
    onChange: (value: string) => void;
    onPaste: (e: React.ClipboardEvent) => void;
}

function Field({ label, hint, value, min, rows, onChange, onPaste }: FieldProps) {
    const len = (value ?? '').trim().length;
    return (
        <div className="space-y-2">
            <label className="text-sm font-medium block">{label}</label>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {rows <= 2 ? (
                <Input
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    onPaste={onPaste}
                />
            ) : (
                <Textarea
                    value={value ?? ''}
                    rows={rows}
                    onChange={(e) => onChange(e.target.value)}
                    onPaste={onPaste}
                />
            )}
            <p className="text-right text-xs text-muted-foreground">
                {len} / {min}
            </p>
        </div>
    );
}
