/**
 * ADR-035 Capa 2 — contrato de cobertura derivado del perfil del pasaje.
 *
 * Del `PassageProfile` (features + movimientos) sale un checklist de "lo que
 * ESTE pasaje exige tratar". Es lo que los nudges por paso surfacean y lo que el
 * colector de cobertura (Capa 3, Motor B) verifica al cierre. PURO, sin LLM/IO.
 *
 * El colector de cobertura (`computeCoverageSummary`) llega en el commit
 * siguiente; este archivo solo construye el contrato.
 */

import type {
    CoverageRule,
    FeatureTypeKey,
    PassageProfile,
} from '../entities/PassageProfile';
import type { PastoralSeedStepKey } from '../entities/PastoralSeed';
import type { FidelityGateStatus } from '../entities/FidelityReport';

/** Un ítem del checklist: algo que el pasaje demanda tratar en un paso. */
export interface CoverageItem {
    /** Id estable (para dedupe + referencia desde el reporte). */
    id: string;
    typeKey: FeatureTypeKey;
    /** Etiqueta legible para el nudge ("la alusión a Balaam (v.15)"). */
    label: string;
    /** Paso del spine que debería tratarlo. */
    routeToStep: PastoralSeedStepKey;
    coverageRule: CoverageRule;
    /**
     * Cadenas a buscar en el texto persistido del paso para decidir si se
     * "tocó". Anclas verificables primero (estables); el colector hace match
     * case-insensitive por substring.
     */
    matchHints: string[];
}

export interface CoverageContract {
    items: CoverageItem[];
}

function norm(s: string): string {
    return s.trim();
}

/** Construye el contrato de cobertura desde el perfil. Determinista. */
export function buildCoverageContract(profile: PassageProfile | undefined): CoverageContract {
    if (!profile) return { items: [] };
    const items: CoverageItem[] = [];

    // Movimientos → un ítem must-touch por movimiento (paso 3).
    profile.movements.forEach((m, i) => {
        items.push({
            id: `movement:${i}`,
            typeKey: 'movements',
            label: `el movimiento ${norm(m.reference)} (${norm(m.summary)})`,
            routeToStep: 'structuralAnalysis',
            coverageRule: 'must-touch',
            matchHints: [m.reference, m.summary].map(norm).filter(Boolean),
        });
    });

    profile.features.forEach((f, i) => {
        if (f.typeKey === 'ot-allusion') {
            items.push({
                id: `ot-allusion:${i}`,
                typeKey: 'ot-allusion',
                label: `la alusión a ${norm(f.anchor.reference)} (${norm(f.verseRef)})`,
                routeToStep: 'recognition',
                coverageRule: 'must-touch',
                // El ancla AT (verificable) + el verso son las marcas estables.
                matchHints: [f.anchor.reference, f.verseRef].map(norm).filter(Boolean),
            });
        } else {
            // common-misreading
            items.push({
                id: `common-misreading:${i}`,
                typeKey: 'common-misreading',
                label: `la lectura errónea "${norm(f.claim)}" (${norm(f.verseRef)})`,
                routeToStep: 'function',
                coverageRule: 'nudge-only',
                // Las anclas correctivas son las marcas estables de que la trató.
                matchHints: f.correctiveAnchor.map((a) => norm(a.reference)).filter(Boolean),
            });
        }
    });

    return { items };
}

// --- Capa 3: colector de cobertura sobre el Motor B (publish-gate) -----------

export const COVERAGE_REPORT_VERSION = 1;

export interface CoverageItemResult {
    id: string;
    typeKey: FeatureTypeKey;
    label: string;
    routeToStep: PastoralSeedStepKey;
    coverageRule: CoverageRule;
    touched: boolean;
}

/**
 * Sub-reporte componible de cobertura — colector sobre el Motor B (ADR-035 D5):
 * mismo `FidelityGateStatus` + se compone con `evaluatePublishGate`. NO es un
 * gate paralelo. NUNCA `hard-block`: la omisión de cobertura es nudge fuerte
 * (soft), no bloqueo (D1).
 */
export interface CoverageReport {
    version: number;
    items: CoverageItemResult[];
    mustTouchTotal: number;
    mustTouchUntouched: number;
    nudgeOnlyTotal: number;
    nudgeOnlyUnaddressed: number;
    gateStatus: FidelityGateStatus;
}

/** Texto persistido por paso (lo arma la app desde el seed). */
export type StepTexts = Partial<Record<PastoralSeedStepKey, string>>;

function isTouched(item: CoverageItem, stepTexts: StepTexts): boolean {
    const hay = (stepTexts[item.routeToStep] ?? '').toLowerCase();
    if (!hay) return false;
    return item.matchHints.some((h) => h.length > 0 && hay.includes(h.toLowerCase()));
}

/**
 * Verifica el contrato contra lo que el pastor tocó en cada paso. PURO: recibe
 * el texto por paso (no lee Firestore). Un ítem está "tocado" si alguna de sus
 * marcas (ancla verificable) aparece en el texto del paso al que enruta.
 */
export function computeCoverageSummary(
    contract: CoverageContract,
    stepTexts: StepTexts,
): CoverageReport {
    const items: CoverageItemResult[] = contract.items.map((it) => ({
        id: it.id,
        typeKey: it.typeKey,
        label: it.label,
        routeToStep: it.routeToStep,
        coverageRule: it.coverageRule,
        touched: isTouched(it, stepTexts),
    }));
    const mustTouch = items.filter((i) => i.coverageRule === 'must-touch');
    const nudgeOnly = items.filter((i) => i.coverageRule === 'nudge-only');
    const mustTouchUntouched = mustTouch.filter((i) => !i.touched).length;
    const nudgeOnlyUnaddressed = nudgeOnly.filter((i) => !i.touched).length;
    return {
        version: COVERAGE_REPORT_VERSION,
        items,
        mustTouchTotal: mustTouch.length,
        mustTouchUntouched,
        nudgeOnlyTotal: nudgeOnly.length,
        nudgeOnlyUnaddressed,
        // D1: omisión de cobertura = nudge fuerte (soft), NUNCA hard-block.
        gateStatus: mustTouchUntouched > 0 ? 'soft-block' : 'pass',
    };
}
