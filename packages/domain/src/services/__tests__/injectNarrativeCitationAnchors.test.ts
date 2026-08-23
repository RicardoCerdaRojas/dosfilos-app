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
        { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Comentario 1 y 2 de Pedro y Judas', author: 'Simon J. Kistemaker', page: '88', excerpt: 'Pedro insta a recordar las verdades ya recibidas.' },
        { sourceId: 'S2', resourceId: 'r2', chunkId: 'c2', title: 'Subukjian - Volvamos a la predicación Bíblica', author: 'Donald R. Subukjian', page: '102', excerpt: 'El predicador debe entregar el mensaje con fidelidad al texto.' },
    ],
};

describe('injectNarrativeCitationAnchors (ADR-031)', () => {
    it('(b) quita la atribución de Gemini + agrega el excerpt real como blockquote', () => {
        const out = injectNarrativeCitationAnchors(
            content({ body: [{ point: 'I', content: 'Como señala Simon J. Kistemaker, la profecía no es privada. Sigamos.', scriptureReferences: [] }] }),
            manifest,
        );
        const c = out.body[0].content;
        expect(c).not.toContain('Como señala'); // atribución de Gemini removida
        expect(c).toContain('La profecía no es privada.'); // claim queda como punto del pastor (capitalizado)
        expect(c).toContain('> «Pedro insta a recordar las verdades ya recibidas.»'); // excerpt REAL como blockquote
        expect(c).toContain('[S1]');
    });

    it('(b) strip por apellido cuando solo aparece el apellido en la prosa', () => {
        const out = injectNarrativeCitationAnchors(
            content({ introduction: 'Como nos recuerda Subukjian, el predicador entrega el mensaje.' }),
            manifest,
        );
        expect(out.introduction).not.toContain('Como nos recuerda');
        expect(out.introduction).toContain('El predicador entrega el mensaje.');
        expect(out.introduction).toContain('> «El predicador debe entregar el mensaje con fidelidad al texto.»');
        expect(out.introduction).toContain('[S2]');
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

    it('GUARANTEES a citation for a point that overlaps a source even when no author is named', () => {
        const mf: CitationManifest = {
            version: '1',
            entries: [{ sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Inspiración', author: 'Autor', page: '5', excerpt: 'La Escritura inspirada permanece como autoridad inmutable y permanente.' }],
        };
        const out = injectNarrativeCitationAnchors(
            content({ body: [{ point: 'I', content: 'La Escritura inspirada es nuestra autoridad permanente. Confiamos en ella.', scriptureReferences: [] }] }),
            mf,
        );
        expect(out.body[0].content).toMatch(/\[S1\]/); // point now cited
        // Opción A: la cita lleva el TEXTO REAL del excerpt como blockquote (no cáscara)
        expect(out.body[0].content).toContain('> «'); // blockquote
        expect(out.body[0].content).toContain('La Escritura inspirada permanece como autoridad inmutable'); // excerpt real
        expect(out.body[0].content).toContain('Autor'); // atribución
        // original prose preserved
        expect(out.body[0].content).toContain('Confiamos en ella.');
    });

    it('leaves a point uncited when NO source overlaps it (never invents)', () => {
        const mf: CitationManifest = {
            version: '1',
            entries: [{ sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Homilética', author: 'Autor', page: '5', excerpt: 'El predicador entrega ilustraciones memorables al auditorio.' }],
        };
        const out = injectNarrativeCitationAnchors(
            content({ body: [{ point: 'I', content: 'Hoy el clima estaba agradable y tranquilo afuera.', scriptureReferences: [] }] }),
            mf,
        );
        expect(out.body[0].content).not.toMatch(/\[S?\d/); // genuinely unsupported → no citation
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
        // Cada superficie con fuente nombrada gana su blockquote del excerpt real.
        expect(out.introduction).toContain('> «Pedro insta a recordar');
        expect(out.introduction).toContain('[S1]');
        expect(out.body[0].content).toContain('> «El predicador debe entregar');
        expect(out.body[0].content).toContain('[S2]');
        expect(out.conclusion).toBe('Algo sin fuente.'); // sin fuente → intacto
    });
});

describe('(c) marcador sin texto — el número solo no es una cita', () => {
    const manifest = {
        version: '1' as const,
        entries: [
            {
                sourceId: 'S5',
                resourceId: 'r5',
                chunkId: 'c5',
                title: 'A Literary and Theological Commentary',
                author: 'Terence E. Fretheim',
                excerpt: 'the phrase indicates the message is not human but a direct revelation from God',
            },
        ],
    };

    it('ancla el excerpt REAL cuando el modelo marcó [S5] sin nombrar al autor', () => {
        // Lo que el pastor vio: los números ahí, las citas desaparecidas. La
        // rama (b) sólo dispara si la prosa NOMBRA al autor; el modelo emitió el
        // marcador sin la atribución narrativa y el texto quedó escondido en el
        // popover — el "name-drop hueco" que la Opción A rechazó.
        const r = injectNarrativeCitationAnchors(
            { body: [{ point: 'I', content: 'La frase "vino palabra de Jehová" es una fórmula profética [S5].' }] } as any,
            manifest as any,
        );
        const c = r.body[0]!.content;
        expect(c).toContain('a direct revelation from God');
        expect(c).toContain('Terence E. Fretheim');
    });

    it('no dobla cuando la prosa YA nombraba al autor', () => {
        const r = injectNarrativeCitationAnchors(
            { body: [{ point: 'I', content: 'Como señala Terence E. Fretheim, la frase indica revelación directa [S5].' }] } as any,
            manifest as any,
        );
        const veces = (r.body[0]!.content.match(/a direct revelation from God/g) ?? []).length;
        expect(veces).toBe(1);
    });

    it('sin marcador y sin nombre no inventa una cita', () => {
        const r = injectNarrativeCitationAnchors(
            { body: [{ point: 'I', content: 'Un texto sin ninguna referencia a fuentes.' }] } as any,
            manifest as any,
        );
        expect(r.body[0]!.content).not.toContain('a direct revelation');
    });
});
