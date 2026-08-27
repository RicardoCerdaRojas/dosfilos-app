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

    it('un sustantivo lleva pistas NOMINALES, nunca verbales (χαρὰν → -αν acusativo)', () => {
        // Antes los nominales quedaban sin pedagogía; el fundador lo corrigió:
        // "la pedagogía en la gramática griega también es importante".
        const token: GreekWordToken = {
            text: 'χαρὰν', lemma: 'χαρά', pos: 'N', tag: { case: 'A', number: 'S', gender: 'F' }, transliteration: 'charan',
        };
        const ids = greekRecognitionClues(token).map((p) => p.id);
        expect(ids).toContain('accSgN');
        expect(ids).not.toContain('aoristoSigmatico');
    });
});

describe('pedagogía nominal — Santiago 1:1', () => {
    const nominal = (
        text: string,
        pos: GreekWordToken['pos'],
        tag: GreekWordToken['tag'],
    ): GreekWordToken => ({ text, lemma: 'x', pos, tag, transliteration: 'x' });

    it('τῇ: el artículo es paradigma memorizado Y su iota suscrita marca el dativo', () => {
        const pistas = greekRecognitionClues(nominal('τῇ', 'RA', { case: 'D', number: 'S', gender: 'F' }));
        const ids = pistas.map((p) => p.id);
        expect(pistas).toContainEqual({ id: 'articleParadigm', marker: 'τῇ' });
        expect(ids).toContain('iotaSubscript');
    });

    it('θεοῦ: la terminación -ου marca el genitivo singular', () => {
        const pistas = greekRecognitionClues(nominal('θεοῦ', 'N', { case: 'G', number: 'S', gender: 'M' }));
        expect(pistas).toContainEqual({ id: 'genSgOu', marker: '-ου' });
    });

    it('φυλαῖς: -αις dativo plural; διασπορᾷ: iota suscrita de dativo', () => {
        expect(
            greekRecognitionClues(nominal('φυλαῖς', 'N', { case: 'D', number: 'P', gender: 'F' })).map((p) => p.id),
        ).toContain('datPl');
        expect(
            greekRecognitionClues(nominal('διασπορᾷ', 'N', { case: 'D', number: 'S', gender: 'F' })).map((p) => p.id),
        ).toContain('iotaSubscript');
    });

    it('δοῦλος: -ος nominativo singular masculino', () => {
        expect(
            greekRecognitionClues(nominal('δοῦλος', 'N', { case: 'N', number: 'S', gender: 'M' })).map((p) => p.id),
        ).toContain('nomSgOs');
    });

    it('la 3ª declinación sin terminación esperada NO inventa pista', () => {
        // πνεύμασι (dat. pl. 3ª) no termina en -αις/-οις → omisión honesta.
        expect(
            greekRecognitionClues(nominal('πνεύμασι', 'N', { case: 'D', number: 'P', gender: 'N' })).map((p) => p.id),
        ).not.toContain('datPl');
    });
});

describe('translationBridge — el "de" que no está en el griego', () => {
    it('θεοῦ (genitivo) → puente del genitivo; el artículo no lleva puente', async () => {
        const { translationBridge } = await import('../translationBridge');
        expect(
            translationBridge({ text: 'θεοῦ', lemma: 'θεός', pos: 'N', tag: { case: 'G', number: 'S', gender: 'M' }, transliteration: 'theou' }),
        ).toBe('bridgeGenitive');
        expect(
            translationBridge({ text: 'τῇ', lemma: 'ὁ', pos: 'RA', tag: { case: 'D', number: 'S', gender: 'F' }, transliteration: 'tēi' }),
        ).toBeNull();
        expect(
            translationBridge({ text: 'χαίρειν', lemma: 'χαίρω', pos: 'V', tag: { tense: 'P', voice: 'A', mood: 'N' }, transliteration: 'chairein' }),
        ).toBeNull();
    });
});

describe('partículas pospositivas — determinista, propiedad del lema', () => {
    it('δέ nunca abre su cláusula: la pista sale del lema, sin preguntarle a nadie', () => {
        const de: GreekWordToken = { text: 'δὲ', lemma: 'δέ', pos: 'C', tag: {}, transliteration: 'de' };
        expect(greekRecognitionClues(de)).toEqual([{ id: 'postpositive', marker: 'δέ' }]);
    });

    it('καί NO es pospositiva — abre cláusula sin problema', () => {
        const kai: GreekWordToken = { text: 'καὶ', lemma: 'καί', pos: 'C', tag: {}, transliteration: 'kai' };
        expect(greekRecognitionClues(kai)).toEqual([]);
    });

    it('γάρ y οὖν también lo son', () => {
        for (const lemma of ['γάρ', 'οὖν']) {
            const tok: GreekWordToken = { text: lemma, lemma, pos: 'C', tag: {}, transliteration: 'x' };
            expect(greekRecognitionClues(tok).map((p) => p.id)).toContain('postpositive');
        }
    });
});

describe('prepositionUsage — el caso cambia el sentido', () => {
    it('ἐν sólo rige dativo: sin alternativas que contrastar', async () => {
        const { prepositionUsage } = await import('../prepositionCases');
        const u = prepositionUsage('ἐν', 'D');
        expect(u?.active?.gloss).toContain('dentro de');
        expect(u?.alternatives).toHaveLength(0);
    });

    it('διά: genitivo es el MEDIO, acusativo el MOTIVO — y el contraste se muestra', async () => {
        const { prepositionUsage } = await import('../prepositionCases');
        const gen = prepositionUsage('διά', 'G');
        expect(gen?.active?.gloss).toContain('MEDIO');
        expect(gen?.alternatives[0]?.gloss).toContain('MOTIVO');

        const acc = prepositionUsage('διά', 'A');
        expect(acc?.active?.gloss).toContain('MOTIVO');
    });

    it('sin caso del término: no hay sentido activo, pero sí las opciones', async () => {
        const { prepositionUsage } = await import('../prepositionCases');
        const u = prepositionUsage('κατά', undefined);
        expect(u?.active).toBeUndefined();
        expect(u?.alternatives).toHaveLength(2);
    });

    it('un lema fuera del catálogo no inventa régimen', async () => {
        const { prepositionUsage } = await import('../prepositionCases');
        expect(prepositionUsage('χαίρω', 'D')).toBeNull();
    });
});
