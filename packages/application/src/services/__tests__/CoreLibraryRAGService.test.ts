/**
 * Tests for the citation-protection masking in
 * `CoreLibraryRAGService.formatContextForPrompt`.
 *
 * Behavior pinned here:
 *  - publiclyCitable=true  → real `Autor, "Título"` header (always)
 *  - publiclyCitable!=true  → masked sentinel header (default)
 *  - publiclyCitable!=true + revealProtected=true → real header (super-admin)
 *  - empty chunks → ''
 *
 * The reveal path is the super-admin fix: the founder must see the real
 * attribution of every source the answer drew on, while normal users keep
 * the legal masking.
 */

import { describe, expect, it } from 'vitest';
import { CoreLibraryRAGService, type RetrievedChunk } from '../CoreLibraryRAGService';

function chunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
    return {
        id: 'c1',
        resourceId: 'r1',
        resourceTitle: 'Institución de la Religión Cristiana',
        resourceAuthor: 'Juan Calvino',
        chunkIndex: 0,
        text: 'El conocimiento de Dios y de nosotros mismos…',
        metadata: { page: 42 },
        score: 0.9,
        sectionBreadcrumb: 'Libro I',
        ...overrides,
    };
}

const PROTECTED_SENTINEL_ES = 'Material especializado';
const PROTECTED_SENTINEL_EN = 'Curated material';

describe('CoreLibraryRAGService.formatContextForPrompt', () => {
    it('returns empty string for no chunks', () => {
        expect(CoreLibraryRAGService.formatContextForPrompt([])).toBe('');
    });

    it('renders the real author/title for a publicly citable source', () => {
        const out = CoreLibraryRAGService.formatContextForPrompt([
            chunk({ publiclyCitable: true }),
        ]);
        expect(out).toContain('Juan Calvino');
        expect(out).toContain('Institución de la Religión Cristiana');
        expect(out).not.toContain(PROTECTED_SENTINEL_ES);
    });

    it('masks a protected source by default', () => {
        const out = CoreLibraryRAGService.formatContextForPrompt([
            chunk({ publiclyCitable: false }),
        ]);
        expect(out).toContain(PROTECTED_SENTINEL_ES);
        expect(out).not.toContain('Juan Calvino');
        // The chunk TEXT is still present — only the attribution is masked.
        expect(out).toContain('El conocimiento de Dios');
    });

    it('masks a source with undefined publiclyCitable (safe default)', () => {
        const out = CoreLibraryRAGService.formatContextForPrompt([chunk()]);
        expect(out).toContain(PROTECTED_SENTINEL_ES);
        expect(out).not.toContain('Juan Calvino');
    });

    it('reveals a protected source when revealProtected=true (super-admin)', () => {
        const out = CoreLibraryRAGService.formatContextForPrompt(
            [chunk({ publiclyCitable: false })],
            'es',
            { revealProtected: true },
        );
        expect(out).toContain('Juan Calvino');
        expect(out).toContain('Institución de la Religión Cristiana');
        expect(out).not.toContain(PROTECTED_SENTINEL_ES);
    });

    it('uses the English sentinel for masked sources when language=en', () => {
        const out = CoreLibraryRAGService.formatContextForPrompt(
            [chunk({ publiclyCitable: false })],
            'en',
        );
        expect(out).toContain(PROTECTED_SENTINEL_EN);
    });
});
