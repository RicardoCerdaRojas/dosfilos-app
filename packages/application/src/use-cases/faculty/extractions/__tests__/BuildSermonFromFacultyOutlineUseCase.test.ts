import { describe, it, expect, vi } from 'vitest';
import {
    SermonEntity,
    type IExtractionRepository,
    type ISermonRepository,
} from '@dosfilos/domain';
import { BuildSermonFromFacultyOutlineUseCase } from '../BuildSermonFromFacultyOutlineUseCase';
import { SaveSermonExtractionUseCase } from '../SaveSermonExtractionUseCase';

const SAMPLE_FULL_SERMON = `# Una vocación que perdura
**Pasaje:** 📖 2 Pedro 1:1-11
**Proposición Homilética:** En 2 Pedro 1:1-11, aprenderás que la fe genuina perdura.

---

## Introducción
Apertura del sermón.

## Punto I: Reconoce el llamado
Desarrollo del primer punto.

## Punto II: Ejercita las virtudes
Desarrollo del segundo punto.

## Conclusión
Cierre del sermón.

## Llamado a la Acción
1. Aplica las virtudes esta semana.
`;

function stubExtractContent(markdown: string = SAMPLE_FULL_SERMON) {
    return {
        execute: vi.fn(async () => markdown),
    } as any;
}

function stubSermonRepo() {
    const created: SermonEntity[] = [];
    return {
        create: vi.fn(async (s: SermonEntity) => {
            created.push(s);
            return s;
        }),
        update: vi.fn(),
        delete: vi.fn(),
        findById: vi.fn(),
        findByShareToken: vi.fn(),
        findByUserId: vi.fn(),
        findAll: vi.fn(),
        findByDraftId: vi.fn(),
        findBySourcePaperId: vi.fn(),
        __created: created,
    } as any;
}

function stubExtractionRepo(): IExtractionRepository {
    return {
        create: vi.fn(async (input: any) => ({
            id: 'extraction-1',
            ...input,
            projectIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
            externalRef: input.externalRef ?? null,
        })),
        getById: vi.fn(),
        listBySession: vi.fn(),
        listByProject: vi.fn(),
        listByUser: vi.fn(),
        listByExternalRef: vi.fn(),
        updateMarkdown: vi.fn(),
        rename: vi.fn(),
        addToProject: vi.fn(),
        removeFromProject: vi.fn(),
        delete: vi.fn(),
        orphanBySession: vi.fn(),
        orphanByProject: vi.fn(),
        orphanByExternalRef: vi.fn(),
    } as any;
}

const SAMPLE_OUTLINE = {
    title: 'Una vocación que perdura',
    passage: '2 Pedro 1:1-11',
    proposition: 'En 2 Pedro 1:1-11, aprenderás que la fe genuina perdura.',
    points: [
        { title: 'Reconoce el llamado', verses: 'vv. 1-4' },
        { title: 'Ejercita las virtudes', verses: 'vv. 5-11' },
    ],
};

describe('BuildSermonFromFacultyOutlineUseCase', () => {
    it('persists a sermon with wizardProgress at Step 3 + draft parsed from markdown', async () => {
        const extractContent = stubExtractContent();
        const sermonRepo = stubSermonRepo();
        const extractionRepo = stubExtractionRepo();
        const saveSermon = new SaveSermonExtractionUseCase(extractionRepo);

        const useCase = new BuildSermonFromFacultyOutlineUseCase(
            extractContent,
            sermonRepo,
            saveSermon,
            extractionRepo,
        );

        const result = await useCase.execute({
            ownerId: 'user-1',
            sessionId: 'session-1',
            sessionTitle: 'Estudio 2 Pedro',
            approvedOutline: SAMPLE_OUTLINE,
            derivedFromMessageIds: ['msg-1', 'msg-2'],
        });

        const created = sermonRepo.__created[0] as SermonEntity;
        expect(result.sermonId).toBe(created.id);
        expect(created.status).toBe('draft');
        expect(created.sourceFacultySessionId).toBe('session-1');
        const progress = created.wizardProgress!;
        expect(progress.currentStep).toBe(3);
        expect(progress.passage).toBe('2 Pedro 1:1-11');
        expect(progress.draft?.title).toBe('Una vocación que perdura');
        expect(progress.draft?.introduction).toContain('Apertura');
        expect(progress.draft?.body.length).toBe(2); // Two `## Punto` sections
        expect(progress.draft?.conclusion).toContain('Cierre');
        expect(progress.draft?.callToAction).toContain('Aplica');
    });

    it('stamps derivedContext.kind === faculty with session metadata', async () => {
        const extractContent = stubExtractContent();
        const sermonRepo = stubSermonRepo();
        const extractionRepo = stubExtractionRepo();
        const saveSermon = new SaveSermonExtractionUseCase(extractionRepo);

        const useCase = new BuildSermonFromFacultyOutlineUseCase(
            extractContent,
            sermonRepo,
            saveSermon,
            extractionRepo,
        );

        await useCase.execute({
            ownerId: 'user-1',
            sessionId: 'session-1',
            sessionTitle: 'Estudio 2 Pedro',
            approvedOutline: SAMPLE_OUTLINE,
            personalization: { tone: 'pastoral', preacherNotes: 'Notes' },
            derivedFromMessageIds: [],
        });

        const created = sermonRepo.__created[0] as SermonEntity;
        const dc = created.wizardProgress?.derivedContext;
        expect(dc?.kind).toBe('faculty');
        if (dc?.kind === 'faculty') {
            expect(dc.sessionId).toBe('session-1');
            expect(dc.sessionTitle).toBe('Estudio 2 Pedro');
            expect(dc.outline.title).toBe('Una vocación que perdura');
            expect(dc.outline.points).toHaveLength(2);
            expect(dc.personalization).toEqual({ tone: 'pastoral', preacherNotes: 'Notes' });
        }
    });

    it('persists an extraction mirror with externalRef back to the sermon', async () => {
        const extractContent = stubExtractContent();
        const sermonRepo = stubSermonRepo();
        const extractionRepo = stubExtractionRepo();
        const saveSermon = new SaveSermonExtractionUseCase(extractionRepo);

        const useCase = new BuildSermonFromFacultyOutlineUseCase(
            extractContent,
            sermonRepo,
            saveSermon,
            extractionRepo,
        );

        await useCase.execute({
            ownerId: 'user-1',
            sessionId: 'session-1',
            sessionTitle: 'Estudio 2 Pedro',
            approvedOutline: SAMPLE_OUTLINE,
            derivedFromMessageIds: ['msg-1'],
        });

        expect(extractionRepo.create).toHaveBeenCalledTimes(1);
        const createCall = (extractionRepo.create as any).mock.calls[0][0];
        expect(createCall.type).toBe('SERMON');
        expect(createCall.externalRef).toEqual({
            collection: 'sermons',
            id: sermonRepo.__created[0]?.id,
        });
        expect(createCall.derivedFromMessageIds).toEqual(['msg-1']);
    });

    it('keeps sermon.content populated for back-compat with legacy sermon-detail surface', async () => {
        const useCase = new BuildSermonFromFacultyOutlineUseCase(
            stubExtractContent(),
            stubSermonRepo(),
            new SaveSermonExtractionUseCase(stubExtractionRepo()),
            stubExtractionRepo(),
        );

        const result = await useCase.execute({
            ownerId: 'user-1',
            sessionId: 'session-1',
            sessionTitle: 'Estudio',
            approvedOutline: SAMPLE_OUTLINE,
            derivedFromMessageIds: [],
        });

        expect(result.content).toContain('Apertura del sermón');
        expect(result.content).toContain('Punto I');
    });

    it('strips the AI header block before persisting content (no leading # title)', async () => {
        const sermonRepo = stubSermonRepo();
        const useCase = new BuildSermonFromFacultyOutlineUseCase(
            stubExtractContent(),
            sermonRepo,
            new SaveSermonExtractionUseCase(stubExtractionRepo()),
            stubExtractionRepo(),
        );

        await useCase.execute({
            ownerId: 'user-1',
            sessionId: 'session-1',
            sessionTitle: 'Estudio',
            approvedOutline: SAMPLE_OUTLINE,
            derivedFromMessageIds: [],
        });

        const created = sermonRepo.__created[0] as SermonEntity;
        // Header block (# title, **Pasaje:**, **Proposición:**, ---)
        // must be stripped; first surviving line is the introducción
        // section.
        expect(created.content.startsWith('## Introducción')).toBe(true);
    });

    it('does not fail sermon creation when the extraction mirror write throws', async () => {
        const sermonRepo = stubSermonRepo();
        const failingExtractionRepo = stubExtractionRepo();
        failingExtractionRepo.create = vi.fn(async () => {
            throw new Error('firestore down');
        });
        const saveSermon = new SaveSermonExtractionUseCase(failingExtractionRepo);

        const useCase = new BuildSermonFromFacultyOutlineUseCase(
            stubExtractContent(),
            sermonRepo,
            saveSermon,
            failingExtractionRepo,
        );

        const result = await useCase.execute({
            ownerId: 'user-1',
            sessionId: 'session-1',
            sessionTitle: 'Estudio',
            approvedOutline: SAMPLE_OUTLINE,
            derivedFromMessageIds: [],
        });

        expect(result.sermonId).toBeTruthy();
        expect(sermonRepo.__created).toHaveLength(1);
    });
});
