import { describe, it, expect } from 'vitest';
import { buildPaperStudyContext } from '../buildPaperStudyContext';
import { buildEmptyCanonicalVerseAnalysis } from '../../entities/CanonicalVerseAnalysis';
import { EMPTY_STEP_SOURCE_PLAN } from '../../entities/StepSourcePlan';
import type { CanonicalVerseAnalysis } from '../../entities/CanonicalVerseAnalysis';
import type { ExegeticalPaper } from '../../entities/ExegeticalPaper';
import type { ExegeticalStep, ExegeticalStepVersion } from '../../entities/ExegeticalStep';
import type { ProjectSource } from '../../entities/ProjectSource';
import type { PassageReference } from '../../../bible/canon/passage-reference';
import type { SourceType } from '../../entities/SourceType';

const NOW = new Date('2026-01-01T00:00:00Z');

function makeAnalysis(verse: number, overrides: Partial<CanonicalVerseAnalysis> = {}): CanonicalVerseAnalysis {
    const ref: PassageReference = {
        bookId: 'JAS',
        chapterStart: 1,
        chapterEnd: 1,
        verseStart: verse,
        verseEnd: verse,
    };
    const base = buildEmptyCanonicalVerseAnalysis(ref);
    return { ...base, ...overrides };
}

function makeStep(
    order: number,
    analysis: CanonicalVerseAnalysis | null,
    overrides: Partial<ExegeticalStep> = {},
): ExegeticalStep {
    const accepted: ExegeticalStepVersion | null = analysis
        ? ({
            id: `v-${order}`,
            markdown: '',
            origin: 'generated',
            parentVersionId: null,
            createdAt: NOW,
            canonicalAnalysis: analysis,
        } as ExegeticalStepVersion)
        : null;
    return {
        id: `step-${order}`,
        paperId: 'paper-1',
        kind: 'verse',
        verseRef: analysis ? analysis.reference : null,
        order,
        state: accepted ? 'accepted' : 'pending',
        current: accepted,
        accepted,
        versions: accepted ? [accepted] : [],
        createdAt: NOW,
        updatedAt: NOW,
        ...overrides,
    };
}

function makeSource(
    id: string,
    displayLabel: string,
    citationKey: string | null,
    sourceType: SourceType = 'commentary-critical',
    order = 0,
): ProjectSource {
    return {
        id,
        paperId: 'paper-1',
        corpusId: `corpus-${id}`,
        sourceType,
        displayLabel,
        citationKey,
        order,
        mode: 'full-document',
        excerptSelectionMode: null,
        excerptRecipe: null,
        excerpts: [],
        sourceLibraryResourceId: null,
        extractedAt: null,
        extractionFingerprint: null,
        createdAt: NOW,
    };
}

function makePaper(overrides: Partial<ExegeticalPaper> = {}): ExegeticalPaper {
    return {
        id: 'paper-1',
        ownerId: 'owner-1',
        createdAt: NOW,
        updatedAt: NOW,
        passage: { bookId: 'JAS', chapterStart: 1, chapterEnd: 1, verseStart: 1, verseEnd: 5 },
        displayLanguage: 'es',
        assignmentBrief: null,
        styleGuideId: null,
        sources: [],
        rubric: null,
        stepPlan: EMPTY_STEP_SOURCE_PLAN,
        phase: 'in-progress',
        steps: [],
        currentStepId: null,
        assembledMarkdown: null,
        archivedAt: null,
        ...overrides,
    };
}

describe('buildPaperStudyContext', () => {
    it('names the paper even when nothing has been analyzed yet', () => {
        const ctx = buildPaperStudyContext(makePaper({ title: 'Santiago y la prueba' }), {
            language: 'es',
        });

        expect(ctx.text).toContain('Santiago y la prueba');
        expect(ctx.includedVerses).toEqual([]);
        expect(ctx.omittedVerses).toEqual([]);
    });

    it('carries the accepted analysis, not just the paper name', () => {
        const analysis = makeAnalysis(2, {
            verseThesis: 'El gozo es una decisión de juicio, no un sentimiento.',
            translationCruxes: [{
                phrase: 'Πᾶσαν χαρὰν',
                description: 'El adjetivo admite lectura cuantitativa o cualitativa.',
                options: [
                    { translation: 'sumo gozo', characterization: 'cualitativa' },
                    { translation: 'todo gozo', characterization: 'cuantitativa' },
                ],
                commentatorPositions: [
                    { sourceKey: 'Moo', page: 54, summary: 'Prefiere la cualitativa.', supports: 0 },
                ],
                commitment: {
                    chosen: 'sumo gozo',
                    rationale: 'El contexto de prueba pide intensidad, no extensión.',
                },
            }],
        });
        const paper = makePaper({ steps: [makeStep(1, analysis)] });

        const ctx = buildPaperStudyContext(paper, { language: 'es' });

        // The decision AND its reasoning both survive into the block.
        expect(ctx.text).toContain('Πᾶσαν χαρὰν');
        expect(ctx.text).toContain('sumo gozo');
        expect(ctx.text).toContain('El contexto de prueba pide intensidad, no extensión.');
        expect(ctx.text).toContain('El gozo es una decisión de juicio, no un sentimiento.');
        expect(ctx.includedVerses).toEqual(['Santiago 1:2']);
    });

    it('ignores generations the student has not accepted', () => {
        const pending = makeStep(1, null);
        pending.current = {
            id: 'v-draft',
            markdown: '',
            origin: 'generated',
            parentVersionId: null,
            createdAt: NOW,
            canonicalAnalysis: makeAnalysis(2, { verseThesis: 'Tesis todavía sin confirmar.' }),
        } as ExegeticalStepVersion;

        const ctx = buildPaperStudyContext(makePaper({ steps: [pending] }), { language: 'es' });

        expect(ctx.text).not.toContain('Tesis todavía sin confirmar.');
        expect(ctx.includedVerses).toEqual([]);
    });

    it('lists citable sources by key and drops the style template', () => {
        const paper = makePaper({
            sources: [
                makeSource('s-1', 'Moo, Santiago (TNTC)', 'Moo', 'commentary-critical', 0),
                makeSource('s-2', 'Paper modelo del profesor', 'Modelo', 'style-template-paper', 1),
            ],
        });

        const ctx = buildPaperStudyContext(paper, { language: 'es' });

        expect(ctx.text).toContain('Moo → Moo, Santiago (TNTC)');
        // `style-template-paper` is `never-cite`: naming it would teach
        // the student to cite a source the paper must never cite.
        expect(ctx.text).not.toContain('Paper modelo del profesor');
    });

    it('falls back to the display label when a source has no citation key', () => {
        const paper = makePaper({ sources: [makeSource('s-1', 'Tuggy Léxico', null)] });

        expect(buildPaperStudyContext(paper, { language: 'es' }).text)
            .toContain('Tuggy Léxico → Tuggy Léxico');
    });

    it('keeps verses in step order rather than array order', () => {
        const paper = makePaper({
            steps: [
                makeStep(3, makeAnalysis(4)),
                makeStep(1, makeAnalysis(2)),
                makeStep(2, makeAnalysis(3)),
            ],
        });

        expect(buildPaperStudyContext(paper, { language: 'es' }).includedVerses)
            .toEqual(['Santiago 1:2', 'Santiago 1:3', 'Santiago 1:4']);
    });

    it('says out loud which verses the budget left out', () => {
        const long = 'x'.repeat(4_000);
        const paper = makePaper({
            steps: [
                makeStep(1, makeAnalysis(2, { argumentativeRole: long })),
                makeStep(2, makeAnalysis(3, { argumentativeRole: long })),
                makeStep(3, makeAnalysis(4, { argumentativeRole: long })),
            ],
        });

        const ctx = buildPaperStudyContext(paper, { language: 'es', analysisCharBudget: 9_000 });

        expect(ctx.includedVerses).toEqual(['Santiago 1:2', 'Santiago 1:3']);
        expect(ctx.omittedVerses).toEqual(['Santiago 1:4']);
        // A tutor that silently received two of three verses would
        // answer confidently about a paper it half-read.
        expect(ctx.text).toContain('Santiago 1:4');
        expect(ctx.text).toMatch(/No caben aquí/);
    });

    it('always includes the first verse even when it alone exceeds the budget', () => {
        const paper = makePaper({
            steps: [makeStep(1, makeAnalysis(2, { argumentativeRole: 'y'.repeat(5_000) }))],
        });

        const ctx = buildPaperStudyContext(paper, { language: 'es', analysisCharBudget: 100 });

        expect(ctx.includedVerses).toEqual(['Santiago 1:2']);
        expect(ctx.omittedVerses).toEqual([]);
    });

    it('renders in English when the paper is in English', () => {
        const paper = makePaper({ steps: [makeStep(1, makeAnalysis(2))] });

        const ctx = buildPaperStudyContext(paper, { language: 'en' });

        expect(ctx.text).toContain('Active exegetical paper');
        expect(ctx.text).toContain('Analysis the student has already accepted');
        expect(ctx.includedVerses).toEqual(['James 1:2']);
    });
});

describe('buildPaperStudyContext — the verse on screen', () => {
    it('keeps the open step even when the budget only fits one verse', () => {
        const long = 'x'.repeat(8_000);
        const paper = makePaper({
            currentStepId: 'step-3',
            steps: [
                makeStep(1, makeAnalysis(2, { argumentativeRole: long })),
                makeStep(2, makeAnalysis(3, { argumentativeRole: long })),
                makeStep(3, makeAnalysis(4, { argumentativeRole: long })),
            ],
        });

        const ctx = buildPaperStudyContext(paper, { language: 'es', analysisCharBudget: 9_000 });

        // Step order would have dropped 1:4 first. The budget must never
        // be the reason the tutor is blind to what the student has open.
        expect(ctx.includedVerses).toEqual(['Santiago 1:4']);
        expect(ctx.omittedVerses).toEqual(['Santiago 1:2', 'Santiago 1:3']);
    });

    it('reports verses in reading order even though the open one was picked first', () => {
        const paper = makePaper({
            currentStepId: 'step-3',
            steps: [
                makeStep(1, makeAnalysis(2)),
                makeStep(2, makeAnalysis(3)),
                makeStep(3, makeAnalysis(4)),
            ],
        });

        const ctx = buildPaperStudyContext(paper, { language: 'es' });

        expect(ctx.includedVerses).toEqual(['Santiago 1:2', 'Santiago 1:3', 'Santiago 1:4']);
        expect(ctx.text!.indexOf('Santiago 1:2')).toBeLessThan(ctx.text!.indexOf('Santiago 1:4'));
    });
});

describe('buildPaperStudyContext — qué hacer con las citas textuales', () => {
    it('dice cómo responder cuando piden la cita exacta', () => {
        const paper = makePaper({ steps: [makeStep(1, makeAnalysis(2))] });

        const text = buildPaperStudyContext(paper, { language: 'es' }).text!;

        // Repetir autor y página no es dar la cita: el estudiante ya
        // los tiene, por eso pregunta.
        expect(text).toContain('CITA EXACTA');
        expect(text).toContain('verbatim:');
        expect(text).toMatch(/no guardó cita textual/);
    });

    it('lo dice también en inglés', () => {
        const paper = makePaper({ steps: [makeStep(1, makeAnalysis(2))] });

        const text = buildPaperStudyContext(paper, { language: 'en' }).text!;

        expect(text).toContain('EXACT quote');
        expect(text).toContain('stored no quote');
    });
});

describe('buildPaperStudyContext — citas de rango léxico', () => {
    it('explica qué ofrecer cuando el rango no puede llevar cita textual', () => {
        const paper = makePaper({ steps: [makeStep(1, makeAnalysis(2))] });

        const text = buildPaperStudyContext(paper, { language: 'es' }).text!;

        // `SourceCitation` no tiene campo verbatim: sin esto el tutor
        // responde "no se guardó nada" y calla las glosas que sí están.
        expect(text).toContain('general range');
        expect(text).toMatch(/transcribe las glosas/);
    });
});
