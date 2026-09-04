import { describe, it, expect } from 'vitest';
import { serializeAnalysis } from '../serializeAnalysis';
import { buildEmptyCanonicalVerseAnalysis } from '../../entities/CanonicalVerseAnalysis';
import type { CanonicalVerseAnalysis } from '../../entities/CanonicalVerseAnalysis';
import type { PassageReference } from '../../../bible/canon/passage-reference';

const VERSE: PassageReference = {
    bookId: 'JAS', chapterStart: 1, chapterEnd: 1, verseStart: 5, verseEnd: 5,
};

/** Cita a Metzger en la hoja 719 y a Wallace en la 53. */
function analysis(): CanonicalVerseAnalysis {
    return {
        ...buildEmptyCanonicalVerseAnalysis(VERSE),
        commentatorEngagement: [
            { sourceKey: 'Metzger', page: 719, role: 'technical', position: 'Sobre δοκίμιον.' },
            { sourceKey: 'Wallace', page: 53, role: 'technical', position: 'Cita el versículo.' },
        ],
    };
}

/** Los desfases medidos sobre la biblioteca real. */
const OFFSETS: Record<string, number | null> = { Metzger: -40, Wallace: null };

const label = (sourceKey: string, sheet: number) => {
    const offset = OFFSETS[sourceKey];
    if (offset === null || offset === undefined) return `hoja ${sheet}`;
    const printed = sheet + offset;
    return printed >= 1 ? `p. ${printed}` : `hoja ${sheet}`;
};

describe('serializeAnalysis — rótulo de página', () => {
    it('sin rotulador cita la hoja como «p.», que es como venía', () => {
        expect(serializeAnalysis(analysis(), 'es')).toContain('Metzger (p. 719)');
    });

    it('convierte a página impresa donde el desfase se pudo medir', () => {
        // Metzger −40: la hoja 719 lleva impreso el 679. Citar 719 mandaba
        // al profesor cuarenta páginas más allá.
        expect(serializeAnalysis(analysis(), 'es', { pageLabel: label }))
            .toContain('Metzger (p. 679)');
    });

    it('dice «hoja» donde no se pudo medir, en vez de convertir a ciegas', () => {
        const out = serializeAnalysis(analysis(), 'es', { pageLabel: label });

        expect(out).toContain('Wallace (hoja 53)');
        expect(out).not.toContain('Wallace (p. 53)');
    });

    it('se queda en la hoja si la conversión cayera antes de la primera página', () => {
        const early = {
            ...buildEmptyCanonicalVerseAnalysis(VERSE),
            commentatorEngagement: [
                { sourceKey: 'Metzger', page: 5, role: 'technical' as const, position: 'Preliminares.' },
            ],
        };

        expect(serializeAnalysis(early, 'es', { pageLabel: label })).toContain('Metzger (hoja 5)');
    });
});
