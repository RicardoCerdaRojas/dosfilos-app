import { describe, it, expect } from 'vitest';

import { toNoteSpace, toScreenSpace } from '../../entities/InkNote';

describe('coordenadas de la tinta', () => {
    it('ida y vuelta devuelve el punto original', () => {
        const origin = { x: 120, y: 400 };
        const point = { x: 180, y: 430 };
        const inNote = toNoteSpace(point, origin, 28);
        expect(toScreenSpace(inNote, origin, 28)).toEqual(point);
    });

    it('la nota escala con el cuerpo: dibujada a 28, se ve a la mitad en 14', () => {
        const inNote = toNoteSpace({ x: 156, y: 100 }, { x: 100, y: 100 }, 28);
        expect(inNote.x).toBe(2);
        const at14 = toScreenSpace(inNote, { x: 100, y: 100 }, 14);
        expect(at14.x).toBe(128);
    });

    it('la nota SIGUE a su ancla cuando el texto se mueve', () => {
        // Se dibuja al lado de un pasaje que está en y=400…
        const inNote = toNoteSpace({ x: 150, y: 410 }, { x: 100, y: 400 }, 28);
        // …y al achicar la letra ese pasaje sube a y=250.
        const moved = toScreenSpace(inNote, { x: 100, y: 250 }, 28);
        expect(moved).toEqual({ x: 150, y: 260 });
    });

    it('no divide por cero si el cuerpo llega en 0', () => {
        expect(() => toNoteSpace({ x: 10, y: 10 }, { x: 0, y: 0 }, 0)).not.toThrow();
    });
});
