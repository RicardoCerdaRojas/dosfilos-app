import { describe, it, expect } from 'vitest';
import { SermonEntity } from '@dosfilos/domain';
import { buildSermonTutorContext } from '../buildSermonTutorContext';

const make = (content: string, refs: string[] = ['2 Pedro 1:12-15']) =>
    SermonEntity.create({
        userId: 'u',
        title: 'La Roca Inquebrantable',
        content,
        bibleReferences: refs,
        status: 'draft',
    });

describe('buildSermonTutorContext', () => {
    it('includes title, passage and body', () => {
        const ctx = buildSermonTutorContext(make('Cuerpo del sermón'));
        expect(ctx).toContain('Título: La Roca Inquebrantable');
        expect(ctx).toContain('Pasaje: 2 Pedro 1:12-15');
        expect(ctx).toContain('Cuerpo del sermón');
    });

    it('omits the passage line when there are no references', () => {
        const ctx = buildSermonTutorContext(make('Cuerpo', []));
        expect(ctx).not.toContain('Pasaje:');
    });

    it('truncates very long bodies with an ellipsis marker', () => {
        const ctx = buildSermonTutorContext(make('x'.repeat(7000)));
        expect(ctx).toContain('[…]');
        expect(ctx.length).toBeLessThan(6200);
    });

    it('falls back to a placeholder when the sermon has no content', () => {
        const ctx = buildSermonTutorContext(make(''));
        expect(ctx).toContain('aún no tiene contenido');
    });
});
