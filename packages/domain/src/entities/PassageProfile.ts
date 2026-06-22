/**
 * ADR-035 — Perfil del pasaje (Capa 1).
 *
 * Un análisis del TEXTO del pasaje, generado una vez al activar el estudio y
 * cristalizado en el seed (`schemaVersion`, reproducible). Detecta features
 * exegéticas (alusiones AT, lecturas erróneas frecuentes) + movimientos, para
 * condicionar el foco de los 8 pasos invariantes y, al cierre, verificar
 * cobertura. NO altera el spine: enruta a un paso existente (`routeToStep`).
 *
 * Regla dura anti-alucinación: una feature `hard` solo cuenta si trae un ANCLA
 * verificable (cita/cross-ref). `assemblePassageProfile` filtra las que no la
 * tienen — el detector LLM puede proponer, pero el dominio decide qué entra.
 *
 * Este módulo es PURO (sin LLM, sin Firestore). El detector vive en `functions`
 * (`profilePassage`); aquí solo se ensambla + valida la salida cruda.
 */

import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';
import type { PastoralSeedStepKey } from './PastoralSeed';

/** Versión del schema del perfil. Sube cuando cambie la forma persistida. */
export const PASSAGE_PROFILE_SCHEMA_VERSION = 1;

/**
 * `hard` = trae ancla verificable → elegible para el gate de cobertura
 * (`must-touch`). `soft` = interpretativa → solo nudge, nunca bloquea.
 */
export type FeatureKind = 'hard' | 'soft';

export type CoverageRule = 'must-touch' | 'nudge-only';

/** Claves del catálogo v1 (ADR-035 D4). El resto entra por dato en iteraciones. */
export type FeatureTypeKey = 'movements' | 'ot-allusion' | 'common-misreading';

/**
 * Entrada del catálogo de features — DATO, no código. El pipeline itera sobre
 * este catálogo; agregar/ajustar una feature = editar una entrada, nunca tocar
 * el pipeline. Espejea la composabilidad de `FidelityReport`.
 */
export interface FeatureType {
    key: FeatureTypeKey;
    kind: FeatureKind;
    /** El paso del spine que esta feature enriquece. */
    routeToStep: PastoralSeedStepKey;
    coverageRule: CoverageRule;
}

/** Catálogo v1 (ADR-035 D4): `ot-allusion` + `common-misreading` + `movements`. */
export const FEATURE_CATALOG_V1: Record<FeatureTypeKey, FeatureType> = {
    movements: {
        key: 'movements',
        kind: 'hard',
        routeToStep: 'structuralAnalysis',
        coverageRule: 'must-touch',
    },
    'ot-allusion': {
        key: 'ot-allusion',
        kind: 'hard',
        routeToStep: 'recognition',
        coverageRule: 'must-touch',
    },
    'common-misreading': {
        key: 'common-misreading',
        kind: 'soft',
        routeToStep: 'function',
        coverageRule: 'nudge-only',
    },
};

/**
 * CA2 (ADR-035) — tope de re-confront por clase de feature, como DATO (no
 * constante hardcodeada en el confront loop). El loop lee de aquí; cambiar el
 * tope no toca el loop.
 *
 * - `common-misreading`: 1 — soft con ancla, NO un hecho duro; máx 1 re-confront
 *   si la postura sustantiva aún contradice el ancla, luego override floor.
 * - `theological-tension`: 0 — no hay "mal"; re-confrontar sería imponer.
 *
 * (`genre-mismatch` NO está aquí: es un hecho duro que conserva su comportamiento
 * de confrontación sin tope, fuera del perfil.)
 */
export const RECONFRONT_CAPS: Record<'common-misreading' | 'theological-tension', number> = {
    'common-misreading': 1,
    'theological-tension': 0,
};

/** Ancla verificable: una referencia que sostiene (o corrige) una feature. */
export interface VerifiableAnchor {
    /** Referencia bíblica o textual, ej. "Proverbios 26:11" o "v.22". */
    reference: string;
    /** Nota corta opcional de por qué ancla. */
    note?: string;
}

/**
 * Movimiento del pasaje: una unidad preachable/argumental dentro del span.
 * Para pasajes grandes (15+ versos) el perfil los separa; un pasaje corto puede
 * tener uno solo.
 */
export interface Movement {
    /** Rango del movimiento, ej. "2 Pedro 2:10-16". */
    reference: string;
    /** Etiqueta breve del movimiento, ej. "acusación a los falsos maestros". */
    summary: string;
}

/** Alusión/cita del AT embebida en el pasaje (taxonomía Hays). Siempre `hard`. */
export interface OtAllusionFeature {
    typeKey: 'ot-allusion';
    /** quotation (con fórmula tipo γέγραπται) | allusion | echo. */
    hays: 'quotation' | 'allusion' | 'echo';
    /** Dónde en el pasaje aparece, ej. "v.22". */
    verseRef: string;
    summary: string;
    /** Texto fuente del AT — OBLIGATORIO (regla anti-alucinación). */
    anchor: VerifiableAnchor;
}

/** Lectura errónea frecuente del pasaje. Siempre `soft`, con ancla correctiva. */
export interface CommonMisreadingFeature {
    typeKey: 'common-misreading';
    /** Dónde dispara la mala lectura, ej. "v.20-22". */
    verseRef: string;
    /** La lectura errónea, ej. "el pasaje enseña que se pierde la salvación". */
    claim: string;
    /** Por qué es errónea (breve). */
    whyWrong: string;
    /** Anclas que la refutan — OBLIGATORIO ≥1 (regla anti-alucinación). */
    correctiveAnchor: VerifiableAnchor[];
}

export type DetectedFeature = OtAllusionFeature | CommonMisreadingFeature;

/** Perfil del pasaje cristalizado en el seed. */
export interface PassageProfile {
    schemaVersion: number;
    /** El pasaje perfilado (mirror de `PastoralSeed.passage`). */
    passage: string;
    /** Géneros deterministas del libro (de `inferGenreFromBook`). */
    genres: LiteraryGenre[];
    movements: Movement[];
    features: DetectedFeature[];
    /** Cuándo se generó (para auditoría/telemetría). */
    generatedAt: Date;
}

/** Salida cruda del detector LLM, antes de validar anclas. */
export interface RawPassageProfile {
    passage: string;
    movements: Movement[];
    features: DetectedFeature[];
}

/**
 * ¿La feature trae el ancla verificable que su `kind: hard` exige? Las `soft`
 * (misreading) exigen ≥1 ancla correctiva. El detector puede proponer features
 * sin ancla; el dominio las descarta — nunca se emite una feature sin sostén.
 */
export function isFeatureAnchored(feature: DetectedFeature): boolean {
    if (feature.typeKey === 'ot-allusion') {
        return Boolean(feature.anchor?.reference?.trim());
    }
    // common-misreading
    return feature.correctiveAnchor.some((a) => Boolean(a?.reference?.trim()));
}

/**
 * Ensambla el perfil final desde la salida cruda del detector + los géneros
 * deterministas del libro. Aplica la regla anti-alucinación: descarta toda
 * feature sin ancla verificable. Función PURA (sin LLM/IO).
 */
export function assemblePassageProfile(
    raw: RawPassageProfile,
    genres: LiteraryGenre[],
    generatedAt: Date,
): PassageProfile {
    return {
        schemaVersion: PASSAGE_PROFILE_SCHEMA_VERSION,
        passage: raw.passage,
        genres,
        movements: raw.movements ?? [],
        features: (raw.features ?? []).filter(isFeatureAnchored),
        generatedAt,
    };
}
