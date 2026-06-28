/**
 * ADR-036 PR5 — merge del piso curado con la recuperación runtime (PURO).
 *
 * El perfil runtime (detector LLM) trae `common-misreading` SIN verificar (solo
 * presencia de ancla). El piso curado trae lecturas VERIFICADAS (verso existe +
 * refuta + revisadas). Esta función mergea con PRECEDENCIA del curado: si el
 * runtime detectó el mismo claim, gana la versión curada (verificada); si el
 * runtime lo perdió, el curado se agrega.
 *
 * PURO: no decide admisión ni verifica nada — recibe los features curados ya
 * admitidos (la app-layer corre `verifyAnchorVerse` autoritativo +
 * `decideAnchorAdmission` antes de llamar aquí). Aquí solo se combinan listas.
 */

import type { CommonMisreadingFeature, PassageProfile } from '../entities/PassageProfile';

/** Normaliza un claim para comparar precedencia (trim + minúsculas + espacios). */
function normalizeClaim(claim: string): string {
    return claim.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Mergea los `common-misreading` curados (ya admitidos) en el perfil, con
 * precedencia sobre los runtime del mismo claim. Devuelve un perfil NUEVO
 * (inmutable). Si `curated` está vacío, devuelve el perfil sin cambios.
 */
export function mergeCuratedMisreadings(
    profile: PassageProfile,
    curated: CommonMisreadingFeature[],
): PassageProfile {
    if (curated.length === 0) return profile;

    const curatedClaims = new Set(curated.map((c) => normalizeClaim(c.claim)));

    // Quita los runtime common-misreading cuyo claim el curado ya cubre
    // (precedencia). Otros tipos de feature quedan intactos.
    const kept = profile.features.filter((f) => {
        if (f.typeKey !== 'common-misreading') return true;
        return !curatedClaims.has(normalizeClaim(f.claim));
    });

    return { ...profile, features: [...kept, ...curated] };
}
