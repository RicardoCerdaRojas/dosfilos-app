import { describe, it, expect } from 'vitest';
import { greekRecognitionClues } from '../greekRecognitionClues';
import type { GreekWordToken } from '../morphGntToken';

const verbo = (text: string, tag: GreekWordToken['tag']): GreekWordToken => ({
    text, lemma: 'x', pos: 'V', tag, transliteration: 'x',
});

describe('greekRecognitionClues — palabras reales de Santiago 1', () => {
    it('χαίρειν (P-A-N): la terminación -ειν delata el infinitivo presente activo', () => {
        const pistas = greekRecognitionClues(verbo('χαίρειν.', { tense: 'P', voice: 'A', mood: 'N' }));
        expect(pistas).toContainEqual({ id: 'infPresActive', marker: '-ειν' });
    });

    it('ἡγήσασθε (2-A-M-D-P): el -σα- del aoristo Y el -σθε del imperativo medio plural', () => {
        const pistas = greekRecognitionClues(
            verbo('ἡγήσασθε,', { person: '2', tense: 'A', voice: 'M', mood: 'D', number: 'P' }),
        );
        const ids = pistas.map((p) => p.id);
        expect(ids).toContain('aoristoSigmatico');
        expect(ids).toContain('impvMedPl');
    });

    it('περιπέσητε (2-A-A-S-P): subjuntivo por vocal larga — y SIN -σα-, porque es aoristo segundo', () => {
        // LA REGLA DE HONESTIDAD: el tag dice aoristo, pero la forma no lleva
        // σα (aoristo segundo). La pista del sigmático se OMITE en vez de
        // inventarse — el pastor la buscaría en el texto y no estaría.
        const pistas = greekRecognitionClues(
            verbo('περιπέσητε', { person: '2', tense: 'A', voice: 'A', mood: 'S', number: 'P' }),
        );
        const ids = pistas.map((p) => p.id);
        expect(ids).toContain('subjuntivoVocalLarga');
        expect(ids).not.toContain('aoristoSigmatico');
    });

    it('γινώσκοντες (P-A-P participio): el -ντ- del participio activo', () => {
        const pistas = greekRecognitionClues(verbo('γινώσκοντες', { tense: 'P', voice: 'A', mood: 'P' }));
        expect(pistas.map((p) => p.id)).toContain('participioActivo');
    });

    it('un sustantivo no lleva pistas verbales', () => {
        const token: GreekWordToken = {
            text: 'χαρὰν', lemma: 'χαρά', pos: 'N', tag: { case: 'A', number: 'S', gender: 'F' }, transliteration: 'charan',
        };
        expect(greekRecognitionClues(token)).toEqual([]);
    });
});
