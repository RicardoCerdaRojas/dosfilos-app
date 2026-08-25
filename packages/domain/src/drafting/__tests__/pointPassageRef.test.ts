import { describe, it, expect } from 'vitest';
import { pointPassageRef } from '../pointPassageRef';

const SERMON = 'Jonás 1:1-3';

describe('pointPassageRef — manda el título que el pastor mantiene', () => {
    it('el caso real: su título dice (vv. 3) y la referencia heredada decía 1:3a', () => {
        // Los dos campos viven en el MISMO bosquejo vigente. Uno lo mantiene él
        // al editar el punto; el otro quedó de la propuesta del generador y no
        // se muestra en ninguna pantalla, así que nadie lo corrige.
        expect(
            pointPassageRef({
                title: 'II. El hombre desobedece y revela su necedad  (vv. 3)',
                sermonPassage: SERMON,
                scriptureReferences: ['Jonás 1:3a', 'Proverbios 19:21'],
            }),
        ).toBe('Jonás 1:3');
    });

    it('respeta el rango del título', () => {
        expect(
            pointPassageRef({
                title: 'I. Dios habla y revela su voluntad  (vv. 1-2)',
                sermonPassage: SERMON,
                scriptureReferences: ['Jonás 1:1-2'],
            }),
        ).toBe('Jonás 1:1-2');
    });

    it('acepta "v." singular igual que "vv."', () => {
        expect(pointPassageRef({ title: 'II. Algo (v. 3)', sermonPassage: SERMON })).toBe('Jonás 1:3');
    });

    it('conserva la mitad de versículo si el pastor la escribió en el título', () => {
        // Si ÉL escribe 3a, es su decisión y se respeta: `scriptureLookupRef`
        // se encarga de que la búsqueda funcione igual.
        expect(pointPassageRef({ title: 'II. Algo (v. 3a)', sermonPassage: SERMON })).toBe('Jonás 1:3a');
    });

    it('sin versículo en el título cae al respaldo del bosquejo', () => {
        expect(
            pointPassageRef({ title: 'II. Sin paréntesis', sermonPassage: SERMON, scriptureReferences: ['Jonás 1:3a'] }),
        ).toBe('Jonás 1:3a');
    });

    it('sin nada, no inventa una referencia', () => {
        expect(pointPassageRef({ title: 'II. Sin nada', sermonPassage: SERMON })).toBeUndefined();
        expect(pointPassageRef({})).toBeUndefined();
    });

    it('sin pasaje del sermón no puede completar el libro: usa el respaldo', () => {
        expect(pointPassageRef({ title: 'II. Algo (v. 3)', scriptureReferences: ['Jonás 1:3a'] })).toBe('Jonás 1:3a');
    });
});
