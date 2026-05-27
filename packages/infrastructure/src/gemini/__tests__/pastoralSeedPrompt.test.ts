import { describe, it, expect } from 'vitest';
import { buildSermonDraftPrompt } from '../prompts-generator';
import type { HomileticalAnalysis, GenerationRules } from '@dosfilos/domain';

const baseAnalysis: HomileticalAnalysis = {
    exegeticalStudy: {
        passage: 'Romanos 8:1-4',
        context: { historical: 'h', literary: 'l', audience: 'a' },
        keyWords: [],
        exegeticalProposition: 'ep',
        pastoralInsights: [],
    },
    homileticalApproach: 'expository',
    contemporaryApplication: [],
    homileticalProposition: 'hp',
    outline: { mainPoints: [{ title: 'I', description: 'd', scriptureReferences: [] }] },
};

const baseRules: GenerationRules = { tone: 'pastoral' };

const fullSeed = {
    centralIdea: 'En Cristo no hay condenación para los que están unidos a Él por la fe.',
    observations: [
        'Pablo declara la libertad del creyente del juicio condenatorio.',
        'La ley fracasó por la debilidad de la carne, no por sí misma.',
        'El Espíritu cumple en nosotros lo que la ley exigía.',
    ],
    openQuestion: '¿Cómo vives sabiendo que ya no hay condenación contra ti?',
    pastoralAnecdote:
        'Conversación con un creyente atrapado en culpa, redescubriendo Rom 8:1 en cuidado pastoral.',
    doxologicalApplication:
        'Adoración al Cristo cuya obra obtuvo justicia perfecta, vida santa que responde al evangelio.',
    mainClauseReference: 'Romanos 8:1a',
    mainClauseNote: 'Indicativo declarativo, presente atemporal — estado actual del creyente.',
    wordStudies: [
        { word: 'κατάκριμα', reference: 'Rom 8:1', discovery: 'sentencia condenatoria, no proceso' },
    ],
    parallels: [
        { reference: 'Gálatas 5:1', relevance: 'libertad evangélica paralela a Romanos 8' },
    ],
    originalAudienceFunction:
        'Consolar a creyentes romanos divididos entre judíos y gentiles, asegurando posición común en Cristo.',
};

describe('buildSermonDraftPrompt — Pastoral Fidelity PRIMARY VOICE block', () => {
    it('omits the block when rules.pastoralSeed is undefined', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules);
        expect(prompt).not.toContain('PRIMARY VOICE');
        expect(prompt).not.toContain('LA VOZ DEL PASTOR');
    });

    it('prepends the PRIMARY VOICE block when pastoralSeed is supplied', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            pastoralSeed: fullSeed,
        });
        expect(prompt).toContain('PRIMARY VOICE (LA VOZ DEL PASTOR — NO ANULAR)');
        expect(prompt).toContain(fullSeed.centralIdea);
        expect(prompt).toContain(fullSeed.openQuestion);
        expect(prompt).toContain(fullSeed.doxologicalApplication);
    });

    it('includes the verbatim instruction the post-gen check enforces', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            pastoralSeed: fullSeed,
        });
        expect(prompt).toContain('VERBATIM');
    });

    it('lists every observation, word study and parallel inline', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            pastoralSeed: fullSeed,
        });
        for (const obs of fullSeed.observations) expect(prompt).toContain(obs);
        for (const w of fullSeed.wordStudies) expect(prompt).toContain(w.word);
        for (const p of fullSeed.parallels) expect(prompt).toContain(p.reference);
    });

    it('positions the PRIMARY VOICE block before paper context when both are supplied', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            pastoralSeed: fullSeed,
            paperContext: {
                passage: 'Romanos 8:1-4',
                title: 'Paper sobre la no-condenación',
                assembledMarkdown: '## Paper completo\n\n…',
            },
        });
        const seedIdx = prompt.indexOf('PRIMARY VOICE');
        const paperIdx = prompt.indexOf('CONTEXTO DE ORIGEN — PAPER');
        expect(seedIdx).toBeGreaterThanOrEqual(0);
        expect(paperIdx).toBeGreaterThan(seedIdx);
    });
});
