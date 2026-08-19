import { useCallback, useRef } from 'react';
import {
    evaluateStructuralSufficiency,
    MISREADING_MIN_SUBSTANCE_CHARS,
    STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN,
    type PastoralSeed,
} from '@dosfilos/domain';
import { passageProfileShadowService } from '@dosfilos/application';
import { usePassageProfileGate } from '@/hooks/usePastoralFidelityGate';

/**
 * Redacción v2 §4.5 — instrumentación de sombra del SPINE A (el wizard).
 *
 * Hasta ahora la vara de suficiencia estructural solo se medía en el spine
 * socrático (Faculty): un estudio hecho en el wizard no dejaba ninguna fila en
 * `passageProfileShadow`, así que la calibración del gate leía un universo que
 * excluía a la superficie más usada. Mismo contrato, misma colección, mismo
 * `signalType` — la sombra deja de depender de por dónde entró el pastor.
 *
 * Disciplina heredada del spine socrático, deliberadamente idéntica:
 * - Corre bajo `passage_profile` (el flag de MEDICIÓN), nunca gatea nada.
 * - Fire-and-forget: un fallo del recorder jamás bloquea al pastor.
 * - Muestreo determinista por `seedId` con el knob del dominio (hoy N=1).
 * - Solo con nota sustantiva (mismo umbral que el turno socrático).
 * - El veredicto es DETERMINISTA (dominio puro, sin LLM).
 */
export function usePastoralSeedShadow() {
    const passageProfileGate = usePassageProfileGate();
    // Un estudio pasa por el paso 3 varias veces (ir y volver con el breadcrumb).
    // La sombra mide el ACTO de cerrar el paso, no cada visita: una fila por seed
    // y sesión, o el conteo de "cuántos analizaron" se infla solo.
    const emitted = useRef<Set<string>>(new Set());

    const recordStructuralSufficiency = useCallback(
        (seed: PastoralSeed | null | undefined) => {
            if (!passageProfileGate.enabled || !seed?.id) return;
            if (emitted.current.has(seed.id)) return;

            const note = seed.structuralAnalysis?.mainClause?.pastorNote?.trim() ?? '';
            if (note.length < MISREADING_MIN_SUBSTANCE_CHARS) return;
            if (!shouldSample(seed.id)) return;

            const qualifiedGenre = seed.contextGenre?.genre ?? '';
            emitted.current.add(seed.id);

            void passageProfileShadowService
                .recordStructuralSufficiency({
                    seedId: seed.id,
                    passage: seed.passage,
                    qualifiedGenre,
                    provenance: seed.contextGenre?.genreProvenance ?? 'aiProposed',
                    verdict: evaluateStructuralSufficiency(qualifiedGenre, note),
                    overrideTargetGenre: seed.contextGenre?.genreOverrideTarget ?? null,
                })
                .catch((err) => {
                    // Non-blocking por diseño: se permite reintentar más adelante.
                    emitted.current.delete(seed.id);
                    console.warn('[usePastoralSeedShadow] structural sufficiency shadow failed', err);
                });
        },
        [passageProfileGate.enabled],
    );

    return { recordStructuralSufficiency };
}

/** Muestreo determinista por seedId — mismo knob de dominio que el spine socrático. */
function shouldSample(seedId: string): boolean {
    if (STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN <= 1) return true;
    let h = 0;
    for (let i = 0; i < seedId.length; i++) h = (h * 31 + seedId.charCodeAt(i)) | 0;
    return Math.abs(h) % STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN === 0;
}
