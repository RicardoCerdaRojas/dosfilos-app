import type { PastoralWordAnalysisDoc, PastoralWordAnalysisCacheKey } from '../entities/PastoralWordAnalysis';

/**
 * Pastoral Fidelity Phase 1.5 — cache repository for `PastoralWordAnalysis`.
 *
 * Doc id is the deterministic string built from `buildCacheKey()`. The
 * cache is **transversal**: any user querying the same key reads the
 * same doc. Curated dataset bump (major SemVer) changes
 * `curatedVersion` and invalidates the cache without an explicit purge.
 */
export interface IPastoralWordAnalysisCacheRepository {
    findByKey(key: PastoralWordAnalysisCacheKey): Promise<PastoralWordAnalysisDoc | null>;
    save(doc: PastoralWordAnalysisDoc): Promise<void>;
}

/**
 * Deterministic doc-id builder. Both server (functions) and client (web)
 * can reproduce the same id without round-tripping. Used both as
 * Firestore doc id and as cache lookup key.
 */
export function buildPastoralWordAnalysisCacheKey(
    key: PastoralWordAnalysisCacheKey,
): string {
    return [key.language, key.lemma, key.passageHash, key.curatedVersion]
        .map((part) => part.replace(/__+/g, '_'))
        .join('__');
}
