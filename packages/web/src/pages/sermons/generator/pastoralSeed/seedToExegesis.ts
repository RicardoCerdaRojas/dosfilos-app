import type { ExegeticalStudy, KeyWord, PastoralSeed } from '@dosfilos/domain';

/**
 * Synthesizes a legacy `ExegeticalStudy` payload from a completed
 * `PastoralSeed`. Required because the downstream `StepHomiletics`
 * + `StepDraft` plus `SermonGeneratorService.generateHomileticsPreview`
 * all consume the legacy `exegesis` field — under the pastoral
 * fidelity flow we never run `StepExegesis` (the ML free-text path),
 * so the seed becomes the canonical source.
 *
 * Mapping is lossy by design: the seed captures the pastor's own
 * voice (centralIdea, observations, anecdote, doxological application),
 * while `ExegeticalStudy` was built for ML-generated paragraphs.
 * Slots without a seed counterpart receive the most useful fallback
 * (e.g. literary context derives from the syntax note; historical
 * context derives from the function step). The `PRIMARY VOICE`
 * prompt block fed to the draft prompt later remains the authoritative
 * pastor input — this synth payload exists only to satisfy the
 * homiletics phase contract.
 */
export function seedToExegesis(seed: PastoralSeed): ExegeticalStudy {
    const keyWords: KeyWord[] = (seed.wordStudies?.studies ?? []).map((w) => ({
        original: w.word,
        transliteration: '',
        lemma: w.word,
        literalTranslation: '',
        morphology: '',
        syntacticFunction: '',
        significance: w.pastorDiscovery,
    }));

    const pastoralInsights = [
        ...(seed.insight?.observations ?? []),
        seed.insight?.openQuestion,
        seed.insight?.pastoralAnecdote,
        seed.insight?.doxologicalApplication,
    ].filter((s): s is string => !!s && s.trim().length > 0);

    // ADR-035 R3 — antes se descartaban; ahora viajan en la entidad para que el
    // bosquejo Y el borrador los consuman (el sermón ya no sale ciego a las
    // alusiones del pastor).
    const canonicalParallels = (seed.recognition?.parallels ?? [])
        .filter((p) => p.reference?.trim())
        .map((p) => ({ reference: p.reference.trim(), relevanceNote: p.relevanceNote ?? '' }));

    return {
        passage: seed.passage,
        context: {
            historical: seed.function?.originalAudienceFunction ?? '',
            literary: seed.structuralAnalysis?.mainClause?.pastorNote ?? '',
            audience: seed.function?.originalAudienceFunction ?? '',
        },
        keyWords,
        exegeticalProposition: seed.insight?.centralIdea ?? '',
        pastoralInsights,
        ...(canonicalParallels.length > 0 ? { canonicalParallels } : {}),
    };
}
