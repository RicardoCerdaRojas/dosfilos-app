import { describe, it, expect } from 'vitest';
import { derivarObjetivos } from '../derivarObjetivos';
import type { ElementoEstudio } from '../types';

function el(p: Partial<ElementoEstudio> & Pick<ElementoEstudio, 'id' | 'tipo' | 'orden' | 'contenido'>): ElementoEstudio {
    return { autoria: 'docente', ...p };
}

describe('derivarObjetivos', () => {
    it('mapea saber←idea_central+observacion, sentir←error_confrontado, hacer←aplicacion', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'a', tipo: 'idea_central', orden: 1, contenido: 'El Verbo es Dios' }),
            el({ id: 'b', tipo: 'observacion', orden: 2, contenido: 'Pedro habla con seriedad' }),
            el({ id: 'c', tipo: 'error_confrontado', orden: 3, contenido: 'Negar el juicio es falso' }),
            el({ id: 'd', tipo: 'aplicacion', orden: 4, contenido: 'Vela y confía' }),
            el({ id: 't', tipo: 'testigo', orden: 5, contenido: 'Col 1:16' }), // soporte → ninguna dimensión
        ];
        expect(derivarObjetivos(elementos)).toEqual({
            saber: ['El Verbo es Dios', 'Pedro habla con seriedad'],
            sentir: ['Negar el juicio es falso'],
            hacer: ['Vela y confía'],
        });
    });

    it('respeta el orden y recorta; omite vacíos', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'b', tipo: 'observacion', orden: 2, contenido: '  Segunda  ' }),
            el({ id: 'a', tipo: 'idea_central', orden: 1, contenido: 'Primera' }),
            el({ id: 'c', tipo: 'observacion', orden: 3, contenido: '   ' }),
        ];
        expect(derivarObjetivos(elementos).saber).toEqual(['Primera', 'Segunda']);
    });

    it('dimensión sin elementos fuente queda VACÍA (no se inventa)', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'a', tipo: 'idea_central', orden: 1, contenido: 'Solo saber' }),
        ];
        const o = derivarObjetivos(elementos);
        expect(o.saber).toEqual(['Solo saber']);
        expect(o.sentir).toEqual([]);
        expect(o.hacer).toEqual([]);
    });

    it('estudio vacío → tres dimensiones vacías', () => {
        expect(derivarObjetivos([])).toEqual({ saber: [], sentir: [], hacer: [] });
    });
});
