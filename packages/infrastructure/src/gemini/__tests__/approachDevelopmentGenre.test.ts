import { describe, it, expect } from 'vitest';
import type { ExegeticalStudy, GenerationRules } from '@dosfilos/domain';
import { ApproachDevelopmentPromptBuilder } from '../prompts/ApproachDevelopmentPromptBuilder';

/**
 * El GÉNERO gobierna las reglas de lectura (Phase 1.6, ADR-022/024) y hasta
 * 2026-08-22 no llegaba a este prompt: viajaba en `rules.pastoralSeed` hasta la
 * puerta del builder y se quedaba afuera. La sección se llamaba "ESTUDIO
 * EXEGÉTICO COMPLETO" y omitía justamente ese campo.
 *
 * Estos tests existen porque el fallo era invisible: el prompt se generaba
 * igual, sin error, pidiendo la misma forma de bosquejo para una epístola, una
 * narrativa y un proverbio.
 */

const exegesis = {
    passage: 'Jonás 1:1-3',
    exegeticalProposition: 'Dios llama y el profeta huye.',
    context: { historical: 'h', literary: 'l', audience: 'a' },
    keyWords: [],
    pastoralInsights: ['la gracia persigue'],
} as unknown as ExegeticalStudy;

const preview = {
    id: 'pastoral-1',
    type: 'pastoral',
    tone: 'exhortativo',
    direction: 'consolar',
    purpose: 'p',
    targetAudience: 'ta',
    rationale: 'r',
} as never;

function build(seedExtras: Record<string, unknown> | null): string {
    const rules = (seedExtras
        ? { pastoralSeed: { ...seedExtras } }
        : {}) as unknown as GenerationRules;
    return new ApproachDevelopmentPromptBuilder()
        .withExegesis(exegesis)
        .withSelectedPreview(preview)
        .withRules(rules)
        .build();
}

describe('el género llega al prompt de homilética', () => {
    it('narrativa: los puntos salen de los GIROS DE LA TRAMA, no de un argumento', () => {
        const p = build({ genre: 'narrative' });
        expect(p).toContain('Género del pasaje');
        expect(p.toLowerCase()).toContain('giros de la trama');
    });

    it('epístola: los puntos salen de los movimientos del argumento', () => {
        const p = build({ genre: 'epistle' });
        expect(p.toLowerCase()).toContain('conectores lógicos');
    });

    it('parábola: punto único, y avisa que no multiplique', () => {
        const p = build({ genre: 'parable' });
        expect(p).toContain('No multipliques los puntos');
    });

    it('el rango del género MANDA sobre el rango genérico del bosquejo', () => {
        const p = build({ genre: 'parable' });
        expect(p).toContain('MANDA sobre el rango genérico');
        // Y aparece después del genérico, que es lo que le permite corregirlo.
        expect(p.indexOf('MANDA sobre el rango genérico')).toBeGreaterThan(p.indexOf('BOSQUEJO DETALLADO'));
    });

    it('dice explícitamente que NO se rellene hasta el número', () => {
        // Dar un rango sin esto invita al modelo a completar puntos que el
        // texto no rinde. La vara es cobertura + anclaje, no conteo.
        const p = build({ genre: 'narrative' });
        expect(p).toContain('NO rellenes hasta llegar al número');
        expect(p.toLowerCase()).toContain('el texto manda sobre el rango');
    });

    it('la lectura del PASTOR sobre el género viaja junto al género', () => {
        const p = build({ genre: 'narrative', genreImplication: 'se lee siguiendo la huida de Jonás' });
        expect(p).toContain('se lee siguiendo la huida de Jonás');
    });

    it('sin género no se inventa estructura', () => {
        const p = build({ centralIdea: 'algo' });
        expect(p).not.toContain('Género del pasaje');
        expect(p).not.toContain('MANDA sobre el rango genérico');
    });

    it('género fuera del catálogo tampoco inventa estructura', () => {
        const p = build({ genre: 'genealogía-inventada' });
        expect(p).not.toContain('MANDA sobre el rango genérico');
    });

    it('sin pastoralSeed el prompt sigue armándose (no revienta)', () => {
        expect(build(null).length).toBeGreaterThan(500);
    });
});
