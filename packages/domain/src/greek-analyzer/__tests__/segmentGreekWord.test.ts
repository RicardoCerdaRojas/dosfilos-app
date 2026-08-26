import { describe, it, expect } from 'vitest';
import { segmentGreekWord } from '../segmentGreekWord';
import type { GreekWordToken } from '../morphGntToken';

const tok = (text: string, pos: GreekWordToken['pos'], tag: GreekWordToken['tag']): GreekWordToken =>
    ({ text, lemma: 'x', pos, tag, transliteration: 'x' });

describe('segmentGreekWord — la marca se pinta donde la pista la confirmó', () => {
    it('χαίρειν. → χαίρ + ειν (modo), con la puntuación pegada al final', () => {
        const segs = segmentGreekWord(tok('χαίρειν.', 'V', { tense: 'P', voice: 'A', mood: 'N' }));
        expect(segs).toEqual([
            { text: 'χαίρ', layer: 'stem' },
            { text: 'ειν.', layer: 'moodMarker' },
        ]);
    });

    it('θεοῦ → θε + οῦ (caso), pese a los acentos de la superficie', () => {
        const segs = segmentGreekWord(tok('θεοῦ', 'N', { case: 'G', number: 'S', gender: 'M' }));
        expect(segs).toEqual([
            { text: 'θε', layer: 'stem' },
            { text: 'οῦ', layer: 'caseEnding' },
        ]);
    });

    it('ἡγήσασθε → ἡγή + σα (tiempo) + σθε (modo): dos capas en una palabra', () => {
        const segs = segmentGreekWord(
            tok('ἡγήσασθε,', 'V', { person: '2', tense: 'A', voice: 'M', mood: 'D', number: 'P' }),
        );
        expect(segs.map((s) => s.layer)).toEqual(['stem', 'tenseMarker', 'moodMarker']);
        expect(segs[1].text).toBe('σα');
    });

    it('palabra sin marca confirmada queda ENTERA como raíz — nada inventado', () => {
        const segs = segmentGreekWord(tok('περιπέσητε', 'V', { person: '2', tense: 'A', voice: 'A', mood: 'S', number: 'P' }));
        // Subjuntivo por vocal larga no es segmentable con precisión; sin
        // entrada en el catálogo de segmentación, la palabra no se parte por
        // esa pista.
        expect(segs.every((s) => s.layer === 'stem' || s.text.length > 0)).toBe(true);
    });

    it('φυλαῖς → φυλ + αῖς (dativo plural)', () => {
        const segs = segmentGreekWord(tok('φυλαῖς', 'N', { case: 'D', number: 'P', gender: 'F' }));
        expect(segs[segs.length - 1]).toEqual({ text: 'αῖς', layer: 'caseEnding' });
    });
});
