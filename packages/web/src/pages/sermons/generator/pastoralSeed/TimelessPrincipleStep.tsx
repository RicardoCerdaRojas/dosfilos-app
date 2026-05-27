import { useCallback, useState } from 'react';
import { pastoralSeedService } from '@dosfilos/application';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import {
    PASTORAL_SEED_THRESHOLDS,
    type PastoralSeed,
    type PrincipleVerification,
    type StepValidationResult,
    type TimelessPrincipleStepData,
    type AiAssistType,
} from '@dosfilos/domain';
import { StepShell } from './StepShell';
import { StepHelp } from './StepHelp';
import { useStepTimer } from './stepTimer';
import { useInlineCoreTripwire } from '@/hooks/useInlineCoreTripwire';

interface Props {
    passage: string;
    seed: PastoralSeed;
    data: TimelessPrincipleStepData;
    validation?: StepValidationResult;
    onChange: (patch: Partial<TimelessPrincipleStepData>) => void;
    onPasteEvent: (charsCount: number) => void;
    onLogAiAssist?: (assistType: AiAssistType, outputWasEditedByUser: boolean) => void;
}

const MIN_CHARS = PASTORAL_SEED_THRESHOLDS.timelessPrinciple.principleMinChars;

const RISK_LABEL: Record<PrincipleVerification['eisegesisRisk'], string> = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
};
const GENERALIZATION_LABEL: Record<PrincipleVerification['generalization'], string> = {
    'too-abstract': 'Demasiado abstracto (podría ser de cualquier texto)',
    'too-specific': 'Demasiado específico (difícil de transferir)',
    'well-calibrated': 'Bien calibrado',
    unknown: 'No determinado',
};

/**
 * Paso 7 — Principio Teológico Atemporal (NUEVO, ADR-022/023).
 *
 * The Kaiser *principlizing bridge* / Robinson exégesis→homilética bridge.
 * The principle is the timeless theological truth ("qué significa");
 * distinct from the central idea (paso 8 — the homiletical idea in the
 * preacher's voice). AI-FORBIDDEN field: the pastor writes it; the
 * assistant only *verifies* (grounding / eisegesis risk / generalization),
 * never generates. The Tier-1 inline tripwire (core-only) also runs here.
 */
export function TimelessPrincipleStep({
    passage,
    seed,
    data,
    validation,
    onChange,
    onPasteEvent,
    onLogAiAssist,
}: Props) {
    const [verifying, setVerifying] = useState(false);
    const tripwire = useInlineCoreTripwire();

    useStepTimer({
        enabled: true,
        onFlush: (delta) => {
            if (delta > 0) onChange({ timeSpentSeconds: (data.timeSpentSeconds ?? 0) + delta });
        },
    });

    const len = (data.principle ?? '').trim().length;

    const handleChange = (value: string) => {
        onChange({ principle: value });
        tripwire.check({ seed: { ...seed, timelessPrinciple: { ...data, principle: value } }, claimKey: 'principle', text: value });
    };

    const verify = useCallback(async () => {
        const principle = (data.principle ?? '').trim();
        if (principle.length < MIN_CHARS) return;
        setVerifying(true);
        try {
            const report = await pastoralSeedService.verifyTimelessPrinciple({
                passage: seed.passage,
                principle,
                centralIdea: seed.insight?.centralIdea ?? '',
                mainClauseNote: seed.structuralAnalysis?.mainClause?.pastorNote ?? '',
                wordStudies: (seed.wordStudies?.studies ?? []).map((w) => ({
                    word: w.word,
                    discovery: w.pastorDiscovery,
                })),
                parallels: (seed.recognition?.parallels ?? []).map((p) => ({
                    reference: p.reference,
                    note: p.relevanceNote,
                })),
                originalAudienceFunction: seed.function?.originalAudienceFunction ?? '',
            });
            onChange({ verificationReport: report });
            onLogAiAssist?.('eisegesisCheck', false);
        } catch (err) {
            console.error('[TimelessPrincipleStep] verify failed', err);
        } finally {
            setVerifying(false);
        }
    }, [data.principle, seed, onChange, onLogAiAssist]);

    const report = data.verificationReport;

    return (
        <StepShell
            stepNumber={7}
            title="Principio Teológico Atemporal"
            subtitle="El puente entre lo que el texto significó y lo que significa hoy. Lo escribes tú."
            passage={passage}
            validation={validation}
        >
            <div className="space-y-5">
                <StepHelp
                    label="¿Principio vs. idea central? Ver guía rápida"
                    examples={[
                        {
                            title: 'Distinción de Robinson',
                            body: (
                                <>
                                    <p>
                                        <span className="text-foreground">Principio atemporal:</span> la verdad
                                        teológica transcultural ("Dios justifica al pecador por gracia mediante
                                        la fe").
                                    </p>
                                    <p>
                                        <span className="text-foreground">Idea central (paso 8):</span> tu voz
                                        homilética para tu congregación ("Deja de cargar la culpa que Cristo ya
                                        cargó").
                                    </p>
                                </>
                            ),
                        },
                    ]}
                >
                    <p>
                        Destila la <span className="font-medium">verdad teológica atemporal</span> que tu
                        estudio (pasos 1-6) sostiene. No es todavía la aplicación ni el eslogan del sermón —
                        es el puente entre la exégesis y la predicación.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        El asistente NO escribe el principio por ti. Solo lo verifica después.
                    </p>
                </StepHelp>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">El principio teológico atemporal (tus palabras)</label>
                    <Textarea
                        placeholder="¿Qué verdad teológica transcultural enseña este texto? Fúndala en tu estudio, no en tu aplicación."
                        value={data.principle ?? ''}
                        onChange={(e) => handleChange(e.target.value)}
                        onPaste={(e) => {
                            const pasted = e.clipboardData.getData('text');
                            if (pasted) onPasteEvent(pasted.length);
                        }}
                        rows={4}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mínimo {MIN_CHARS} caracteres.</span>
                        <span>{len} / {MIN_CHARS}</span>
                    </div>
                </div>

                {/* Tier-1 inline tripwire (core-only, non-blocking) */}
                {tripwire.warning?.claimKey === 'principle' && (
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

                {/* Verifier — never generator */}
                <div className="space-y-2">
                    <Button variant="outline" size="sm" onClick={verify} type="button" disabled={verifying || len < MIN_CHARS}>
                        {verifying ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <ShieldCheck className="h-4 w-4 mr-2" />
                        )}
                        Verificar el principio
                    </Button>
                    {report && (
                        <div className="rounded-md border p-3 bg-card text-xs space-y-1.5">
                            <p>
                                <span className="font-medium text-foreground">Fundamento (pasos 1-6):</span>{' '}
                                {report.grounding || '—'}
                            </p>
                            <p>
                                <span className="font-medium text-foreground">Riesgo de eiségesis:</span>{' '}
                                {RISK_LABEL[report.eisegesisRisk]}
                            </p>
                            <p>
                                <span className="font-medium text-foreground">Generalización:</span>{' '}
                                {GENERALIZATION_LABEL[report.generalization]}
                            </p>
                            {report.notes && <p className="text-muted-foreground">{report.notes}</p>}
                        </div>
                    )}
                </div>
            </div>
        </StepShell>
    );
}
