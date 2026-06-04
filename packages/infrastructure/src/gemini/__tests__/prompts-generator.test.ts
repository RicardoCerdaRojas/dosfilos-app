import { describe, it, expect } from 'vitest';
import { buildSermonDraftPrompt } from '../prompts-generator';
import type { HomileticalAnalysis, GenerationRules, CitationManifest } from '@dosfilos/domain';

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

describe('buildSermonDraftPrompt — Faculty context preservation (T3 #16 Fase 2)', () => {
    it('omits the Faculty block when facultyContext is undefined', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules);
        expect(prompt).not.toContain('CONTEXTO DE ORIGEN — FACULTAD');
        expect(prompt).not.toContain('Bosquejo aprobado en la facultad');
    });

    it('injects sessionTitle + outline (title / passage / proposition / points)', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            facultyContext: {
                sessionTitle: 'Estudio sobre 1 Pedro',
                outline: {
                    title: 'Vivir como extranjeros',
                    passage: '1 Pedro 2:11-17',
                    proposition: 'En 📖 1 Pedro 2:11-17 aprenderás a vivir con santidad ante el mundo.',
                    points: [
                        { title: 'Reconoce tu identidad', verses: 'vv. 11-12' },
                        { title: 'Somete tu voluntad', verses: 'vv. 13-15' },
                        { title: 'Honra a todos', verses: 'vv. 16-17' },
                    ],
                },
            },
        });
        expect(prompt).toContain('CONTEXTO DE ORIGEN — FACULTAD');
        expect(prompt).toContain('Estudio sobre 1 Pedro');
        expect(prompt).toContain('Vivir como extranjeros');
        expect(prompt).toContain('1 Pedro 2:11-17');
        expect(prompt).toContain('vivir con santidad ante el mundo');
        expect(prompt).toContain('I. Reconoce tu identidad (vv. 11-12)');
        expect(prompt).toContain('II. Somete tu voluntad (vv. 13-15)');
        expect(prompt).toContain('III. Honra a todos (vv. 16-17)');
        expect(prompt).toContain('NO cambies el título');
    });
});

describe('buildSermonDraftPrompt — project context preservation (T3 #16 Fase 2)', () => {
    it('omits the project block when projectContext is undefined', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules);
        expect(prompt).not.toContain('CONTEXTO DEL PROYECTO');
    });

    it('omits when contextNote is blank or whitespace', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            projectContext: { name: 'Serie Juan', contextNote: '   ' },
        });
        expect(prompt).not.toContain('CONTEXTO DEL PROYECTO');
    });

    it('injects project name + contextNote when present', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            projectContext: {
                name: 'Serie Juan',
                contextNote: 'Congregación reformada, 80 personas, nivel teológico medio-alto, énfasis pastoral en santificación.',
            },
        });
        expect(prompt).toContain('CONTEXTO DEL PROYECTO');
        expect(prompt).toContain('Serie Juan');
        expect(prompt).toContain('Congregación reformada');
        expect(prompt).toContain('nivel teológico medio-alto');
        expect(prompt).toContain('Adapta el tono');
    });

    it('stacks project + paper + faculty blocks when all three are present', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, {
            ...baseRules,
            projectContext: { name: 'Serie Juan', contextNote: 'Reformados' },
            paperContext: { passage: 'Juan 3:16', assembledMarkdown: '# Paper\n\ncontent' },
            facultyContext: {
                sessionTitle: 'Estudio',
                outline: {
                    title: 't', passage: 'p', proposition: 'pr',
                    points: [{ title: 'pt', verses: 'v' }],
                },
            },
        });
        const projectIdx = prompt.indexOf('CONTEXTO DEL PROYECTO');
        const paperIdx = prompt.indexOf('CONTEXTO DE ORIGEN — PAPER EXEGÉTICO');
        const facultyIdx = prompt.indexOf('CONTEXTO DE ORIGEN — FACULTAD');
        const fase3Idx = prompt.indexOf('FASE 3');
        expect(projectIdx).toBeGreaterThan(-1);
        expect(paperIdx).toBeGreaterThan(projectIdx);
        expect(facultyIdx).toBeGreaterThan(paperIdx);
        expect(fase3Idx).toBeGreaterThan(facultyIdx);
    });
});

describe('buildSermonDraftPrompt — narrative + verifiable anchor citation contract (ADR-031)', () => {
    const manifest: CitationManifest = {
        entries: [
            { sourceId: 'S1', title: 'Volvamos a la predicación Bíblica', author: 'Subukjian', page: '102', excerpt: 'La doctrina es el negocio del predicador.' },
            { sourceId: 'S2', title: 'Comentario de 2 Pedro', author: 'Schreiner', excerpt: 'El verbo denota una acción decisiva.' },
        ],
    } as CitationManifest;

    it('omits the citation contract block when the manifest is empty', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules, undefined, {
            entries: [],
        } as CitationManifest);
        expect(prompt).not.toContain('FUENTES DISPONIBLES PARA CITAR');
    });

    it('instructs BOTH narrative attribution AND a verifiable [Sn] anchor (ADR-031)', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules, undefined, manifest);
        expect(prompt).toContain('FUENTES DISPONIBLES PARA CITAR');
        expect(prompt).toContain('Atribución NARRATIVA');
        expect(prompt).toContain('Ancla verificable');
    });

    it('requires at least one citation per point and forbids inventing citations', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules, undefined, manifest);
        expect(prompt).toContain('Una cita por punto');
        expect(prompt).toContain('NUNCA inventes una cita');
        expect(prompt).toContain('grounding'); // fidelity-to-text rule
    });

    it('surfaces the source S-IDs + textual excerpt as the citation evidence', () => {
        const prompt = buildSermonDraftPrompt(baseAnalysis, baseRules, undefined, manifest);
        expect(prompt).toContain('[S1]');
        expect(prompt).toContain('[S2]');
        expect(prompt).toContain('La doctrina es el negocio del predicador.');
        expect(prompt).toContain('ragSources');
    });
});
