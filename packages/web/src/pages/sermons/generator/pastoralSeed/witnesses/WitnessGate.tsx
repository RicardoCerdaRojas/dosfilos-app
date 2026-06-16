import { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Loader2,
    ShieldCheck,
    Info,
    AlertTriangle,
    OctagonX,
    CheckCircle2,
    XCircle,
    Scale,
    ExternalLink,
    RefreshCw,
} from 'lucide-react';
import {
    canProceedFromWitnesses,
    WITNESS_THRESHOLDS,
    type EscalationLevel,
    type PastoralSeed,
    type WitnessVerdict,
    type WitnessedClaim,
    type WitnessResolution,
    type WitnessReview,
} from '@dosfilos/domain';
import { useWitnessValidation } from '@/hooks/useWitnessValidation';
import { useCrossReferences } from '@/hooks/useCrossReferences';
import { logDoxologicalShadow } from '@/lib/doxologicalShadow';
import { cn } from '@/lib/utils';

interface Props {
    seed: PastoralSeed;
    confessionalWitnessesEnabled: boolean;
    /** Clears the gate — parent persists the review + advances to the draft. */
    onProceed: (review: WitnessReview) => void;
    /** Sends the pastor back to Insight to revise an absolutely-blocked claim. */
    onReviseClaim: () => void;
    /** Back to the previous (Insight) step without revising. */
    onBack: () => void;
}

const WITNESS_LABEL: Record<WitnessVerdict['witness'], string> = {
    context: 'Testigo 1 · Contexto inmediato',
    parallels: 'Testigo 2 · Paralelos canónicos',
    confession: 'Testigo 3 · Tradición histórica',
};

const ESCALATION_META: Record<
    EscalationLevel,
    { label: string; Icon: typeof Info; cls: string; help: string }
> = {
    pass: {
        label: 'Sin objeciones',
        Icon: ShieldCheck,
        cls: 'text-emerald-700 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400',
        help: 'Los tres testigos concuerdan con tu lectura.',
    },
    note: {
        label: 'Nota informativa',
        Icon: Info,
        cls: 'text-sky-700 bg-sky-50 border-sky-300 dark:bg-sky-950/30 dark:text-sky-400',
        help: 'Un testigo levantó una observación. No bloquea; tómala en cuenta.',
    },
    'soft-block': {
        label: 'Requiere tu respuesta',
        Icon: AlertTriangle,
        cls: 'text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400',
        help: `Dos testigos disienten. Escribe una respuesta (≥${WITNESS_THRESHOLDS.softBlockResponseMinChars} caracteres) reconociendo o reformulando.`,
    },
    'hard-block': {
        label: 'Confrontación obligatoria',
        Icon: AlertTriangle,
        cls: 'text-orange-700 bg-orange-50 border-orange-400 dark:bg-orange-950/30 dark:text-orange-400',
        help: `Los tres testigos disienten. Consulta a Faculty y declara tu posición (≥${WITNESS_THRESHOLDS.hardBlockResponseMinChars} caracteres).`,
    },
    'absolute-block': {
        label: 'Límite cristiano clásico',
        Icon: OctagonX,
        cls: 'text-red-700 bg-red-50 border-red-400 dark:bg-red-950/30 dark:text-red-400',
        help: 'Esta afirmación tensiona un credo ecuménico (Nicea/Calcedonia). No hay anulación — revisa la afirmación.',
    },
};

function VerdictRow({ verdict }: { verdict: WitnessVerdict }) {
    const dissents = verdict.dissents && verdict.confidence >= WITNESS_THRESHOLDS.dissentConfidenceMin;
    return (
        <div className="flex gap-2 text-sm">
            <div className="mt-0.5 shrink-0">
                {dissents ? (
                    <XCircle className="h-4 w-4 text-amber-600" />
                ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
            </div>
            <div className="space-y-1">
                <p className="font-medium text-xs text-muted-foreground">{WITNESS_LABEL[verdict.witness]}</p>
                {verdict.reasoning && <p className="text-foreground">{verdict.reasoning}</p>}
                {verdict.evidence.length > 0 && (
                    <p className="text-xs text-muted-foreground">{verdict.evidence.join(' · ')}</p>
                )}
            </div>
        </div>
    );
}

const CLAIM_KIND_LABEL: Record<WitnessedClaim['kind'], string> = {
    centralIdea: 'Idea central',
    observation: 'Observación',
    doxologicalApplication: 'Aplicación doxológica',
};

function ClaimCard({
    claim,
    response,
    facultyConsulted,
    onResponseChange,
    onFacultyConsult,
}: {
    claim: WitnessedClaim;
    response: string;
    facultyConsulted: boolean;
    onResponseChange: (value: string) => void;
    onFacultyConsult: () => void;
}) {
    const meta = ESCALATION_META[claim.escalation];
    const { Icon } = meta;
    const needsResponse = claim.escalation === 'soft-block' || claim.escalation === 'hard-block';
    const isHard = claim.escalation === 'hard-block';
    const isAbsolute = claim.escalation === 'absolute-block';
    const min = isHard
        ? WITNESS_THRESHOLDS.hardBlockResponseMinChars
        : WITNESS_THRESHOLDS.softBlockResponseMinChars;
    const responseValid = response.trim().length >= min;

    return (
        <Card className={cn('p-4 space-y-3 border', isAbsolute ? 'border-red-400' : 'border-border')}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {CLAIM_KIND_LABEL[claim.kind]}
                        {typeof claim.index === 'number' ? ` #${claim.index + 1}` : ''}
                    </p>
                    <p className="font-medium text-foreground mt-0.5">&ldquo;{claim.text}&rdquo;</p>
                </div>
                <span className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shrink-0', meta.cls)}>
                    <Icon className="h-3.5 w-3.5" />
                    {meta.label}
                </span>
            </div>

            <p className="text-xs text-muted-foreground">{meta.help}</p>

            <div className="space-y-2 border-t pt-3">
                {claim.verdicts.map((v) => (
                    <VerdictRow key={v.witness} verdict={v} />
                ))}
            </div>

            {isAbsolute && (
                <div className="rounded-md bg-red-50 border border-red-300 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-300">
                    Esta afirmación no puede publicarse tal cual. Vuelve al Paso 6 (Insight) y reformúlala.
                </div>
            )}

            {needsResponse && (
                <div className="space-y-1.5">
                    {isHard && (
                        <a
                            href="/dashboard/faculty"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onFacultyConsult}
                            className="inline-flex items-center gap-1.5 text-sm text-orange-700 dark:text-orange-400 hover:underline"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Consultar a Faculty sobre este punto
                            {facultyConsulted && <span className="text-xs text-emerald-600">✓ consultado</span>}
                        </a>
                    )}
                    <Textarea
                        value={response}
                        onChange={(e) => onResponseChange(e.target.value)}
                        placeholder={
                            isHard
                                ? 'Consideré la objeción y mantengo / reformulo porque…'
                                : 'Reconozco / reformulo porque…'
                        }
                        rows={3}
                        className={cn(!responseValid && response.length > 0 && 'border-amber-400')}
                    />
                    <p className={cn('text-xs', responseValid ? 'text-emerald-600' : 'text-muted-foreground')}>
                        {response.trim().length}/{min} caracteres
                    </p>
                </div>
            )}
        </Card>
    );
}

/**
 * Phase 2 (ADR-011) — the three-witnesses validation gate. Runs after the
 * six-step seed completes and before the draft. Renders per-claim verdicts,
 * enforces escalation (note → soft-block → hard-block → absolute-block), and
 * collects the pastor's written responses. Only clears once every blocked
 * claim is resolved (and no absolute block remains).
 */
export function WitnessGate({ seed, confessionalWitnessesEnabled, onProceed, onReviseClaim, onBack }: Props) {
    const { result, loading, error, cacheHit, latencyMs, validate } = useWitnessValidation();
    const { parallels } = useCrossReferences(seed.passage);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [facultyConsulted, setFacultyConsulted] = useState<Record<string, boolean>>({});
    const [ran, setRan] = useState(false);
    const shadowLoggedRef = useRef(false);

    // Grieta doxológica — Capa 1 (modo sombra). WitnessGate solo monta cuando
    // `three_witnesses` está on, así que el gate doxológico ya corrió como
    // parte del one-shot. Reusamos ese `WitnessResult` (cero llamadas nuevas)
    // y registramos su veredicto en paralelo SIN tocar el bloqueo del one-shot.
    // `oneShotVerdict` = stance del one-shot sobre todos los claims (sin
    // overrides aún) → da el delta cross-flow contra el guiado.
    useEffect(() => {
        if (!result || shadowLoggedRef.current) return;
        shadowLoggedRef.current = true;
        const oneShot = canProceedFromWitnesses(result, []).allowed ? 'pass' : 'block';
        void logDoxologicalShadow({
            result,
            flow: 'wizard',
            witnessLatencyMs: latencyMs ?? 0,
            cacheHit,
            oneShotVerdict: oneShot,
        });
    }, [result, latencyMs, cacheHit]);

    const crossRefs = useMemo(
        () => parallels.map((p) => `${p.book} ${p.chapter}:${p.verse}${p.topic ? ` [${p.topic}]` : ''}`),
        [parallels],
    );

    // Run once on mount. Cross-refs may still be loading; that's fine —
    // T2 degrades to the pastor's own parallels when the engine is empty.
    useEffect(() => {
        if (ran) return;
        setRan(true);
        void validate({ seed, confessionalWitnessesEnabled, crossRefs });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ran]);

    const decision = useMemo(
        () =>
            result
                ? canProceedFromWitnesses(
                      result,
                      Object.entries(responses).map(([claimKey, response]) => ({ claimKey, response })),
                  )
                : null,
        [result, responses],
    );

    const handleProceed = () => {
        if (!result || !decision?.allowed) return;
        const resolutions: WitnessResolution[] = result.claims
            .filter((c) => c.escalation === 'soft-block' || c.escalation === 'hard-block')
            .map((c) => ({
                claimKey: c.key,
                escalation: c.escalation,
                response: (responses[c.key] ?? '').trim(),
                facultyConsulted: facultyConsulted[c.key] ?? false,
                resolvedAt: new Date(),
            }));
        onProceed({
            validatedAt: new Date(),
            overallEscalation: result.overallEscalation,
            resolutions,
            proceeded: true,
        });
    };

    if (loading || !result) {
        return (
            <Card className="p-8">
                <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[200px]">
                    {error ? (
                        <>
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                            <p className="text-sm text-center max-w-md">{error}</p>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onBack}>Volver</Button>
                                <Button onClick={() => void validate({ seed, confessionalWitnessesEnabled, crossRefs })}>
                                    <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-sm">Consultando a los tres testigos…</p>
                            <p className="text-xs text-center max-w-sm">
                                Contexto inmediato, paralelos canónicos y tradición histórica revisan tu idea central, observaciones y aplicación.
                            </p>
                        </>
                    )}
                </div>
            </Card>
        );
    }

    const absolute = result.claims.some((c) => c.escalation === 'absolute-block');

    return (
        <div className="space-y-4">
            <Card className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-600" />
                    <h2 className="text-base font-semibold">Validación por tres testigos</h2>
                    {cacheHit && <span className="text-xs text-muted-foreground">· resultado en caché</span>}
                </div>
                <p className="text-sm text-muted-foreground">
                    El sistema no afirma ni niega: contrasta tu estudio con el texto, los paralelos canónicos y el
                    testimonio histórico de la iglesia. Tú decides.
                </p>
                {!confessionalWitnessesEnabled && (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        Tienes los testigos confesionales desactivados — solo se validan las doctrinas ecuménicas
                        centrales. Actívalos en Ajustes para el contraste completo con las tradiciones.
                    </p>
                )}
            </Card>

            {result.claims.map((claim) => (
                <ClaimCard
                    key={claim.key}
                    claim={claim}
                    response={responses[claim.key] ?? ''}
                    facultyConsulted={facultyConsulted[claim.key] ?? false}
                    onResponseChange={(value) => setResponses((prev) => ({ ...prev, [claim.key]: value }))}
                    onFacultyConsult={() => setFacultyConsulted((prev) => ({ ...prev, [claim.key]: true }))}
                />
            ))}

            <footer className="flex flex-wrap items-center justify-between gap-3 px-1">
                <Button variant="outline" onClick={onBack}>Anterior</Button>
                {absolute ? (
                    <Button onClick={onReviseClaim} className="bg-red-600 hover:bg-red-700">
                        Revisar afirmación (Paso 6)
                    </Button>
                ) : (
                    <Button
                        onClick={handleProceed}
                        disabled={!decision?.allowed}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {decision?.allowed
                            ? 'Continuar al borrador →'
                            : 'Responde a los testigos para continuar'}
                    </Button>
                )}
            </footer>
        </div>
    );
}
