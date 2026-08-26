import { describe, it, expect } from 'vitest';
import { buildGreekInsightPrompt } from '../buildGreekInsightPrompt';
import { parseGreekInsight } from '../parseGreekInsight';
import type { GreekWordToken } from '../morphGntToken';

const tokens: GreekWordToken[] = [
    { text: 'Πᾶσαν', lemma: 'πᾶς', pos: 'A', tag: { case: 'A', number: 'S', gender: 'F' }, transliteration: 'Pasan' },
    { text: 'χαρὰν', lemma: 'χαρά', pos: 'N', tag: { case: 'A', number: 'S', gender: 'F' }, transliteration: 'charan' },
    {
        text: 'ἡγήσασθε,', lemma: 'ἡγέομαι', pos: 'V',
        tag: { person: '2', tense: 'A', voice: 'M', mood: 'D', number: 'P' }, transliteration: 'hēgēsasthe,',
    },
];

describe('buildGreekInsightPrompt', () => {
    const p = buildGreekInsightPrompt({ reference: 'Santiago 1:2', tokens });

    it('la morfología viaja RESUELTA y en palabras, no en códigos', () => {
        expect(p).toContain('verbo, aoristo, media, imperativo, 2ª persona, plural');
        expect(p).toContain('NO la recalcules');
        expect(p).not.toContain('2AMD');
    });

    it('exige el conteo exacto de palabras y pide el rango, no un sentido', () => {
        expect(p).toContain('EXACTAMENTE 3 palabras');
        expect(p).toContain('rango semántico del LEMA');
    });
});

describe('parseGreekInsight — el alineamiento es el contrato', () => {
    const valido = JSON.stringify({
        literalTranslation: 'Toda alegría considerad…',
        fluidTranslation: 'Considérenlo todo motivo de alegría…',
        words: [
            { text: 'Πᾶσαν', semanticRange: 'todo / cada / entero', syntacticFunction: 'modifica a χαρὰν', translation: 'toda' },
            { text: 'χαρὰν', semanticRange: 'alegría / gozo', syntacticFunction: 'objeto directo', translation: 'alegría' },
            { text: 'ἡγήσασθε,', semanticRange: 'considerar / estimar / guiar', syntacticFunction: 'verbo principal', translation: 'considerad' },
        ],
    });

    it('acepta la respuesta bien alineada', () => {
        const out = parseGreekInsight(valido, { reference: 'JAS 1:2', expectedWordCount: 3 });
        expect(out?.words).toHaveLength(3);
        expect(out?.words[1].semanticRange).toContain('gozo');
    });

    it('RECHAZA la respuesta con una palabra de menos — corrida es peor que ausente', () => {
        const corta = JSON.parse(valido);
        corta.words.pop();
        expect(parseGreekInsight(JSON.stringify(corta), { reference: 'JAS 1:2', expectedWordCount: 3 })).toBeNull();
    });

    it('rechaza campos vacíos y JSON roto', () => {
        const vacia = JSON.parse(valido);
        vacia.words[0].semanticRange = '';
        expect(parseGreekInsight(JSON.stringify(vacia), { reference: 'JAS 1:2', expectedWordCount: 3 })).toBeNull();
        expect(parseGreekInsight('no es json', { reference: 'JAS 1:2', expectedWordCount: 3 })).toBeNull();
    });

    it('tolera texto alrededor del JSON (fences del modelo)', () => {
        const out = parseGreekInsight('```json\n' + valido + '\n```', { reference: 'JAS 1:2', expectedWordCount: 3 });
        expect(out).not.toBeNull();
    });
});
