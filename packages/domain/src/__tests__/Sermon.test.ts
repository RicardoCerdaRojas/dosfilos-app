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

    it('should have default status as draft', () => {
        const sermon = SermonEntity.create({
            userId: 'user123',
            title: 'Test Sermon',
            content: 'Content',
        });

        expect(sermon.status).toBe('draft');
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
});
