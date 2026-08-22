import { describe, it, expect } from 'vitest';
import { buildSermonDraftPrompt } from '../prompts-generator';
import type { HomileticalAnalysis, GenerationRules } from '@dosfilos/domain';

/**
 * La guía de ilustraciones sale de 90 ilustraciones REALES del fundador, no de
 * teoría homilética general. Estos tests la anclan al prompt del borrador —
 * hasta 2026-08-22 la instrucción eran cuatro líneas dispersas ("relevante",
 * "memorable", "no repitas categoría") y ninguna describía su forma.
 *
 * Los dos CEROS del corpus (ninguna cita de persona famosa, ninguna estadística
 * en 90) son elección, no descuido: por eso el prompt los prohíbe explícito y
 * por eso se testean.
 */

const analysis: HomileticalAnalysis = {
    exegeticalStudy: {
        passage: 'Jonás 1:1-3',
        context: { historical: 'h', literary: 'l', audience: 'a' },
        keyWords: [],
        exegeticalProposition: 'ep',
        pastoralInsights: [],
    },
    homileticalApproach: 'pastoral',
    contemporaryApplication: [],
    homileticalProposition: 'hp',
    outline: { mainPoints: [{ title: 'I', description: 'd', scriptureReferences: [] }] },
} as HomileticalAnalysis;

const rules: GenerationRules = { tone: 'pastoral' };
const prompt = buildSermonDraftPrompt(analysis, rules);

describe('la guía de ilustraciones llega al prompt del borrador', () => {
    it('está incluida', () => {
        expect(prompt).toContain('Guía de Ilustraciones');
    });

    it('pide el puente explícito, que es lo que separa adorno de argumento', () => {
        expect(prompt).toContain('Puente explícito');
        expect(prompt).toContain('Así mismo');
    });

    it('pide la apertura que invita a imaginar', () => {
        expect(prompt.toLowerCase()).toContain('imaginemos');
    });

    it('prohíbe citar a una persona famosa (0 de 90 en el corpus)', () => {
        expect(prompt).toContain('Citar a una persona famosa');
    });

    it('prohíbe fechas y estadísticas (0 de 90 en el corpus)', () => {
        expect(prompt).toContain('Fechas, estadísticas, estudios');
    });

    it('prohíbe la anécdota falsa presentada como real', () => {
        // Inventar "una vez conocí a un hombre" es inventar la biografía del
        // predicador. La analogía hipotética es honesta porque se anuncia.
        expect(prompt).toContain('No inventes su biografía');
    });

    it('deja claro que la ilustración del pastor manda sobre la generada', () => {
        expect(prompt).toContain('La ilustración del pastor manda');
        expect(prompt).toContain('nunca de un banco de');
    });

    it('conserva la regla previa de no repetir categoría entre puntos', () => {
        expect(prompt).toContain('Diversidad de ilustraciones');
    });

    it('admite el ejemplo bíblico como familia legítima, con el dato real', () => {
        expect(prompt).toContain('Ejemplo bíblico');
        expect(prompt).toContain('debe ser REAL y verificable');
    });
});
