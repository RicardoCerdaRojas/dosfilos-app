import { describe, it, expect } from 'vitest';
import {
    isStepPlanStale,
    computeCorpusCoverageReport,
} from '../corpusUsagePlan';
import { EMPTY_STEP_SOURCE_PLAN } from '../StepSourcePlan';
import type { ExegeticalPaper } from '../ExegeticalPaper';
import type { ProjectSource } from '../ProjectSource';
import type { ExegeticalStep, ExegeticalStepVersion } from '../ExegeticalStep';

const NOW = new Date('2026-01-01T00:00:00Z');

function makeSource(id: string, label: string, citationKey: string | null = null): ProjectSource {
    return {
        id,
        paperId: 'paper-1',
        corpusId: `corpus-${id}`,
        sourceType: 'commentary-critical',
        displayLabel: label,
        citationKey,
        order: 0,
        mode: 'full-document',
        excerpts: [],
        sourceLibraryResourceId: null,
        createdAt: NOW,
    };
}

function makeStep(
    id: string,
    accepted: { markdown: string } | null,
): ExegeticalStep {
    const acceptedVersion: ExegeticalStepVersion | null = accepted
        ? {
            id: `${id}-v1`,
            markdown: accepted.markdown,
            origin: 'generated',
            parentVersionId: null,
            createdAt: NOW,
        } as ExegeticalStepVersion
        : null;
    return {
        id,
        paperId: 'paper-1',
        kind: 'verse',
        verseRef: null,
        order: 1,
        state: accepted ? 'accepted' : 'pending',
        current: acceptedVersion,
        accepted: acceptedVersion,
        versions: acceptedVersion ? [acceptedVersion] : [],
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function makePaper(overrides: Partial<ExegeticalPaper>): ExegeticalPaper {
    return {
        id: 'paper-1',
        ownerId: 'owner-1',
        createdAt: NOW,
        updatedAt: NOW,
        passage: { bookId: 'HEB', chapterStart: 1, chapterEnd: 1, verseStart: 1, verseEnd: 4 },
        displayLanguage: 'es',
        assignmentBrief: null,
        styleGuideId: null,
        sources: [],
        rubric: null,
        stepPlan: EMPTY_STEP_SOURCE_PLAN,
        phase: 'configuring',
        steps: [],
        currentStepId: null,
        assembledMarkdown: null,
        archivedAt: null,
        ...overrides,
    };
}

describe('isStepPlanStale', () => {
    it('returns false when planner has never run (no snapshot)', () => {
        const paper = makePaper({ sources: [makeSource('s-1', 'A')] });
        expect(isStepPlanStale(paper)).toBe(false);
    });

    it('returns false when current sources match the snapshot exactly', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'A'), makeSource('s-2', 'B')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                proposedAt: NOW,
                proposalCorpusSourceIds: ['s-1', 's-2'],
            },
        });
        expect(isStepPlanStale(paper)).toBe(false);
    });

    it('order does not matter — snapshot and current compared as sets', () => {
        const paper = makePaper({
            sources: [makeSource('s-2', 'B'), makeSource('s-1', 'A')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                proposedAt: NOW,
                proposalCorpusSourceIds: ['s-1', 's-2'],
            },
        });
        expect(isStepPlanStale(paper)).toBe(false);
    });

    it('returns true when a new source was added after the plan', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'A'), makeSource('s-2', 'B'), makeSource('s-3', 'C')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                proposedAt: NOW,
                proposalCorpusSourceIds: ['s-1', 's-2'],
            },
        });
        expect(isStepPlanStale(paper)).toBe(true);
    });

    it('returns true when a source was removed after the plan', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'A')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                proposedAt: NOW,
                proposalCorpusSourceIds: ['s-1', 's-2'],
            },
        });
        expect(isStepPlanStale(paper)).toBe(true);
    });

    it('returns true when a source was swapped (same count, different ids)', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'A'), makeSource('s-3', 'C')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                proposedAt: NOW,
                proposalCorpusSourceIds: ['s-1', 's-2'],
            },
        });
        expect(isStepPlanStale(paper)).toBe(true);
    });

    it('returns false when an empty snapshot matches an empty corpus', () => {
        const paper = makePaper({
            sources: [],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                proposedAt: NOW,
                proposalCorpusSourceIds: [],
            },
        });
        expect(isStepPlanStale(paper)).toBe(false);
    });
});

describe('computeCorpusCoverageReport', () => {
    it('returns empty array for a paper with no sources', () => {
        expect(computeCorpusCoverageReport(makePaper({}))).toEqual([]);
    });

    it('classifies a planned-and-cited source as planned-and-cited', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'Bauckham WBC', 'Bauckham')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                perStep: {
                    'step-1': {
                        stepId: 'step-1',
                        kind: 'verse',
                        emphasis: { emphasizedTypes: [], deemphasizedTypes: [], citationOverrides: [] },
                        pinnedSources: ['s-1'],
                        suppressedSources: [],
                        note: null,
                    },
                },
            },
            steps: [makeStep('step-1', { markdown: 'En su comentario, Bauckham argumenta que...' })],
        });
        const report = computeCorpusCoverageReport(paper);
        expect(report).toHaveLength(1);
        expect(report[0]?.status).toBe('planned-and-cited');
        expect(report[0]?.plannedStepIds).toEqual(['step-1']);
        expect(report[0]?.citedStepIds).toEqual(['step-1']);
    });

    it('classifies planned-not-cited when LLM skipped a pinned source', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'Schreiner BECNT', 'Schreiner')],
            stepPlan: {
                ...EMPTY_STEP_SOURCE_PLAN,
                perStep: {
                    'step-1': {
                        stepId: 'step-1',
                        kind: 'verse',
                        emphasis: { emphasizedTypes: [], deemphasizedTypes: [], citationOverrides: [] },
                        pinnedSources: ['s-1'],
                        suppressedSources: [],
                        note: null,
                    },
                },
            },
            steps: [makeStep('step-1', { markdown: 'Texto sin mencionar al autor pinneado.' })],
        });
        const report = computeCorpusCoverageReport(paper);
        expect(report[0]?.status).toBe('planned-not-cited');
    });

    it('classifies cited-not-planned when LLM adapted (used a source not in plan)', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'Wallace Grammar', 'Wallace')],
            stepPlan: EMPTY_STEP_SOURCE_PLAN,
            steps: [makeStep('step-1', { markdown: 'Como sostiene Wallace en su gramática...' })],
        });
        const report = computeCorpusCoverageReport(paper);
        expect(report[0]?.status).toBe('cited-not-planned');
    });

    it('classifies never-cited when nothing planned and nothing cited', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'Westerholm', 'Westerholm')],
            steps: [makeStep('step-1', { markdown: 'Texto sobre el pasaje sin referencias bibliográficas.' })],
        });
        expect(computeCorpusCoverageReport(paper)[0]?.status).toBe('never-cited');
    });

    it('citation match is case-insensitive', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'Cranfield ICC', 'CRANFIELD')],
            steps: [makeStep('step-1', { markdown: 'cranfield argumenta que...' })],
        });
        expect(computeCorpusCoverageReport(paper)[0]?.status).toBe('cited-not-planned');
    });

    it('falls back to displayLabel when citationKey is null', () => {
        const paper = makePaper({
            sources: [makeSource('s-1', 'Lampe Roman Christianity', null)],
            steps: [makeStep('step-1', { markdown: 'Lampe Roman Christianity destaca que la comunidad...' })],
        });
        expect(computeCorpusCoverageReport(paper)[0]?.status).toBe('cited-not-planned');
    });
});
