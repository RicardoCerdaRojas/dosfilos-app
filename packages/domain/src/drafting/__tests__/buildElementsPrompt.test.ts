import { describe, it, expect } from 'vitest';
import { buildElementsPrompt } from '../buildElementsPrompt';

describe('el estudio del pastor como fuente primaria', () => {
    it('con estudio, el prompt lo declara fuente primaria con sus hallazgos', () => {
        const p = buildElementsPrompt({
            passage: 'Jonás 1:1-3',
            sectionLabel: 'Contexto Histórico',
            sectionJob: 'Ubicar el pasaje',
            study: {
                exegeticalProposition: 'Jonás huye del carácter misericordioso de Dios.',
                historical: 'Nínive, capital asiria, siglo VIII a.C.',
                audience: 'Israel del norte bajo Jeroboam II.',
            },
        });
        expect(p).toContain('LA FUENTE PRIMARIA');
        expect(p).toContain('Nínive, capital asiria');
        expect(p).toContain('Jonás huye del carácter misericordioso');
    });

    it('sin estudio no hay bloque — no se anuncia una fuente vacía', () => {
        const p = buildElementsPrompt({
            passage: 'Jonás 1:1-3',
            sectionLabel: 'x',
            sectionJob: 'y',
        });
        expect(p).not.toContain('FUENTE PRIMARIA');
    });

    it('un estudio con todos los campos vacíos tampoco genera bloque', () => {
        const p = buildElementsPrompt({
            passage: 'Jonás 1:1-3',
            sectionLabel: 'x',
            sectionJob: 'y',
            study: {},
        });
        expect(p).not.toContain('FUENTE PRIMARIA');
    });
});
