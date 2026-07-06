import { describe, it, expect } from 'vitest';
import type { SermonContent } from '@dosfilos/domain';
import { verifyDraftCitations, buildDraftCorpus, buildDraftMarkdown } from '../verifyDraftCitations';

function draft(over: Partial<SermonContent>): SermonContent {
    return {
        title: 'Anclados en la Palabra',
        introduction: 'Introducción del sermón.',
        body: [],
        conclusion: 'Conclusión.',
        ...over,
    };
}

const manifest: SermonContent['citationManifest'] = {
    version: '1',
    entries: [
        {
            sourceId: 'S1',
            author: 'Simon J. Kistemaker',
            title: 'Comentario de 2 Pedro',
            excerpt: 'Pedro no está introduciendo nuevas verdades, sino que insta a recordar las verdades ya recibidas.',
            page: '42',
            resourceId: 'r1',
            chunkId: 'c1',
        },
    ],
};

describe('verifyDraftCitations — detección in-draft de citas fabricadas', () => {
    it('cita atribuida a autor QUE NO está en el manifiesto → not-found (fabricada)', () => {
        const d = draft({
            body: [
                {
                    point: 'La memoria',
                    content: 'Debemos recordar, como bien dijo:\n"El olvido es el peor enemigo del alma" — *Charles Spurgeon, Sermones*',
                },
            ],
            citationManifest: manifest,
        });
        const res = verifyDraftCitations(d);
        expect(res.notFound.length).toBe(1);
        expect(res.notFound[0].citation.author).toContain('Spurgeon');
    });

    it('cita cuyo autor Y texto SÍ están en el manifiesto → verified (no fabricada)', () => {
        const d = draft({
            body: [
                {
                    point: 'La memoria',
                    content:
                        '"Pedro no está introduciendo nuevas verdades, sino que insta a recordar las verdades ya recibidas" — *Simon J. Kistemaker, Comentario*.',
                },
            ],
            citationManifest: manifest,
        });
        const res = verifyDraftCitations(d);
        expect(res.notFound.length).toBe(0);
        expect(res.citations.some((c) => c.status === 'verified')).toBe(true);
    });

    it('sin manifiesto → hasManifest false (nada contra qué verificar)', () => {
        const res = verifyDraftCitations(draft({}));
        expect(res.hasManifest).toBe(false);
    });

    it('buildDraftMarkdown junta intro + body(content/quote/illustration) + conclusión + CTA', () => {
        const md = buildDraftMarkdown(
            draft({
                introduction: 'INTRO',
                body: [{ point: 'p', content: 'CUERPO', authorityQuote: 'QUOTE', illustration: 'ILUS' }],
                conclusion: 'CONC',
                callToAction: 'CTA',
            }),
        );
        for (const s of ['INTRO', 'CUERPO', 'QUOTE', 'ILUS', 'CONC', 'CTA']) expect(md).toContain(s);
    });

    it('buildDraftCorpus junta excerpt + autor + título del manifiesto', () => {
        const corpus = buildDraftCorpus(draft({ citationManifest: manifest }));
        expect(corpus).toContain('Kistemaker');
        expect(corpus).toContain('recordar las verdades');
    });
});
