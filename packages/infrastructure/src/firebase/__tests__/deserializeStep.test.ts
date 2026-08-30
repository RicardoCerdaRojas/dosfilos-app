import { describe, it, expect } from 'vitest';
import { deserializeStep } from '../FirestoreExegeticalPaperRepository';
import { isAbandonedGeneration } from '@dosfilos/domain';

/**
 * Regresión del bug del tipo que MENTÍA.
 *
 * Los pasos se leían crudos (`steps: data.steps`), así que `ExegeticalStep`
 * declaraba `createdAt: Date` mientras en ejecución llegaba un `Timestamp` de
 * Firestore. Nadie lo notó porque nadie tocaba esas fechas — hasta que
 * `isAbandonedGeneration` llamó `getTime()`, que `Timestamp` no tiene, y quedó
 * inerte SIN fallar: la tarjeta seguía girando y los tests de dominio seguían
 * verdes, porque le pasaban `Date` de verdad.
 *
 * Por eso el último test cruza las dos capas: es el único que reproduce el
 * fallo real.
 */

/** Lo que el SDK de Firestore devuelve donde el tipo promete un `Date`. */
function timestamp(date: Date) {
    return {
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
        toDate: () => date,
    };
}

const HACE_TRES_HORAS = new Date(Date.now() - 3 * 3_600_000);

function rawStep(extra: Record<string, unknown> = {}) {
    return {
        id: 'step-1',
        paperId: 'paper-1',
        kind: 'verse',
        order: 1,
        state: 'generating',
        createdAt: timestamp(HACE_TRES_HORAS),
        updatedAt: timestamp(HACE_TRES_HORAS),
        current: null,
        accepted: null,
        versions: [],
        ...extra,
    };
}

describe('deserializeStep', () => {
    it('convierte los Timestamp del paso en Date de verdad', () => {
        const step = deserializeStep(rawStep());
        expect(step.createdAt).toBeInstanceOf(Date);
        expect(step.updatedAt).toBeInstanceOf(Date);
        expect(step.updatedAt.getTime()).toBe(HACE_TRES_HORAS.getTime());
    });

    it('convierte también las fechas anidadas de las versiones', () => {
        const step = deserializeStep(rawStep({
            current: { id: 'v1', markdown: '...', createdAt: timestamp(HACE_TRES_HORAS) },
            versions: [{ id: 'v1', markdown: '...', createdAt: timestamp(HACE_TRES_HORAS) }],
        }));
        expect(step.current?.createdAt).toBeInstanceOf(Date);
        expect(step.versions[0].createdAt).toBeInstanceOf(Date);
    });

    it('acepta un Date ya normalizado sin romperlo', () => {
        const step = deserializeStep(rawStep({ updatedAt: HACE_TRES_HORAS }));
        expect(step.updatedAt).toBeInstanceOf(Date);
        expect(step.updatedAt.getTime()).toBe(HACE_TRES_HORAS.getTime());
    });

    it('preserva los campos que no toca — un whitelist los borraría en silencio', () => {
        const step = deserializeStep(rawStep({ campoNuevo: 'no se pierde' })) as unknown as Record<string, unknown>;
        expect(step.campoNuevo).toBe('no se pierde');
        expect(step.kind).toBe('verse');
        expect(step.order).toBe(1);
    });

    it('un paso sin fechas no explota', () => {
        const step = deserializeStep({ id: 'x', state: 'pending' });
        expect(step.updatedAt).toBeInstanceOf(Date);
        expect(step.versions).toEqual([]);
    });

    // ── El cruce de capas: el test que faltaba ───────────────────────────
    it('un paso leído de Firestore se detecta como abandonado', () => {
        const step = deserializeStep(rawStep());
        expect(isAbandonedGeneration(step)).toBe(true);
    });

    it('SIN normalizar, el mismo paso NO se detecta — el fallo original', () => {
        const crudo = rawStep() as unknown as Parameters<typeof isAbandonedGeneration>[0];
        expect(isAbandonedGeneration(crudo)).toBe(false);
    });
});
