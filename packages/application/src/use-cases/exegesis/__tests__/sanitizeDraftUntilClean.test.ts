import { describe, it, expect } from 'vitest';
import type { SermonContent } from '@dosfilos/domain';
import { sanitizeDraftUntilClean } from '../verifyDraftCitations';

const manifest: SermonContent['citationManifest'] = {
    version: '1',
    entries: [
        { sourceId: 'S1', author: 'Kistemaker', title: 'Comentario', excerpt: 'texto real de la fuente', page: '1', resourceId: 'r', chunkId: 'c' },
    ],
};

/** Borrador con N citas fabricadas (autor Spurgeon, no en el manifiesto). */
function draftWithFabricated(n: number): SermonContent {
    const body = Array.from({ length: n }, (_, i) => ({
        point: `p${i}`,
        content: `Idea ${i}, como dijo:\n"cita inventada ${i}" — *Charles Spurgeon, Sermones*`,
    }));
    return { title: 'T', introduction: 'intro', body, conclusion: 'fin', citationManifest: manifest };
}

describe('sanitizeDraftUntilClean — loop verify→sanitize→re-verify', () => {
    it('converge a 0: el fake quita las fabricadas → removed = inicial, sin residual', async () => {
        const draft = draftWithFabricated(2);
        // fake sanitize: vacía el content de los body con citas → desaparecen.
        const sanitize = async (d: SermonContent) => ({
            ...d,
            body: d.body.map((b) => ({ ...b, content: 'idea reescrita sin cita' })),
        });
        const res = await sanitizeDraftUntilClean(draft, sanitize);
        expect(res.removed).toBe(2);
        expect(res.residual).toBe(false);
    });

    it('sin fabricadas → no llama sanitize, removed 0', async () => {
        const clean: SermonContent = { title: 'T', introduction: 'intro', body: [{ point: 'p', content: 'sin citas' }], conclusion: 'fin', citationManifest: manifest };
        let called = false;
        const sanitize = async (d: SermonContent) => { called = true; return d; };
        const res = await sanitizeDraftUntilClean(clean, sanitize);
        expect(called).toBe(false);
        expect(res.removed).toBe(0);
        expect(res.residual).toBe(false);
    });

    it('tope de rondas: si el fake NO limpia → residual true, no loop infinito', async () => {
        const draft = draftWithFabricated(1);
        let rounds = 0;
        const sanitize = async (d: SermonContent) => { rounds++; return d; }; // no cambia nada
        const res = await sanitizeDraftUntilClean(draft, sanitize, 2);
        expect(rounds).toBe(2); // se detuvo en maxRounds
        expect(res.residual).toBe(true);
        expect(res.removed).toBe(0);
    });
});
