import { describe, it, expect } from 'vitest';
import { buildSermonDraftPrompt } from '../prompts-generator';
import type { HomileticalAnalysis, GenerationRules } from '@dosfilos/domain';

const baseAnalysis: HomileticalAnalysis = {
    exegeticalStudy: {
        passage: 'Juan 3:16',
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

describe('buildSermonDraftPrompt — paper context preservation (T3 #16 Fase 1)', () => {
    it('omits the paper context block when rules.paperContext is undefined', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules);
        expect(prompt).not.toContain('CONTEXTO DE ORIGEN — PAPER EXEGÉTICO');
        expect(prompt).not.toContain('--- BEGIN PAPER ---');
    });

    it('omits the block when paperContext.assembledMarkdown is empty or whitespace', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            paperContext: { passage: 'Juan 3:16', assembledMarkdown: '   ' },
        });
        expect(prompt).not.toContain('CONTEXTO DE ORIGEN');
    });

    it('injects the paper passage, title, brief, and full assembled markdown', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            paperContext: {
                passage: '1 Pedro 2:11-17',
                title: 'Vivir como extranjeros',
                assignmentBrief: 'Sermón dominical, congregación reformada',
                assembledMarkdown: '# Paper completo\n\nAnálisis exegético del pasaje...',
            },
        });
        expect(prompt).toContain('CONTEXTO DE ORIGEN — PAPER EXEGÉTICO');
        expect(prompt).toContain('1 Pedro 2:11-17');
        expect(prompt).toContain('Vivir como extranjeros');
        expect(prompt).toContain('Sermón dominical, congregación reformada');
        expect(prompt).toContain('# Paper completo');
        expect(prompt).toContain('--- BEGIN PAPER ---');
        expect(prompt).toContain('--- END PAPER ---');
    });

    it('keeps the no-invented-citations anti-hallucination guidance in the paper block', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            paperContext: {
                passage: 'Juan 3:16',
                assembledMarkdown: '# Paper\n\ncontent',
            },
        });
        expect(prompt).toContain('NO inventes');
    });

    it('places the paper block above FASE 3 so the model attends to it first', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            paperContext: {
                passage: 'Juan 3:16',
                assembledMarkdown: '# Paper\n\ncontent',
            },
        });
        const paperIdx = prompt.indexOf('CONTEXTO DE ORIGEN');
        const fase3Idx = prompt.indexOf('FASE 3');
        expect(paperIdx).toBeGreaterThan(-1);
        expect(fase3Idx).toBeGreaterThan(paperIdx);
    });
});
