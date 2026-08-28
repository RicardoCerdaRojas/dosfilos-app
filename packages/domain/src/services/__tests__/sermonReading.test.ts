import { describe, it, expect } from 'vitest';

import { buildReadingBlocks, normalizeSectionBody } from '../sermonReading';
import { splitSentences } from '../sentenceSegmentation';
import {
    buildAnnotationAnchor,
    resolveAnnotationAnchor,
} from '../../entities/SermonAnnotation';
import { extractClaimForMarker } from '../../entities/FidelityReport';

describe('splitSentences', () => {
    it('splits on terminators and keeps offsets', () => {
        const text = 'Dios llama. El pastor responde con temor. ¿Y nosotros?';
        const spans = splitSentences(text);
        expect(spans.map((s) => s.text)).toEqual([
            'Dios llama.',
            'El pastor responde con temor.',
            '¿Y nosotros?',
        ]);
        for (const span of spans) {
            expect(text.slice(span.start, span.end)).toBe(span.text);
        }
    });

    it('does not split inside abbreviations or numbers', () => {
        expect(splitSentences('Ver cf. Romanos 8.28 para el punto.').map((s) => s.text)).toEqual([
            'Ver cf. Romanos 8.28 para el punto.',
        ]);
    });

    it('keeps closing punctuation with its sentence', () => {
        const spans = splitSentences('Él dijo «basta». Y calló para siempre.');
        expect(spans[0].text).toBe('Él dijo «basta».');
    });

    it('returns the whole text when there is no terminator', () => {
        expect(splitSentences('Un título sin punto').map((s) => s.text)).toEqual([
            'Un título sin punto',
        ]);
    });

    it('is the same ruler the fidelity pass uses for the claim before [N]', () => {
        const prose = 'Pablo escribe desde la cárcel. La alegría no depende del lugar [1].';
        const claim = extractClaimForMarker(prose, 1);
        const sentences = splitSentences(prose).map((s) => s.text);
        expect(claim).toBe('Pablo escribe desde la cárcel.');
        expect(sentences[0]).toBe(claim);
    });
});

describe('normalizeSectionBody', () => {
    it('strips markdown and maps every character back to the raw body', () => {
        const body = 'El **evangelio** es poder.';
        const { text, map } = normalizeSectionBody(body);
        expect(text).toBe('El evangelio es poder.');
        for (let i = 0; i < text.length; i += 1) {
            expect(body[map[i]]).toBe(text[i]);
        }
    });

    it('unwraps internal links and drops anchors', () => {
        const body = 'Lee [Juan 3:16](#juan-3-16) hoy. {#ancla}';
        const { text } = normalizeSectionBody(body);
        expect(text).toBe('Lee Juan 3:16 hoy. ');
    });
});

describe('buildReadingBlocks', () => {
    const body = [
        '### El primer punto',
        '',
        'Dios llama a **Moisés** desde la zarza.',
        'La zarza arde y no se consume.',
        '',
        'Nadie discute con el fuego [1].',
    ].join('\n');

    it('splits subheadings from paragraphs and joins wrapped lines', () => {
        const blocks = buildReadingBlocks(body);
        expect(blocks.map((b) => b.kind)).toEqual(['subheading', 'paragraph', 'paragraph']);
        expect(blocks[0].text).toBe('El primer punto');
        expect(blocks[1].text).toBe(
            'Dios llama a Moisés desde la zarza. La zarza arde y no se consume.',
        );
    });

    it('gives every unit a range that still reads correctly in the RAW body', () => {
        const blocks = buildReadingBlocks(body);
        const units = blocks[1].units;
        expect(units).toHaveLength(2);
        // The raw slice carries the markdown back — that is the point: the
        // offsets are raw-body coordinates, not rendered ones.
        expect(body.slice(units[0].sourceStart, units[0].sourceEnd)).toBe(
            'Dios llama a **Moisés** desde la zarza.',
        );
        expect(body.slice(units[1].sourceStart, units[1].sourceEnd)).toBe(
            'La zarza arde y no se consume.',
        );
    });

    it('keeps citation markers inside the unit text', () => {
        const blocks = buildReadingBlocks(body);
        expect(blocks[2].units[0].text).toBe('Nadie discute con el fuego [1].');
    });

    it('returns nothing for an empty body', () => {
        expect(buildReadingBlocks('')).toEqual([]);
        expect(buildReadingBlocks('   \n\n  ')).toEqual([]);
    });
});

describe('annotation anchors', () => {
    const body = 'Dios llama a Moisés desde la zarza. La zarza arde y no se consume.';

    it('round-trips an unchanged body through the fast path', () => {
        const anchor = buildAnnotationAnchor('el-llamado', body, 36, 66);
        expect(anchor.exact).toBe('La zarza arde y no se consume.');
        expect(resolveAnnotationAnchor(anchor, body)).toEqual({ start: 36, end: 66 });
    });

    it('re-finds the text after an edit shifted every offset', () => {
        const anchor = buildAnnotationAnchor('el-llamado', body, 36, 66);
        const edited = 'Al tercer día, ' + body;
        const resolved = resolveAnnotationAnchor(anchor, edited);
        expect(resolved).not.toBeNull();
        expect(edited.slice(resolved!.start, resolved!.end)).toBe(anchor.exact);
    });

    it('uses the surrounding context to pick between repeated text', () => {
        const repeated = 'Él vino. Y calló. Ella vino. Y calló.';
        const second = repeated.lastIndexOf('Y calló.');
        const anchor = buildAnnotationAnchor('x', repeated, second, second + 8);
        expect(anchor.exact).toBe('Y calló.');
        // The offset alone is ambiguous — drop it and let the context decide.
        const resolved = resolveAnnotationAnchor({ ...anchor, offset: 0 }, repeated);
        expect(resolved).toEqual({ start: second, end: second + 8 });
    });

    it('orphans the mark when the highlighted text is gone', () => {
        const anchor = buildAnnotationAnchor('el-llamado', body, 36, 66);
        expect(resolveAnnotationAnchor(anchor, 'Un sermón completamente distinto.')).toBeNull();
    });
});
