import { useCallback, useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    aplicarVerificacionCitasMvp,
    collectAfectoClaims,
    collectEstudioClaims,
    validarEstudioMadre,
    type AfectoVerdicts,
    type DoctrineLevel,
    type ElementoEstudio,
    type EstudioFidelidadResult,
    type EstudioWitnessVerdicts,
    type WitnessVerdict,
} from '@dosfilos/domain';

/**
 * Cristalización del Estudio Madre (spec v1.3 §2.4) — corre las puertas de
 * fidelidad reusando el MISMO callable de testigos que el sermón
 * (`validateSeedWitnesses`), sin forkear prompts: un motor, N fuentes.
 *
 * El callable solo hace las 3 llamadas LLM (puertas 1–3) y cachea en
 * `witnessResults/`; la escalación + las puertas estructurales (2 anti
 * proof-texting, 4 citas, 7 autoría) se componen client-side con
 * `validarEstudioMadre` (domain puro). Espeja a `useWitnessValidation`.
 */

interface RawVerdict {
    index: number;
    dissents: boolean;
    confidence: number;
    reasoning: string;
    evidence: string[];
}
interface RawConfessionVerdict extends RawVerdict {
    detectedLevel: DoctrineLevel | null;
}
interface WitnessesPayload {
    claimKeys: string[];
    context: RawVerdict[];
    parallels: RawVerdict[];
    confession: RawConfessionVerdict[];
}

export interface ValidarEstudioArgs {
    estudioId: string;
    /** Pasaje o doctrina ancla (va como `passage` del callable). */
    referencia: string;
    elementos: ElementoEstudio[];
    /** Respuestas del docente a bloqueos de testigos (cristalización). */
    resolutions?: ReadonlyArray<{ claimKey: string; response: string }>;
}

interface UseValidarEstudioMadreResult {
    result: EstudioFidelidadResult | null;
    loading: boolean;
    error: string | null;
    cacheHit: boolean;
    validar: (args: ValidarEstudioArgs) => Promise<EstudioFidelidadResult | null>;
    reset: () => void;
}

function toVerdict(witness: WitnessVerdict['witness'], raw: RawVerdict | undefined): WitnessVerdict {
    return {
        witness,
        dissents: raw?.dissents ?? false,
        reasoning: raw?.reasoning ?? '',
        evidence: raw?.evidence ?? [],
        confidence: raw?.confidence ?? 0,
    };
}

/** Verdict crudo del examen del corazón (sin `index`; el callable los entrega por clave). */
interface RawHeartVerdict {
    dissents: boolean;
    confidence: number;
    reasoning: string;
    evidence: string[];
}
interface RawHeartExamen {
    key: string;
    admisible: boolean;
    detectedLevel: DoctrineLevel | null;
    textual: RawHeartVerdict | null;
    temporal: RawHeartVerdict | null;
    root: (RawHeartVerdict & { detectedLevel: DoctrineLevel | null }) | null;
}

function heartVerdict(witness: WitnessVerdict['witness'], raw: RawHeartVerdict | null): WitnessVerdict {
    return {
        witness,
        dissents: raw?.dissents ?? false,
        reasoning: raw?.reasoning ?? '',
        evidence: raw?.evidence ?? [],
        confidence: raw?.confidence ?? 0,
    };
}

export function useValidarEstudioMadre(): UseValidarEstudioMadreResult {
    const [result, setResult] = useState<EstudioFidelidadResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cacheHit, setCacheHit] = useState(false);

    const reset = useCallback(() => {
        setResult(null);
        setError(null);
        setCacheHit(false);
    }, []);

    const validar = useCallback(async ({ estudioId, referencia, elementos, resolutions = [] }: ValidarEstudioArgs) => {
        const claims = collectEstudioClaims(elementos);
        // Puerta 4 MVP: derivar estado de citas sin verificador real.
        const elementosConCitas = aplicarVerificacionCitasMvp(elementos);

        // Sin afirmaciones que validar: las puertas estructurales (citas/autoría)
        // igual se computan, pero el estudio no puede ser `verde` (sin_auditar).
        if (claims.length === 0) {
            const r = validarEstudioMadre({ estudioId, elementos: elementosConCitas });
            setResult(r);
            return r;
        }

        // Examen del corazón (manifiesto §4): los afecto claims (corazón con traza
        // y proposición resuelta) van al callable `examenCorazon`; los huérfanos NO
        // llegan aquí (el dominio los confronta estructuralmente).
        const afectoClaims = collectAfectoClaims(elementos).claims;

        setLoading(true);
        setError(null);
        try {
            const fns = getFunctions();
            const callable = httpsCallable(fns, 'validateSeedWitnesses');
            // Los elementos `testigo` del estudio entran como paralelos sugeridos.
            const seedParallels = elementos
                .filter((e) => e.tipo === 'testigo' || e.tipo === 'testigo_historico')
                .map((e) => ({ reference: e.contenido.trim().slice(0, 120), note: '' }));
            const payload = {
                // El motor etiqueta seedId/sermonId; aquí ambos son el estudio.
                sermonId: estudioId,
                seedId: estudioId,
                passage: referencia,
                mode: 'full-gate' as const,
                confessionalWitnessesEnabled: true,
                claims: claims.map((c) => ({ key: c.key, kind: c.kind, text: c.text })),
                // Contexto neutro: el estudio no tiene oración principal/estudios de
                // palabras del seed; los testigos razonan sobre claim + paralelos.
                context: {
                    mainClauseRef: '',
                    mainClauseNote: '',
                    wordStudies: [],
                    originalAudienceFunction: '',
                },
                crossRefs: [],
                seedParallels,
            };
            // Doctrina (testigos del sermón reusados) + examen del corazón, en paralelo.
            const heartCall = afectoClaims.length > 0
                ? httpsCallable(fns, 'examenCorazon')({
                      estudioId,
                      afectos: afectoClaims.map((c) => ({
                          key: c.key,
                          afeccion: c.afeccion,
                          proposicionText: c.proposicionText,
                          caraAfectiva: c.caraAfectiva,
                          raizTeocentrica: c.raizTeocentrica,
                          puenteCongregacion: c.puenteCongregacion,
                      })),
                  })
                : Promise.resolve(null);

            const [response, heartResponse] = await Promise.all([callable(payload), heartCall]);
            const data = response.data as { witnesses: WitnessesPayload; cacheHit: boolean };
            const w = data.witnesses;

            const witnessVerdicts: EstudioWitnessVerdicts[] = claims.map((c, i) => {
                const conf = w.confession?.[i];
                return {
                    claimKey: c.key,
                    detectedLevel: conf?.detectedLevel ?? null,
                    verdicts: [
                        toVerdict('context', w.context?.[i]),
                        toVerdict('parallels', w.parallels?.[i]),
                        toVerdict('confession', conf),
                    ],
                };
            });

            let afectoVerdicts: AfectoVerdicts[] | undefined;
            if (heartResponse) {
                const hd = heartResponse.data as { examenes: RawHeartExamen[] };
                afectoVerdicts = (hd.examenes ?? []).map((e) => ({
                    claimKey: e.key,
                    admisible: e.admisible,
                    detectedLevel: e.detectedLevel ?? null,
                    // textual→context, temporal→parallels, raíz→confession (reusa el motor).
                    verdicts: e.admisible
                        ? [
                              heartVerdict('context', e.textual),
                              heartVerdict('parallels', e.temporal),
                              heartVerdict('confession', e.root),
                          ]
                        : [],
                }));
            }

            const composed = validarEstudioMadre({
                estudioId,
                elementos: elementosConCitas,
                witnessVerdicts,
                afectoVerdicts,
                resolutions,
            });
            setResult(composed);
            setCacheHit(Boolean(data.cacheHit));
            return composed;
        } catch (err: any) {
            console.error('[useValidarEstudioMadre]', err);
            setError(err?.message ?? 'No pudimos validar el estudio con las puertas de fidelidad.');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { result, loading, error, cacheHit, validar, reset };
}
