import { describe, expect, it } from 'vitest';
import {
    outlineStructureQuality,
    parseHeadingReference,
    referencesOverlap,
    resolveOutlineReferences,
    selectChunksForPassage,
    type DocumentOutlineEntry,
} from '../documentOutline';
import { parsePassageReference } from '../../../bible/canon/passage-reference';

function ref(input: string) {
    const parsed = parsePassageReference(input);
    if (!parsed.ok) throw new Error(`fixture inválida: ${input}`);
    return parsed.ref;
}

function entry(
    chunkIndex: number,
    section: string | null,
    sectionPath: string[] = [],
    page = 1,
): DocumentOutlineEntry {
    return { chunkIndex, page, section, sectionPath };
}

describe('parseHeadingReference', () => {
    it('lee un encabezado con libro y referencia', () => {
        // Forma real medida en "The Minor Prophets" (metadata.section).
        expect(parseHeadingReference('Micah 4:8', null)).toEqual(ref('Micah 4:8'));
    });

    it('lee un encabezado desnudo prestándole el libro del contexto', () => {
        expect(parseHeadingReference('1:1-3', 'JON')).toEqual(ref('Jonah 1:1-3'));
    });

    it('rechaza el encabezado desnudo cuando no hay libro en contexto', () => {
        expect(parseHeadingReference('1:1-3', null)).toBeNull();
    });

    it('rechaza una línea de cuerpo promovida a encabezado por el extractor', () => {
        // Caso real de un PDF escaneado.
        expect(
            parseHeadingReference('6 [7]. TVJTJ (will be): Waw-relative introduces a', 'MIC'),
        ).toBeNull();
    });

    it('rechaza texto que menciona una referencia sin ser un encabezado de sección', () => {
        expect(parseHeadingReference('ver 1:1-3', 'JON')).toBeNull();
    });
});

describe('resolveOutlineReferences', () => {
    it('hereda la referencia del encabezado hacia el cuerpo que le sigue', () => {
        const resolved = resolveOutlineReferences([
            entry(0, 'Jonah 1:1-3', ['Jonah', 'Jonah 1:1-3']),
            entry(1, null, ['Jonah', 'Jonah 1:1-3']),
            entry(2, null, ['Jonah', 'Jonah 1:1-3']),
        ]);

        expect(resolved.map(e => e.resolution)).toEqual(['heading', 'inherited', 'inherited']);
        expect(resolved[2]!.reference).toEqual(ref('Jonah 1:1-3'));
    });

    it('corta la herencia al cambiar de libro', () => {
        const resolved = resolveOutlineReferences([
            entry(0, 'Jonah 1:1-3', ['Jonah', 'Jonah 1:1-3']),
            entry(1, null, ['Jonah', 'Jonah 1:1-3']),
            entry(2, null, ['Micah']),
        ]);

        expect(resolved[2]!.reference).toBeNull();
        expect(resolved[2]!.resolution).toBe('none');
    });

    it('toma el libro del nivel más profundo de la miga de pan', () => {
        // Miga real de "The Minor Prophets": el volumen entero arriba, el
        // libro concreto abajo.
        const resolved = resolveOutlineReferences([
            entry(0, '1:1-3', ['The Minor Prophets', 'A Commentary on Obadiah, Jonah,', 'Jonah']),
        ]);

        expect(resolved[0]!.reference).toEqual(ref('Jonah 1:1-3'));
    });

    it('no adivina el libro cuando la miga nombra varios', () => {
        const resolved = resolveOutlineReferences([
            entry(0, '1:1-3', ['A Commentary on Obadiah, Jonah, Micah']),
        ]);

        expect(resolved[0]!.reference).toBeNull();
    });

    it('deja sin referencia un documento extraído sin encabezados', () => {
        // Caso real: "Obadiah, Jonah and Micah" indexa con section null en
        // todos sus chunks.
        const resolved = resolveOutlineReferences([
            entry(0, null, []),
            entry(1, null, []),
        ]);

        expect(resolved.every(e => e.reference === null)).toBe(true);
    });

    it('ordena por chunkIndex antes de heredar', () => {
        const resolved = resolveOutlineReferences([
            entry(2, null, ['Jonah']),
            entry(0, 'Jonah 1:1-3', ['Jonah']),
            entry(1, null, ['Jonah']),
        ]);

        expect(resolved.map(e => e.chunkIndex)).toEqual([0, 1, 2]);
        expect(resolved[2]!.reference).toEqual(ref('Jonah 1:1-3'));
    });
});

describe('referencesOverlap', () => {
    it('un versículo suelto solapa el rango que lo contiene', () => {
        expect(referencesOverlap(ref('Jonah 1:2'), ref('Jonah 1:1-3'))).toBe(true);
    });

    it('un capítulo entero solapa cualquier versículo suyo', () => {
        expect(referencesOverlap(ref('Jonah 1'), ref('Jonah 1:2'))).toBe(true);
    });

    it('no solapa entre libros distintos', () => {
        expect(referencesOverlap(ref('Micah 1:1'), ref('Jonah 1:1'))).toBe(false);
    });

    it('no solapa rangos disjuntos del mismo libro', () => {
        expect(referencesOverlap(ref('Jonah 3:1-5'), ref('Jonah 1:1-3'))).toBe(false);
    });

    it('solapa a través de capítulos', () => {
        expect(referencesOverlap(ref('Jonah 1:15-2:2'), ref('Jonah 2:1'))).toBe(true);
    });
});

describe('selectChunksForPassage', () => {
    const outline = resolveOutlineReferences([
        entry(0, 'Introduction', ['Jonah']),
        entry(1, 'Jonah 1:1-3', ['Jonah']),
        entry(2, null, ['Jonah']),
        entry(3, null, ['Jonah']),
        entry(4, 'Jonah 1:4-6', ['Jonah']),
        entry(5, null, ['Jonah']),
    ]);

    it('devuelve el tramo contiguo de la sección del pasaje', () => {
        const selection = selectChunksForPassage(outline, ref('Jonah 1:1-3'), {
            contextChunks: 0,
        });

        expect(selection.ranges).toEqual([{ start: 1, end: 3 }]);
        expect(selection.chunkCount).toBe(3);
    });

    it('agrega los vecinos de contexto sin salirse del documento', () => {
        const selection = selectChunksForPassage(outline, ref('Jonah 1:1-3'), {
            contextChunks: 1,
        });

        expect(selection.ranges).toEqual([{ start: 0, end: 4 }]);
    });

    it('devuelve vacío cuando el pasaje no está en el documento', () => {
        const selection = selectChunksForPassage(outline, ref('Micah 1:1'));

        expect(selection.ranges).toEqual([]);
        expect(selection.chunkCount).toBe(0);
    });

    it('respeta el tope y lo señala', () => {
        const selection = selectChunksForPassage(outline, ref('Jonah 1:1-3'), {
            contextChunks: 0,
            maxChunks: 2,
        });

        expect(selection.chunkCount).toBe(2);
        expect(selection.truncated).toBe(true);
    });

    it('separa tramos no contiguos', () => {
        const disjoint = resolveOutlineReferences([
            entry(0, 'Jonah 1:1', ['Jonah']),
            entry(1, 'Micah 1:1', ['Micah']),
            entry(2, 'Jonah 1:2', ['Jonah']),
        ]);

        const selection = selectChunksForPassage(disjoint, ref('Jonah 1:1-3'), {
            contextChunks: 0,
        });

        expect(selection.ranges).toEqual([{ start: 0, end: 0 }, { start: 2, end: 2 }]);
    });
});

describe('outlineStructureQuality', () => {
    it('marca usable un documento con encabezados por referencia', () => {
        const resolved = resolveOutlineReferences([
            entry(0, 'Jonah 1:1-3', ['Jonah']),
            entry(1, 'Jonah 1:4-6', ['Jonah']),
        ]);

        expect(outlineStructureQuality(resolved).usable).toBe(true);
    });

    it('marca no usable un documento sin encabezados', () => {
        const resolved = resolveOutlineReferences([entry(0, null, []), entry(1, null, [])]);
        const quality = outlineStructureQuality(resolved);

        expect(quality.usable).toBe(false);
        expect(quality.headingCount).toBe(0);
    });

    it('marca no usable un documento con un solo encabezado suelto', () => {
        const resolved = resolveOutlineReferences([
            entry(0, 'Jonah 1:1-3', ['Jonah']),
            entry(1, null, ['Jonah']),
        ]);

        expect(outlineStructureQuality(resolved).usable).toBe(false);
    });
});
