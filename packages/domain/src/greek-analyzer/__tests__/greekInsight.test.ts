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

describe('keyInsights — el "¿y qué?" homilético (fase 3)', () => {
    const base = {
        literalTranslation: 'lit', fluidTranslation: 'fluida',
        words: [{ text: 'χαίρειν.', semanticRange: 'a / b', syntacticFunction: 'f', translation: 't' }],
    };

    it('acepta hasta 3 claves bien formadas y descarta las malformadas SIN tumbar el análisis', () => {
        const out = parseGreekInsight(
            JSON.stringify({
                ...base,
                keyInsights: [
                    { text: 'χαίρειν.', significance: 'El infinitivo de saludo…' },
                    { text: '', significance: 'sin palabra' },
                    { text: 'x', significance: '' },
                ],
            }),
            { reference: 'JAS 1:1', expectedWordCount: 1 },
        );
        expect(out?.keyInsights).toHaveLength(1);
        expect(out?.words).toHaveLength(1);
    });

    it('un caché anterior (sin keyInsights) sigue siendo válido', () => {
        const out = parseGreekInsight(JSON.stringify(base), { reference: 'JAS 1:1', expectedWordCount: 1 });
        expect(out).not.toBeNull();
        expect(out?.keyInsights).toBeUndefined();
    });

    it('recorta a 3: sólo las palabras que cargan el peso, no una glosa por palabra', () => {
        const out = parseGreekInsight(
            JSON.stringify({
                ...base,
                keyInsights: Array.from({ length: 5 }, (_, i) => ({ text: `w${i}`, significance: 's' })),
            }),
            { reference: 'JAS 1:1', expectedWordCount: 1 },
        );
        expect(out?.keyInsights).toHaveLength(3);
    });
});

describe('caseFunction — la taxonomía es CERRADA (v5)', () => {
    const conFuncion = (caseFunction: string, nameNote = '') =>
        JSON.stringify({
            literalTranslation: 'lit',
            fluidTranslation: 'fluida',
            words: [{ text: 'Ἰάκωβος', semanticRange: 'a / b', syntacticFunction: 'f', translation: 'Santiago', caseFunction, nameNote }],
        });

    const parse = (raw: string) =>
        parseGreekInsight(raw, { reference: 'JAS 1:1', expectedWordCount: 1, cases: ['N'] });

    it('acepta una función válida para ESE caso — el caso real de Santiago 1:1', () => {
        expect(parse(conFuncion('absolute'))?.words[0].caseFunction).toBe('absolute');
    });

    it('DESCARTA una función que no pertenece al caso (no hay "posesión" nominativa)', () => {
        // El profesor del fundador la habría llamado mal; el sistema no la
        // repite. Una etiqueta con aire académico que nadie reconoce es peor
        // que ninguna: el pastor la repetiría en clase.
        expect(parse(conFuncion('possession'))?.words[0].caseFunction).toBeUndefined();
    });

    it('descarta una etiqueta inventada, y el resto del análisis sobrevive', () => {
        const out = parse(conFuncion('nominativoDeSaludoProfético'));
        expect(out?.words[0].caseFunction).toBeUndefined();
        expect(out?.words[0].translation).toBe('Santiago');
    });

    it('la nota del nombre viaja cuando tiene contenido', () => {
        const out = parse(conFuncion('absolute', 'Del latín Iacobus → "Sant Iago". El doblete culto es Jacobo.'));
        expect(out?.words[0].nameNote).toContain('Jacobo');
    });

    it('sin la lista de casos no se valida nada: la función se descarta', () => {
        const out = parseGreekInsight(conFuncion('absolute'), { reference: 'JAS 1:1', expectedWordCount: 1 });
        expect(out?.words[0].caseFunction).toBeUndefined();
    });
});
