import type { LexiconSource, WordStudyLanguage } from '../entities/PastoralWordAnalysis';
import type { WordStudy } from '../entities/PastoralSeed';
import type { AttributionBlock } from './aggregateRequiredAttributions';

/**
 * Pastoral Fidelity Phase 1.5 — aggregates the attribution blocks
 * required by the lexicon sources used in a sermon's word studies.
 * Mirrors the `aggregateRequiredAttributions` pattern (ADR-006) but
 * operates on `PastoralSeed.wordStudies.studies[]` rather than the
 * `CitationManifest`, because lexicon entries reach the artefact via the
 * seed, not via the per-resource library.
 *
 * For now the aggregator only emits the curated v1 block. LSJ/BDB
 * adapters ship as stubs (ADR-017) so their attribution is dormant
 * until the real datasets land — at which point the adapter map below
 * gets the missing entries.
 */
export interface LexiconUsageHint {
    /** Lemma cited from this lexicon source. */
    lemma: string;
    /** Language of the study (drives which fallback we credit). */
    language: WordStudyLanguage;
    /** Source that the analysis recorded as primary. */
    source: LexiconSource;
}

const ATTRIBUTION_BY_SOURCE: Record<LexiconSource, AttributionBlock> = {
    curated: {
        sourceId: 'lexicon-curated-v1',
        title: 'Preach Curated Pastoral Lexicon v1.0',
        lines: [
            'Pastoral glosses + theological notes: Preach Curated Pastoral Lexicon v1.0',
            '(internally created for the Pastoral Fidelity initiative).',
            'Glosses are pastoral, not academic; they intentionally distill weight',
            'rather than reproduce a critical lexicon.',
        ],
    },
    lsj: {
        sourceId: 'lexicon-lsj',
        title: 'Liddell-Scott-Jones Greek-English Lexicon',
        lines: [
            'Greek lexical glosses: Liddell-Scott-Jones Greek-English Lexicon',
            '(Perseus Digital Library, public domain).',
        ],
    },
    bdb: {
        sourceId: 'lexicon-bdb',
        title: 'Brown-Driver-Briggs Hebrew-English Lexicon',
        lines: [
            'Hebrew lexical glosses: Brown-Driver-Briggs Hebrew-English Lexicon',
            '(public domain).',
        ],
    },
};

/**
 * Returns attribution blocks for every distinct lexicon source consumed
 * by the supplied word studies. Studies without a recorded source are
 * ignored (the pastor may have added them manually before the modal).
 * The optional `usageHints` parameter lets a caller supplement the
 * inferred sources when the study itself doesn't carry the source field
 * yet (e.g. older studies pre-`wordAnalysisId`).
 */
export function aggregateLexiconAttributions(
    studies: WordStudy[],
    usageHints: LexiconUsageHint[] = [],
): AttributionBlock[] {
    const sources = new Set<LexiconSource>();

    for (const hint of usageHints) {
        sources.add(hint.source);
    }

    // Heuristic per ADR-017: a study with `wordAnalysisId` is presumed
    // to have consulted the lexicon. The curated set covers the common
    // case in v1; LSJ/BDB are dormant. When the explicit
    // `lexiconSource` field arrives in a future iteration of WordStudy
    // we'll branch off that instead.
    if (sources.size === 0) {
        for (const s of studies) {
            if (s.wordAnalysisId) {
                sources.add('curated');
                break;
            }
        }
    }

    const blocks: AttributionBlock[] = [];
    const seen = new Set<string>();
    for (const source of sources) {
        const block = ATTRIBUTION_BY_SOURCE[source];
        if (!block || seen.has(block.sourceId)) continue;
        blocks.push(block);
        seen.add(block.sourceId);
    }
    return blocks;
}
