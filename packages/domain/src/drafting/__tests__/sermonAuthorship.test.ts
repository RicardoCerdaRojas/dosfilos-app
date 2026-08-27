import { describe, it, expect } from 'vitest';
import {
    buildSermonAuthorshipSnapshot,
    describeSermonAuthorship,
} from '../sermonAuthorship';
import type { SermonElement } from '../SermonElement';

const idea = (provenance: SermonElement['provenance'], text = 'idea'): SermonElement => ({
    id: `${provenance}-${text}`,
    kind: 'elemento',
    text,
    provenance,
});

const directiva = (text = 'Fecha del libro'): SermonElement => ({
    id: `dir-${text}`,
    kind: 'directiva',
    text,
    provenance: 'pastor',
});

describe('describeSermonAuthorship — la ausencia de dato no es evidencia de cero', () => {
    it('un sermón anterior al taller queda SIN MEDIR, no en el estado más bajo', () => {
        // La trampa que este módulo existe para evitar: decirle a un pastor con
        // noventa sermones propios que ninguna idea es suya.
        expect(describeSermonAuthorship(undefined)).toBe('sin-medir');
    });

    it('un mapa vacío también es sin medir, no una medición de cero', () => {
        expect(describeSermonAuthorship({})).toBe('sin-medir');
        expect(describeSermonAuthorship({ introduction: [] })).toBe('sin-medir');
    });

    it('sin-medir es DISTINTO de seleccionada', () => {
        // Si estos dos colapsaran, el sermón legacy heredaría la peor lectura.
        expect(describeSermonAuthorship(undefined)).not.toBe(
            describeSermonAuthorship({ s: [idea('elegido')] }),
        );
    });
});

describe('describeSermonAuthorship — las cuatro formas medidas', () => {
    it('todo elegido → seleccionada', () => {
        expect(describeSermonAuthorship({ a: [idea('elegido', 'x'), idea('elegido', 'y')] })).toBe('seleccionada');
    });

    it('todo propio o reescrito → propia', () => {
        expect(describeSermonAuthorship({ a: [idea('pastor', 'x'), idea('editado', 'y')] })).toBe('propia');
    });

    it('una mezcla → mixta', () => {
        expect(describeSermonAuthorship({ a: [idea('pastor', 'x'), idea('elegido', 'y')] })).toBe('mixta');
    });

    it('descartar todo deja el sermón vacío, no seleccionado', () => {
        // Descartar es trabajo, pero no deja ideas en el sermón: describirlo
        // como "seleccionada" diría que se quedó con ideas ajenas.
        expect(describeSermonAuthorship({ a: [idea('descartado', 'x')] })).toBe('vacia');
    });

    it('las directivas no cuentan como ideas', () => {
        // Llenar la sección de temas no debe subir la autoría: una directiva es
        // una decisión de cobertura, no una idea originada.
        expect(describeSermonAuthorship({ a: [directiva(), idea('elegido')] })).toBe('seleccionada');
    });

    it('suma las secciones del sermón entero', () => {
        expect(
            describeSermonAuthorship({
                introduction: [idea('pastor', 'x')],
                'point.1.exposition': [idea('elegido', 'y')],
            }),
        ).toBe('mixta');
    });
});

describe('buildSermonAuthorshipSnapshot', () => {
    it('NO graba una medición para un sermón sin decisiones', () => {
        // Grabar ceros convertiría "no se midió" en "se midió y dio cero".
        expect(buildSermonAuthorshipSnapshot(undefined)).toBeUndefined();
        expect(buildSermonAuthorshipSnapshot({})).toBeUndefined();
    });

    it('guarda los conteos crudos, no sólo la etiqueta', () => {
        // Los conteos son lo que permitirá leer la TRAYECTORIA entre sermones,
        // que es la única lectura que significa algo.
        const snap = buildSermonAuthorshipSnapshot(
            {
                introduction: [idea('pastor', 'a'), idea('elegido', 'b')],
                'point.1.exposition': [idea('editado', 'c'), idea('descartado', 'd')],
                'point.2.exposition': [],
            },
            new Date('2026-08-26T12:00:00.000Z'),
        );

        expect(snap).toEqual({
            capturedAt: new Date('2026-08-26T12:00:00.000Z'),
            shape: 'mixta',
            pastor: 1,
            elegido: 1,
            editado: 1,
            inSermon: 3,
            sectionsDecided: 2,
        });
    });

    it('una sección donde todo se descartó no cuenta como decidida', () => {
        const snap = buildSermonAuthorshipSnapshot({
            a: [idea('pastor', 'a')],
            b: [idea('descartado', 'b')],
        });
        expect(snap?.sectionsDecided).toBe(1);
    });
});
