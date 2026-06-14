import { describe, it, expect } from 'vitest';
import { serializarEstudio } from '../serializarEstudio';
import type { ElementoEstudio } from '../types';

function el(partial: Partial<ElementoEstudio> & Pick<ElementoEstudio, 'id' | 'tipo' | 'orden' | 'contenido'>): ElementoEstudio {
    return { autoria: 'docente', ...partial };
}

describe('serializarEstudio', () => {
    it('ordena por el campo `orden`, no por el orden del array', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e2', tipo: 'argumento', orden: 2, contenido: 'Segundo' }),
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'Primero' }),
            el({ id: 'e3', tipo: 'conclusion', orden: 3, contenido: 'Tercero' }),
        ];
        const md = serializarEstudio(elementos);
        expect(md).toBe(
            '## Marco\n\nPrimero\n\n## Argumento\n\nSegundo\n\n## Conclusión\n\nTercero',
        );
    });

    it('respeta una secuencia explícita de ids (reordenamiento didáctico) y anexa el resto', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'Marco' }),
            el({ id: 'e2', tipo: 'aplicacion', orden: 2, contenido: 'Aplica' }),
            el({ id: 'e3', tipo: 'argumento', orden: 3, contenido: 'Arg' }),
        ];
        // Arranca por la aplicación (escuela dominical) — e3 no nombrado se anexa al final.
        const md = serializarEstudio(elementos, ['e2', 'e1']);
        expect(md).toBe(
            '## Aplicación\n\nAplica\n\n## Marco\n\nMarco\n\n## Argumento\n\nArg',
        );
    });

    it('ignora ids inexistentes en la secuencia explícita', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'Marco' }),
        ];
        const md = serializarEstudio(elementos, ['fantasma', 'e1']);
        expect(md).toBe('## Marco\n\nMarco');
    });

    it('omite elementos con contenido vacío o solo espacios', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: '   ' }),
            el({ id: 'e2', tipo: 'argumento', orden: 2, contenido: 'Real' }),
        ];
        expect(serializarEstudio(elementos)).toBe('## Argumento\n\nReal');
    });

    it('recorta espacios alrededor del contenido', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e1', tipo: 'idea_central', orden: 1, contenido: '  El texto afirma X.\n' }),
        ];
        expect(serializarEstudio(elementos)).toBe('## Idea central\n\nEl texto afirma X.');
    });

    it('es determinista y no muta el array de entrada', () => {
        const elementos: ElementoEstudio[] = [
            el({ id: 'e2', tipo: 'argumento', orden: 2, contenido: 'B' }),
            el({ id: 'e1', tipo: 'marco', orden: 1, contenido: 'A' }),
        ];
        const copia = JSON.parse(JSON.stringify(elementos));
        const a = serializarEstudio(elementos);
        const b = serializarEstudio(elementos);
        expect(a).toBe(b);
        expect(elementos).toEqual(copia); // sin mutación
    });

    it('estudio vacío → markdown vacío', () => {
        expect(serializarEstudio([])).toBe('');
    });
});
