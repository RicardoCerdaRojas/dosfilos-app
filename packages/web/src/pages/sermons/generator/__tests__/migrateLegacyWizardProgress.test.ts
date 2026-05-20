import { describe, it, expect } from 'vitest';
import type { Sermon } from '@dosfilos/domain';
import { migrateLegacyWizardProgress } from '../migrateLegacyWizardProgress';

const baseSermon = (overrides: Partial<Sermon> = {}): Sermon => ({
    id: 'sermon-1',
    userId: 'user-1',
    title: 'Ovejas entre lobos',
    content: '',
    bibleReferences: ['Mateo 10:16-23'],
    tags: ['shalom', 'discipulado'],
    status: 'draft',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    isShared: false,
    authorName: 'Pastor',
    preachingHistory: [],
    ...overrides,
} as Sermon);

const SAMPLE_PAPER_CONTENT = `Apertura del sermón pre-loaded desde paper.

## Reconoce el llamado

Desarrollo del primer punto.

## Ejercita el valor

Desarrollo del segundo punto.

## Conclusión

Cierre que recapitula.
`;

const SAMPLE_FACULTY_CONTENT = `## Introducción
### Contexto Histórico
Bla.

## Punto I: Reconoce
Cuerpo del punto.

## Punto II: Ejercita
Más cuerpo.

## Conclusión
Cierre.

## Llamado a la Acción
1. Actúa.
`;

describe('migrateLegacyWizardProgress', () => {
    it('returns null for sermons with empty content (nothing to migrate)', () => {
        const sermon = baseSermon({ content: '' });
        expect(migrateLegacyWizardProgress(sermon)).toBeNull();
    });

    it('returns null for sermons with whitespace-only content', () => {
        const sermon = baseSermon({ content: '   \n   ' });
        expect(migrateLegacyWizardProgress(sermon)).toBeNull();
    });

    it('passes through (migrated:false) when sermon already has wizardProgress.draft', () => {
        const sermon = baseSermon({
            content: SAMPLE_PAPER_CONTENT,
            wizardProgress: {
                currentStep: 3,
                passage: 'Mateo 10:16-23',
                draft: {
                    title: 'Existing',
                    introduction: 'existing',
                    body: [],
                    conclusion: 'existing',
                },
                lastSaved: new Date(),
            } as Sermon['wizardProgress'],
        });
        const result = migrateLegacyWizardProgress(sermon);
        expect(result?.migrated).toBe(false);
        expect(result?.wizardProgress.draft?.title).toBe('Existing');
    });

    it('passes through (migrated:false) when sermon already has derivedContext (post-#214)', () => {
        const sermon = baseSermon({
            content: SAMPLE_PAPER_CONTENT,
            wizardProgress: {
                currentStep: 3,
                passage: 'Mateo 10:16-23',
                lastSaved: new Date(),
                derivedContext: {
                    kind: 'paper',
                    paperId: 'paper-1',
                    paperTitle: 'Title',
                    tone: 'pastoral',
                    generatedAt: new Date(),
                    transformerModelId: 'gemini-2.5-pro',
                },
            } as Sermon['wizardProgress'],
        });
        const result = migrateLegacyWizardProgress(sermon);
        expect(result?.migrated).toBe(false);
    });

    it('migrates paper-derived legacy sermon (sourcePaperId + content)', () => {
        const sermon = baseSermon({
            content: SAMPLE_PAPER_CONTENT,
            sourcePaperId: 'paper-42',
        });
        const result = migrateLegacyWizardProgress(sermon);
        expect(result?.migrated).toBe(true);
        const progress = result!.wizardProgress;
        expect(progress.currentStep).toBe(3);
        expect(progress.passage).toBe('Mateo 10:16-23');
        expect(progress.draft?.title).toBe('Ovejas entre lobos');
        expect(progress.draft?.body.length).toBe(2);
        expect(progress.draft?.conclusion).toContain('Cierre');
        expect(progress.derivedContext?.kind).toBe('paper');
        if (progress.derivedContext?.kind === 'paper') {
            expect(progress.derivedContext.paperId).toBe('paper-42');
            expect(progress.derivedContext.transformerModelId).toBe('legacy-migration');
        }
    });

    it('migrates Faculty-derived legacy sermon (sourceFacultySessionId + content)', () => {
        const sermon = baseSermon({
            content: SAMPLE_FACULTY_CONTENT,
            sourceFacultySessionId: 'session-9',
        });
        const result = migrateLegacyWizardProgress(sermon);
        expect(result?.migrated).toBe(true);
        const progress = result!.wizardProgress;
        expect(progress.currentStep).toBe(3);
        expect(progress.draft?.introduction).toContain('Bla');
        expect(progress.draft?.body.length).toBe(2);
        expect(progress.draft?.callToAction).toContain('Actúa');
        expect(progress.derivedContext?.kind).toBe('faculty');
        if (progress.derivedContext?.kind === 'faculty') {
            expect(progress.derivedContext.sessionId).toBe('session-9');
            expect(progress.derivedContext.outline.points.length).toBe(2);
        }
    });

    it('migrates standalone legacy sermon without setting derivedContext', () => {
        const sermon = baseSermon({
            content: SAMPLE_PAPER_CONTENT,
        });
        const result = migrateLegacyWizardProgress(sermon);
        expect(result?.migrated).toBe(true);
        expect(result?.wizardProgress.draft).toBeTruthy();
        expect(result?.wizardProgress.derivedContext).toBeUndefined();
    });

    it('preserves planId + other existing wizardProgress metadata during migration', () => {
        const sermon = baseSermon({
            content: SAMPLE_PAPER_CONTENT,
            sourcePaperId: 'paper-1',
            wizardProgress: {
                currentStep: 1,
                passage: '',
                lastSaved: new Date('2026-01-01'),
                planId: 'plan-x',
            } as Sermon['wizardProgress'],
        });
        const result = migrateLegacyWizardProgress(sermon);
        expect(result?.migrated).toBe(true);
        expect(result?.wizardProgress.planId).toBe('plan-x');
        expect(result?.wizardProgress.currentStep).toBe(3); // overrides legacy currentStep
    });
});
