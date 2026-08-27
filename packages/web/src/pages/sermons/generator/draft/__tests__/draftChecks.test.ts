import { describe, it, expect } from 'vitest';
import { draftIncludesCentralIdea, draftMissingParallelRefs, shouldJudgeSample } from '../draftChecks';

const borrador = {
    title: 'Cuando la prueba trabaja a favor',
    introduction: 'Nadie pide una prueba.',
    conclusion: 'Dios usa la prueba para completarte.',
    callToAction: 'Pídele sabiduría hoy.',
    body: [
        { content: 'La prueba produce paciencia.', scriptureReferences: ['Romanos 5:3-4'] },
        { content: 'La paciencia termina su obra.', scriptureReferences: ['1 Pedro 1:6-7'] },
    ],
};

describe('draftIncludesCentralIdea', () => {
    it('encuentra la idea aunque cambien mayúsculas y espacios', () => {
        expect(draftIncludesCentralIdea(borrador, 'Dios   USA la\nprueba')).toBe(true);
    });

    it('avisa cuando el borrador no la conserva', () => {
        expect(draftIncludesCentralIdea(borrador, 'La fe sin obras es muerta')).toBe(false);
    });

    it('sin idea declarada no hay nada que comprobar', () => {
        // Un `false` acá acusaría al pastor por algo que nunca escribió.
        expect(draftIncludesCentralIdea(borrador, '   ')).toBe(true);
    });

    it('NO mira las referencias de los puntos', () => {
        // La idea central es prosa: hallarla en una lista de citas sería un
        // falso positivo — el sermón no la habría dicho.
        expect(draftIncludesCentralIdea(borrador, 'Romanos 5:3-4')).toBe(false);
    });
});

describe('draftMissingParallelRefs', () => {
    it('sí mira las referencias de los puntos', () => {
        expect(draftMissingParallelRefs(borrador, [{ reference: 'Romanos 5:3-4' }])).toEqual([]);
    });

    it('devuelve sólo los que faltan', () => {
        const faltan = draftMissingParallelRefs(borrador, [
            { reference: '1 Pedro 1:6-7' },
            { reference: 'Job 23:10' },
        ]);
        expect(faltan).toEqual(['Job 23:10']);
    });

    it('sin paralelos marcados no reclama nada', () => {
        expect(draftMissingParallelRefs(borrador, undefined)).toEqual([]);
        expect(draftMissingParallelRefs(borrador, [])).toEqual([]);
    });

    it('ignora referencias vacías', () => {
        expect(draftMissingParallelRefs(borrador, [{ reference: '  ' }])).toEqual([]);
    });
});

describe('shouldJudgeSample', () => {
    it('el mismo sermón cae siempre del mismo lado', () => {
        // Determinista a propósito: si dependiera del azar, regenerar dos veces
        // el mismo sermón lo contaría distinto y la medición no valdría nada.
        const id = 'sermon-abc-123';
        expect(shouldJudgeSample(id)).toBe(shouldJudgeSample(id));
    });
});
