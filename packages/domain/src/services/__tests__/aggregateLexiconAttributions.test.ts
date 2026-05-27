import { describe, it, expect } from 'vitest';
import { aggregateLexiconAttributions } from '../aggregateLexiconAttributions';
import type { WordStudy } from '../../entities/PastoralSeed';

const study = (overrides: Partial<WordStudy> = {}): WordStudy => ({
    word: 'δικαιοσύνη',
    reference: 'Romanos 8:4',
    pastorDiscovery: 'Pablo enmarca todo el capítulo bajo la justicia que el Espíritu produce.',
    language: 'greek',
    ...overrides,
});

describe('aggregateLexiconAttributions', () => {
    it('returns no blocks for an empty studies array', () => {
        expect(aggregateLexiconAttributions([])).toEqual([]);
    });

    it('returns no blocks when studies were authored manually (no wordAnalysisId)', () => {
        expect(aggregateLexiconAttributions([study()])).toEqual([]);
    });

    it('emits the curated attribution block when any study has a wordAnalysisId', () => {
        const blocks = aggregateLexiconAttributions([study({ wordAnalysisId: 'greek__dik__abc__1.0.0' })]);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].sourceId).toBe('lexicon-curated-v1');
        expect(blocks[0].title).toContain('Preach Curated Pastoral Lexicon');
        expect(blocks[0].lines.length).toBeGreaterThan(0);
    });

    it('deduplicates blocks per sourceId', () => {
        const blocks = aggregateLexiconAttributions([
            study({ wordAnalysisId: 'greek__a__abc__1.0.0' }),
            study({ wordAnalysisId: 'greek__b__abc__1.0.0' }),
        ]);
        expect(blocks).toHaveLength(1);
        expect(blocks[0].sourceId).toBe('lexicon-curated-v1');
    });

    it('honours explicit usage hints for LSJ + BDB sources', () => {
        const blocks = aggregateLexiconAttributions(
            [study()],
            [
                { lemma: 'λόγος', language: 'greek', source: 'lsj' },
                { lemma: 'חֶסֶד', language: 'hebrew', source: 'bdb' },
            ],
        );
        const sourceIds = blocks.map((b) => b.sourceId);
        expect(sourceIds).toContain('lexicon-lsj');
        expect(sourceIds).toContain('lexicon-bdb');
    });
});
