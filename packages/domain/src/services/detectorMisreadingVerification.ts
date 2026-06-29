/**
 * ADR-036 PR6 — verificación de las lecturas erróneas del DETECTOR (runtime).
 *
 * El piso curado (PR5) ya es la garantía verificada. Esto cubre el OTRO lado: las
 * `common-misreading` que el detector LLM propone en runtime, ancladas solo por
 * PRESENCIA (`isFeatureAnchored`). Aquí se mide cuántas tienen un verso que de
 * verdad EXISTE (corte 1, determinista) y — bajo enforce — se DESCARTAN las que
 * no (anti-alucinación: el detector pudo inventar la referencia).
 *
 * PURO: recibe un predicado `verseExists` (la app-layer lo implementa con
 * `verifyAnchorVerse` + el repo bíblico). No hace IO.
 */

import type { CommonMisreadingFeature, PassageProfile } from '../entities/PassageProfile';

export type VerseExistsFn = (reference: string) => boolean;

function isMisreading(f: PassageProfile['features'][number]): f is CommonMisreadingFeature {
    return f.typeKey === 'common-misreading';
}

/** ¿La feature de misreading tiene ≥1 ancla cuyo verso existe? */
function hasVerifiedAnchor(f: CommonMisreadingFeature, verseExists: VerseExistsFn): boolean {
    return f.correctiveAnchor.some((a) => verseExists(a.reference));
}

export interface DetectorMisreadingStats {
    /** Cuántas common-misreading propuso el detector. */
    misreadingsTotal: number;
    /** Cuántas tienen ≥1 ancla con verso existente (corte 1). */
    misreadingsWithVerifiedAnchor: number;
    /** Total de anclas correctivas del detector. */
    anchorsTotal: number;
    /** Anclas cuyo verso existe. */
    anchorsVerified: number;
}

/** Métricas de sombra (corte 1) sobre las misreadings del detector. PURO. */
export function detectorMisreadingStats(
    profile: PassageProfile,
    verseExists: VerseExistsFn,
): DetectorMisreadingStats {
    let misreadingsTotal = 0;
    let misreadingsWithVerifiedAnchor = 0;
    let anchorsTotal = 0;
    let anchorsVerified = 0;
    for (const f of profile.features) {
        if (!isMisreading(f)) continue;
        misreadingsTotal += 1;
        let anyVerified = false;
        for (const a of f.correctiveAnchor) {
            anchorsTotal += 1;
            if (verseExists(a.reference)) {
                anchorsVerified += 1;
                anyVerified = true;
            }
        }
        if (anyVerified) misreadingsWithVerifiedAnchor += 1;
    }
    return { misreadingsTotal, misreadingsWithVerifiedAnchor, anchorsTotal, anchorsVerified };
}

/**
 * ENFORCE (verify-drop): devuelve un perfil sin las common-misreading del detector
 * cuyo ancla no resuelve a un verso real. Conserva las que tienen ≥1 ancla
 * verificada (y descarta las anclas individuales sin verso). Otros tipos intactos.
 * PURO, inmutable.
 */
export function dropUnverifiedDetectorMisreadings(
    profile: PassageProfile,
    verseExists: VerseExistsFn,
): PassageProfile {
    const features = profile.features
        .map((f) => {
            if (!isMisreading(f)) return f;
            const verifiedAnchors = f.correctiveAnchor.filter((a) => verseExists(a.reference));
            if (verifiedAnchors.length === 0) return null; // sin verso real → fuera
            return { ...f, correctiveAnchor: verifiedAnchors };
        })
        .filter((f): f is PassageProfile['features'][number] => f !== null);
    return { ...profile, features };
}
