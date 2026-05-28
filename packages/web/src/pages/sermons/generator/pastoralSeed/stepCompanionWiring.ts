import type { PastoralSeed, PastoralSeedStepKey } from '@dosfilos/domain';
import type { OrientStudyInput } from '@dosfilos/application';

/**
 * Phase 2.5 (ADR-026) — wiring helpers for the Study Companion's per-step
 * orientation. Kept out of `PastoralSeedWizard` to keep that orchestrator
 * lean.
 *
 * Orientable steps exclude `reading` + `insight` (the pastor's own voice)
 * and `timelessPrinciple` (which already has its own verifier). These are
 * the method steps where a method error (wrong genre, structural misreading,
 * exegetical leap) can be confronted.
 */
export const ORIENTABLE_STEPS: Record<string, OrientStudyInput['stepKey']> = {
    contextGenre: 'contextGenre',
    structuralAnalysis: 'structuralAnalysis',
    wordStudies: 'wordStudies',
    recognition: 'recognition',
    function: 'function',
};

/**
 * The pastor's current draft for a step — fed to the companion so it can
 * detect and confront a method error in what they already wrote.
 */
export function pastorInputForStep(seed: PastoralSeed, key: PastoralSeedStepKey): string {
    switch (key) {
        case 'contextGenre':
            return seed.contextGenre?.genreImplication ?? '';
        case 'structuralAnalysis':
            return seed.structuralAnalysis?.mainClause?.pastorNote ?? '';
        case 'wordStudies':
            return (seed.wordStudies?.studies ?? []).map((s) => `${s.word}: ${s.pastorDiscovery}`).join('\n');
        case 'recognition':
            return (seed.recognition?.parallels ?? []).map((p) => `${p.reference}: ${p.relevanceNote}`).join('\n');
        case 'function':
            return seed.function?.originalAudienceFunction ?? '';
        default:
            return '';
    }
}
