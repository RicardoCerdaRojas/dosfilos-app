import { describe, it, expect } from 'vitest';
import { injectNarrativeCitationAnchors } from '../injectNarrativeCitationAnchors';
import type { SermonContent, CitationManifest } from '../../index';

function content(over: Partial<SermonContent>): SermonContent {
    return {
        introduction: '',
        body: [{ point: 'P1', content: '', scriptureReferences: [] }],
        conclusion: '',
        ...over,
    } as SermonContent;
}

const manifest: CitationManifest = {
    version: '1',
    entries: [
        { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Comentario 1 y 2 de Pedro y Judas', author: 'Simon J. Kistemaker', page: '88', excerpt: '…' },
        { sourceId: 'S2', resourceId: 'r2', chunkId: 'c2', title: 'Subukjian - Volvamos a la predicación Bíblica', author: 'Donald R. Subukjian', page: '102', excerpt: '…' },
    ],
};

describe('injectNarrativeCitationAnchors (ADR-031)', () => {
    it('injects [Sn] after the sentence that names the author (matches real LLM behaviour)', () => {
        const out = injectNarrativeCitationAnchors(
            content({ body: [{ point: 'I', content: 'Como señala Simon J. Kistemaker, la profecía no es privada. Sigamos.', scriptureReferences: [] }] }),
            manifest,
        );
        expect(out.body[0].content).toContain('privada [S1].');
    });

    it('matches the author surname even when only the surname appears in prose', () => {
        const out = injectNarrativeCitationAnchors(
            content({ introduction: 'Como nos recuerda Subukjian, el predicador entrega el mensaje.' }),
            manifest,
        );
        expect(out.introduction).toContain('mensaje [S2].');
    });

    it('does not double-anchor a sentence that already has a marker', () => {
        const out = injectNarrativeCitationAnchors(
            content({ introduction: 'Como dice Kistemaker [1], es así.' }),
            manifest,
        );
        expect(out.introduction).toBe('Como dice Kistemaker [1], es así.');
    });

    it('never anchors a source not named in the prose (no fabrication)', () => {
        const out = injectNarrativeCitationAnchors(
            content({ introduction: 'Una afirmación sin atribución a nadie.' }),
            manifest,
        );
        expect(out.introduction).toBe('Una afirmación sin atribución a nadie.');
    });

    it('no-ops on an empty manifest', () => {
        const c = content({ introduction: 'Como señala Kistemaker, algo.' });
        expect(injectNarrativeCitationAnchors(c, { version: '1', entries: [] })).toEqual(c);
    });

    it('anchors across introduction, body and conclusion', () => {
        const out = injectNarrativeCitationAnchors(
            content({
                introduction: 'Kistemaker explica la inspiración.',
                body: [{ point: 'I', content: 'Subukjian enfatiza la entrega del mensaje.', scriptureReferences: [] }],
                conclusion: 'Algo sin fuente.',
            }),
            manifest,
        );
        expect(out.introduction).toContain('[S1].');
        expect(out.body[0].content).toContain('[S2].');
        expect(out.conclusion).toBe('Algo sin fuente.');
    });
});
