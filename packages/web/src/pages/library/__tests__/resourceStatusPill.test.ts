import { describe, it, expect } from 'vitest';
import {
    resolveResourceStatusPill,
    resolveResourceStatusTooltip,
} from '../resourceStatusPill';

type Recurso = Parameters<typeof resolveResourceStatusTooltip>[0];
const recurso = (parcial: Partial<Recurso>): Recurso => ({
    textExtractionStatus: 'ready',
    ...parcial,
} as Recurso);

describe('resolveResourceStatusPill', () => {
    it('un índice parcial no se ve igual que uno completo', () => {
        const parcial = resolveResourceStatusPill(
            recurso({ indexingWarning: 'El índice llega hasta la página 433 de 711 (61%).' }),
            'indexed',
        )!;
        const completo = resolveResourceStatusPill(recurso({}), 'indexed')!;
        expect(parcial.textKey).toBe('status.readyPartial');
        expect(completo.textKey).toBe('status.ready');
        expect(parcial.tone).not.toBe(completo.tone);
    });

    it('la extracción manda sobre el índice', () => {
        expect(resolveResourceStatusPill(recurso({ textExtractionStatus: 'failed' }), 'indexed')!.textKey)
            .toBe('status.failed');
        expect(resolveResourceStatusPill(recurso({ textExtractionStatus: 'processing' }), 'indexed')!.textKey)
            .toBe('status.processing');
    });

    it('sin estado de índice conocido no inventa píldora', () => {
        expect(resolveResourceStatusPill(recurso({}), 'unknown')).toBeNull();
    });
});

describe('resolveResourceStatusTooltip', () => {
    it('explica el fallo de extracción con el motivo escrito por el servidor', () => {
        expect(resolveResourceStatusTooltip(
            recurso({ textExtractionStatus: 'failed', extractionError: 'Se superó el tiempo máximo.' }),
            'unknown',
        )).toBe('Se superó el tiempo máximo.');
    });

    it('explica la cobertura corta cuando el índice quedó a medias', () => {
        const aviso = 'El índice llega hasta la página 433 de 711 (61%).';
        expect(resolveResourceStatusTooltip(recurso({ indexingWarning: aviso }), 'indexed')).toBe(aviso);
    });

    it('calla cuando no hay nada que explicar', () => {
        expect(resolveResourceStatusTooltip(recurso({}), 'indexed')).toBeUndefined();
    });
});
