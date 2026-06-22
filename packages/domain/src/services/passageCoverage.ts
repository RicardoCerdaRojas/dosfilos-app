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

import {
    FEATURE_CATALOG_V1,
    type CoverageRule,
    type DetectedFeature,
    type FeatureTypeKey,
    type PassageProfile,
} from '../entities/PassageProfile';
import type { PastoralSeed, PastoralSeedStepKey } from '../entities/PastoralSeed';
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

/** Palabras "ancla" del texto de una feature (>4 chars) para el match. */
function words(s: string): string[] {
    return norm(s)
        .split(/\s+/)
        .filter((w) => w.length > 4);
}

/** Label legible + marcas de match por tipo de feature. Exhaustivo (TS chequea). */
function describeFeature(f: DetectedFeature): { label: string; hints: string[] } {
    switch (f.typeKey) {
        case 'ot-allusion':
            return {
                label: `la alusión a ${norm(f.anchor.reference)} (${norm(f.verseRef)})`,
                hints: [f.anchor.reference, f.verseRef].map(norm).filter(Boolean),
            };
        case 'common-misreading':
            return {
                label: `la lectura errónea "${norm(f.claim)}" (${norm(f.verseRef)})`,
                hints: f.correctiveAnchor.map((a) => norm(a.reference)).filter(Boolean),
            };
        case 'illustration':
            return {
                label: `la ilustración "${norm(f.summary)}" (${norm(f.verseRef)})`,
                hints: [norm(f.verseRef), ...words(f.summary)].filter(Boolean),
            };
        case 'parallelism':
            return {
                label: `el paralelismo "${norm(f.summary)}" (${norm(f.verseRef)})`,
                hints: [norm(f.verseRef), ...words(f.summary)].filter(Boolean),
            };
        case 'named-entity':
            return {
                label: `${norm(f.name)} (${norm(f.verseRef)})`,
                hints: [norm(f.verseRef), ...words(f.name)].filter(Boolean),
            };
        case 'textual-crux':
            return {
                label: `el cruce textual "${norm(f.summary)}" (${norm(f.verseRef)})`,
                hints: [norm(f.verseRef), ...words(f.summary)].filter(Boolean),
            };
    }
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

    // Catalog-driven: route + coverageRule salen del catálogo (SSOT). Solo el
    // label + las marcas de match son per-tipo (describeFeature, exhaustivo).
    profile.features.forEach((f, i) => {
        const ft = FEATURE_CATALOG_V1[f.typeKey];
        const { label, hints } = describeFeature(f);
        items.push({
            id: `${f.typeKey}:${i}`,
            typeKey: f.typeKey,
            label,
            routeToStep: ft.routeToStep,
            coverageRule: ft.coverageRule,
            matchHints: hints,
        });
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

/**
 * Arma el texto persistido por paso desde el seed, para los pasos a los que el
 * catálogo v1 rutea features (structuralAnalysis / recognition / function). Es
 * lo que el colector escanea para decidir "tocado". Puro.
 */
export function buildCoverageStepTexts(seed: PastoralSeed): StepTexts {
    const mc = seed.structuralAnalysis?.mainClause;
    return {
        structuralAnalysis: [mc?.reference, mc?.pastorNote].filter(Boolean).join(' '),
        recognition: (seed.recognition?.parallels ?? [])
            .map((p) => `${p.reference}: ${p.relevanceNote}`)
            .join(' | '),
        function: seed.function?.originalAudienceFunction ?? '',
    };
}

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
