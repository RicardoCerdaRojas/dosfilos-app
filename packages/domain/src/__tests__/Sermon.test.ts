import { describe, it, expect } from 'vitest';
import { SermonEntity } from '../entities/Sermon';

describe('SermonEntity', () => {
    it('should create a sermon entity', () => {
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'This is a test sermon content',
            bibleReferences: ['John 3:16'],
            tags: ['faith', 'love'],
            category: 'evangelismo',
            status: 'draft',
        });

        expect(sermon.userId).toBe('user123');
        expect(sermon.title).toBe('Test Sermon');
        expect(sermon.content).toBe('This is a test sermon content');
        expect(sermon.bibleReferences).toEqual(['John 3:16']);
        expect(sermon.tags).toEqual(['faith', 'love']);
        expect(sermon.category).toBe('evangelismo');
        expect(sermon.status).toBe('draft');
    });

    it('should have default status as working', () => {
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'Content',
        });

        expect(sermon.status).toBe('working');
    });

    it('should have createdAt and updatedAt dates', () => {
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'Content',
        });

        expect(sermon.createdAt).toBeInstanceOf(Date);
        expect(sermon.updatedAt).toBeInstanceOf(Date);
    });

    it('preserves sourcePaperId across create / update / publishAsCopy', () => {
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'Content',
            sourcePaperId: 'paper-abc',
        });
        expect(sermon.sourcePaperId).toBe('paper-abc');

        const updated = sermon.update({ title: 'Renamed Sermon' });
        expect(updated.sourcePaperId).toBe('paper-abc');

        const copy = sermon.publishAsCopy();
        expect(copy.sourcePaperId).toBe('paper-abc');
        // The copy is a fresh sermon (new id), not a mutation.
        expect(copy.id).not.toBe(sermon.id);
    });

    it('preserves citationManifest across create / update / archive', () => {
        const manifest = {
            version: '1' as const,
            entries: [
                { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Wallace', author: 'D.B.', page: '432', excerpt: 'aoristo…' },
            ],
        };
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'Cite [1] here.',
            citationManifest: manifest,
        });
        expect(sermon.citationManifest).toEqual(manifest);

        const updated = sermon.update({ title: 'Renamed Sermon' });
        expect(updated.citationManifest).toEqual(manifest);

        const archived = sermon.archive();
        expect(archived.citationManifest).toEqual(manifest);
    });

    it('publish() pulls citationManifest from wizardProgress.draft when absent on the entity', () => {
        const manifest = {
            version: '1' as const,
            entries: [
                { sourceId: 'S1', resourceId: 'r1', chunkId: 'c1', title: 'Carson', excerpt: 'logos…' },
            ],
        };
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'Cite [1] here.',
            status: 'draft',
            wizardProgress: {
                currentStep: 3,
                passage: 'Juan 1:1',
                lastSaved: new Date(),
                draft: {
                    title: 'Test Sermon',
                    introduction: 'Intro [1].',
                    body: [],
                    conclusion: 'End.',
                    citationManifest: manifest,
                },
            },
        });
        expect(sermon.citationManifest).toBeUndefined();

        const published = sermon.publish();
        expect(published.citationManifest).toEqual(manifest);
        expect(published.status).toBe('published');

        const copy = sermon.publishAsCopy();
        expect(copy.citationManifest).toEqual(manifest);
    });

    describe('createSummary (trimmed list projection)', () => {
        it('reconstructs a published sermon with empty content without throwing', () => {
            // Regression: the list summary callable returns no `content`; a
            // published/working/archived sermon would trip the
            // "content required" validation and blank the whole list.
            const summary = SermonEntity.createSummary({
                id: 'sermon-1',
                userId: 'user123',
                title: 'El amor de Dios',
                status: 'published',
            });
            expect(summary.id).toBe('sermon-1');
            expect(summary.status).toBe('published');
            expect(summary.content).toBe('');
        });

        it('still preserves id, status and dates passed in', () => {
            const created = new Date('2026-01-01T00:00:00Z');
            const summary = SermonEntity.createSummary({
                id: 's2',
                userId: 'u',
                title: 'Título válido',
                status: 'archived',
                createdAt: created,
            });
            expect(summary.status).toBe('archived');
            expect(summary.createdAt).toEqual(created);
        });

        it('create() (non-summary) STILL rejects empty content for a published sermon', () => {
            expect(() =>
                SermonEntity.create({
                    userId: 'u',
                    title: 'Título válido',
                    content: '',
                    status: 'published',
                }),
            ).toThrow('El contenido no puede estar vacío');
        });
    });

    describe('createVersion', () => {
        const makeRoot = () =>
            SermonEntity.create({
                id: 'root-1',
                userId: 'user123',
                title: 'Sermón sobre la gracia',
                content: 'Cuerpo del sermón',
                bibleReferences: ['Efesios 2:8'],
                tags: ['gracia'],
                category: 'doctrina',
                status: 'published',
                projectId: 'proj-1',
                isShared: true,
                shareToken: 'tok',
            });

        it('copies the finished sermon into a fresh editable draft linked to the root', () => {
            const root = makeRoot();
            const version = root.createVersion('Retiro jóvenes 2026');

            expect(version.id).not.toBe(root.id);
            expect(version.versionOf).toBe('root-1');
            expect(version.versionLabel).toBe('Retiro jóvenes 2026');
            expect(version.status).toBe('draft');
            expect(version.title).toBe(root.title);
            expect(version.content).toBe(root.content);
            expect(version.bibleReferences).toEqual(['Efesios 2:8']);
            expect(version.tags).toEqual(['gracia']);
            expect(version.category).toBe('doctrina');
            expect(version.projectId).toBe('proj-1');
        });

        it('resets sharing, schedule, series and preaching history on the version', () => {
            const root = makeRoot();
            const version = root.createVersion();

            expect(version.isShared).toBe(false);
            expect(version.shareToken).toBeUndefined();
            expect(version.seriesId).toBeUndefined();
            expect(version.scheduledDate).toBeUndefined();
            expect(version.preachingHistory).toEqual([]);
            expect(version.versionLabel).toBeUndefined();
        });

        it('flattens versions of versions onto the original root', () => {
            const root = makeRoot();
            const v2 = root.createVersion('Contexto A');
            const v3 = v2.createVersion('Contexto B');

            // v3 points at the ROOT, not at v2 — the group stays flat.
            expect(v3.versionOf).toBe('root-1');
        });

        it('carries versionOf/versionLabel across update without altering them', () => {
            const version = makeRoot().createVersion('Contexto A');
            const edited = version.update({ content: 'Cuerpo retocado' });

            expect(edited.versionOf).toBe('root-1');
            expect(edited.versionLabel).toBe('Contexto A');
            expect(edited.content).toBe('Cuerpo retocado');
        });
    });
});
