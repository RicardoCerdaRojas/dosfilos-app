import { describe, it, expect } from 'vitest';
import type { CitationManifest, SermonContent } from '@dosfilos/domain';
import { computeDeterministicDraftSignals } from '../sermonDraftSignals';

const manifest: CitationManifest = {
    version: '1',
    entries: [
        {
            sourceId: 'S1',
            resourceId: 'r1',
            chunkId: 'c1',
            title: 'Comentario',
            author: 'Kistemaker',
            page: '88',
            excerpt: 'Pedro advierte en 3:17 sobre la seducción de los falsos maestros.',
        },
    ],
};

function draft(over: Partial<SermonContent>): SermonContent {
    return { title: 'T', introduction: 'i', body: [], conclusion: 'c', citationManifest: manifest, ...over };
}

function sig(signals: ReturnType<typeof computeDeterministicDraftSignals>, key: string) {
    return signals.find((s) => s.key === key)?.value;
}

describe('computeDeterministicDraftSignals — colector determinista', () => {
    it('authorityQuote a autor FUERA del manifest → fabricada', () => {
        const s = computeDeterministicDraftSignals(
            draft({ body: [{ point: 'I', content: 'x', authorityQuote: '"cita" — *Charles Spurgeon, Sermones*' }] }),
            manifest,
        );
        expect(sig(s, 'authorityQuote.total')).toBe(1);
        expect(sig(s, 'authorityQuote.fabricated')).toBe(1);
    });

    it('sin authorityQuote → total 0, fabricada 0', () => {
        const s = computeDeterministicDraftSignals(draft({ body: [{ point: 'I', content: 'x' }] }), manifest);
        expect(sig(s, 'authorityQuote.total')).toBe(0);
        expect(sig(s, 'authorityQuote.fabricated')).toBe(0);
    });

    it('PROXY verso-equivocado: punto 3:1-2 + cita [1] cuyo excerpt es 3:17 → mismatch', () => {
        const s = computeDeterministicDraftSignals(
            draft({ body: [{ point: 'I. No olvides (3:1-2)', content: 'Como se ve [1].' }] }),
            manifest,
        );
        expect(sig(s, 'citation.total')).toBe(1);
        expect(sig(s, 'citation.verseMismatch')).toBe(1);
        const proxy = s.find((x) => x.key === 'citation.verseMismatch');
        expect(proxy?.proxy).toBe(true); // marcada como heurística
    });

    it('PROXY: punto 3:17 + cita cuyo excerpt es 3:17 → sin mismatch', () => {
        const s = computeDeterministicDraftSignals(
            draft({ body: [{ point: 'I. Advertencia (3:17)', content: 'Como se ve [1].' }] }),
            manifest,
        );
        expect(sig(s, 'citation.verseMismatch')).toBe(0);
    });

    it('todas las señales son kind=deterministic', () => {
        const s = computeDeterministicDraftSignals(draft({ body: [{ point: 'I', content: 'x' }] }), manifest);
        expect(s.every((x) => x.kind === 'deterministic')).toBe(true);
    });
});
