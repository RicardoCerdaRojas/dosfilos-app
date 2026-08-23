import { describe, it, expect } from 'vitest';
import { checkCrossReferences } from '../crossReferences';

describe('checkCrossReferences — repetir el texto predicado no es cruzar', () => {
    it('caso real de producción (Jonás 1:1-3, punto I)', () => {
        // Cuatro "referencias cruzadas" y dos eran el propio pasaje expuesto.
        const r = checkCrossReferences(
            [
                '> "Vino palabra de Jehová a Jonás hijo de Amitai" (Jonás 1:1)',
                '> "Levántate y ve a Nínive" (Jonás 1:2)',
                '> "Dios, habiendo hablado muchas veces…" (Hebreos 1:1-2)',
                '> "Toda la Escritura es inspirada por Dios" (2 Timoteo 3:16)',
            ],
            'Jonás 1:1-3',
        );
        expect(r.mismoLibro).toHaveLength(2);
        expect(r.cruzan).toHaveLength(2);
        expect(r.suficientes).toBe(true);
    });

    it('detecta cuando NO alcanza el mínimo de otros libros', () => {
        const r = checkCrossReferences(
            ['> "…" (Jonás 1:1)', '> "…" (Jonás 4:2)', '> "…" (Salmo 139:7-8)'],
            'Jonás 1:1-3',
        );
        expect(r.mismoLibro).toHaveLength(2);
        expect(r.suficientes).toBe(false);
    });

    it('otro capítulo del MISMO libro sigue siendo el mismo libro', () => {
        // Jonás 4:2 no es el pasaje predicado, pero tampoco argumenta desde el
        // resto de la Escritura: sigue siendo el libro que se está exponiendo.
        const r = checkCrossReferences(['> "…" (Jonás 4:2)'], 'Jonás 1:1-3');
        expect(r.mismoLibro).toEqual(['> "…" (Jonás 4:2)']);
    });

    it('lee la referencia entre paréntesis, no la línea entera', () => {
        // El texto del versículo va delante; parsear la línea completa fallaría
        // siempre.
        const r = checkCrossReferences(['> "En el principio era el Verbo" (Juan 1:1)'], 'Jonás 1:1-3');
        expect(r.cruzan).toHaveLength(1);
        expect(r.ilegibles).toHaveLength(0);
    });

    it('también lee una referencia pelada, sin blockquote', () => {
        expect(checkCrossReferences(['Romanos 8:28'], 'Jonás 1:1-3').cruzan).toHaveLength(1);
    });

    it('lo ilegible se informa aparte y NO cuenta como violación', () => {
        const r = checkCrossReferences(['(no es una referencia)', '> "…" (Miqueas 6:8)'], 'Jonás 1:1-3');
        expect(r.ilegibles).toHaveLength(1);
        expect(r.mismoLibro).toHaveLength(0);
        expect(r.cruzan).toHaveLength(1);
    });

    it('si el pasaje del sermón no se puede leer, no acusa a nadie', () => {
        // Acusar por no poder verificar es peor que no acusar.
        const r = checkCrossReferences(['> "…" (Jonás 1:1)'], 'pasaje ilegible');
        expect(r.mismoLibro).toHaveLength(0);
        expect(r.cruzan).toHaveLength(1);
    });
});
