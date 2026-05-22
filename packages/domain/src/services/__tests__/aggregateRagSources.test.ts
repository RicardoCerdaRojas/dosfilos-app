import { describe, it, expect, vi } from 'vitest';
import { aggregateRagSources, aggregateRagSourcesFlat } from '../aggregateRagSources';

describe('aggregateRagSources', () => {
    it('returns empty when no sources provided', () => {
        expect(aggregateRagSources({})).toEqual([]);
    });

    it('skips entries with empty titles', () => {
        const result = aggregateRagSources({
            exegesisSources: [
                { title: '', author: 'Anon', usedFor: 'noop' },
                { title: '   ', author: 'Anon', usedFor: 'noop' },
            ],
        });
        expect(result).toEqual([]);
    });

    it('drops "Usuario proporcionado en el prompt" junk pattern', () => {
        const onReject = vi.fn();
        const result = aggregateRagSources({
            draftSources: [
                {
                    title: 'Contexto Exegético y Datos del Análisis Homilético para Juan 1:1',
                    author: 'Usuario (proporcionado en el prompt)',
                    usedFor: 'Meta-reference',
                },
            ],
        }, { onReject });
        expect(result).toEqual([]);
        expect(onReject).toHaveBeenCalledTimes(1);
    });

    it('drops "datos del análisis" junk pattern even with different casing', () => {
        const result = aggregateRagSources({
            draftSources: [
                { title: 'DATOS DEL ANÁLISIS HOMILÉTICO', author: '', usedFor: 'meta' },
            ],
        });
        expect(result).toEqual([]);
    });

    it('keeps legitimate sources untouched', () => {
        const result = aggregateRagSources({
            exegesisSources: [
                { title: 'Teología Básica', author: 'Charles C. Ryrie', page: '104', usedFor: 'Cristología' },
            ],
        });
        expect(result).toHaveLength(1);
        expect(result[0].source.title).toBe('Teología Básica');
        expect(result[0].steps).toEqual(['exegesis']);
    });

    it('dedupes case-insensitive across steps and merges step tags', () => {
        const result = aggregateRagSources({
            exegesisSources: [
                { title: 'Teología Básica', author: 'Charles C. Ryrie', page: '104', usedFor: 'a' },
            ],
            draftSources: [
                { title: 'TEOLOGÍA BÁSICA', author: 'Charles C. Ryrie', page: '200', usedFor: 'b' },
            ],
        });
        expect(result).toHaveLength(1);
        expect(result[0].steps).toEqual(['exegesis', 'draft']);
        expect(result[0].source.page).toBe('104');
        expect(result[0].source.usedFor).toBe('a');
    });

    it('preserves order: exegesis → homiletics → draft', () => {
        const result = aggregateRagSources({
            draftSources: [{ title: 'Draft Book', author: 'D', usedFor: 'd' }],
            exegesisSources: [{ title: 'Exeg Book', author: 'E', usedFor: 'e' }],
            homileticsSources: [{ title: 'Hom Book', author: 'H', usedFor: 'h' }],
        });
        expect(result.map((r) => r.source.title)).toEqual(['Exeg Book', 'Hom Book', 'Draft Book']);
    });

    it('flat helper returns RAGSource[] without step tags', () => {
        const result = aggregateRagSourcesFlat({
            exegesisSources: [{ title: 'A', author: 'X', usedFor: 'a' }],
            draftSources: [{ title: 'B', author: 'Y', usedFor: 'b' }],
        });
        expect(result).toEqual([
            { title: 'A', author: 'X', usedFor: 'a' },
            { title: 'B', author: 'Y', usedFor: 'b' },
        ]);
    });

    it('handles all three steps with overlapping + unique entries', () => {
        const result = aggregateRagSources({
            exegesisSources: [
                { title: 'Ryrie', author: 'C. Ryrie', usedFor: 'exeg' },
                { title: 'Chapell', author: 'B. Chapell', usedFor: 'exeg' },
            ],
            homileticsSources: [
                { title: 'Chapell', author: 'B. Chapell', usedFor: 'hom' },
                { title: 'MacArthur', author: 'J. MacArthur', usedFor: 'hom' },
            ],
            draftSources: [
                { title: 'Ryrie', author: 'C. Ryrie', usedFor: 'draft' },
            ],
        });
        expect(result.map((r) => `${r.source.title}:${r.steps.join(',')}`)).toEqual([
            'Ryrie:exegesis,draft',
            'Chapell:exegesis,homiletics',
            'MacArthur:homiletics',
        ]);
    });
});
