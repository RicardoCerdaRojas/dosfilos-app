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
});
