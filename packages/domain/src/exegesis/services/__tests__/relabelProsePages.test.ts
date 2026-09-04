import { describe, it, expect } from 'vitest';
import { relabelProsePages } from '../relabelProsePages';

/** Más que la ventana de atribución, para empujar la clave fuera. */
const ATTRIBUTION_GAP = 130;

const KEYS = ['Adamson', 'Mayor', 'Kittel', 'Wallace', 'Nestle-Aland'];

/** Los desfases medidos sobre la biblioteca real del caso. */
const label = (key: string, sheet: number): string => {
    const offsets: Record<string, number | null> = {
        Adamson: -4,
        Kittel: 0,
        Mayor: null,
        Wallace: null,
        'Nestle-Aland': null,
    };
    const offset = offsets[key];
    if (offset === null || offset === undefined) return `hoja ${sheet}`;
    const printed = sheet + offset;
    return printed >= 1 ? `p. ${printed}` : `hoja ${sheet}`;
};

const relabel = (text: string) => relabelProsePages(text, KEYS, label);

describe('relabelProsePages', () => {
    it('convierte la mención en prosa igual que la cita formal', () => {
        // El caso real: la misma hoja 59 de Adamson salía «p. 59» en el
        // cuerpo y «p. 55» en la cita del mismo párrafo.
        const text = 'Como argumenta Adamson (p. 59), no son meramente repetitivos.';

        expect(relabel(text)).toBe('Como argumenta Adamson (p. 55), no son meramente repetitivos.');
    });

    it('rotula «hoja» cuando el desfase de esa obra no se pudo medir', () => {
        const text = 'un recurso estilístico que Mayor (p. 240) observa en Santiago';

        expect(relabel(text)).toBe('un recurso estilístico que Mayor (hoja 240) observa en Santiago');
    });

    it('atribuye a través de una cita formal completa', () => {
        const text = 'es posible (Wallace, "Gramática Griega", p. 55), pero la lectura';

        expect(relabel(text)).toContain('"Gramática Griega", hoja 55)');
    });

    it('deja intacta una página que no se puede atribuir', () => {
        // Sin dueño no hay desfase que aplicar, y convertir con el del
        // libro equivocado manda al lector a una página real que no dice
        // lo que la cita afirma.
        const text = 'La discusión clásica está en p. 59 del volumen.';

        expect(relabel(text)).toBe(text);
    });

    it('no toca un rango de páginas', () => {
        const text = 'Adamson desarrolla el punto en pp. 59-61.';

        expect(relabel(text)).toBe(text);
    });

    it('atribuye cada mención a su propia fuente', () => {
        const text = 'Adamson (p. 59) lo conecta, mientras Kittel (p. 344) afirma otra cosa.';

        expect(relabel(text)).toBe(
            'Adamson (p. 55) lo conecta, mientras Kittel (p. 344) afirma otra cosa.',
        );
    });

    it('no atribuye a la clave de la oración anterior', () => {
        const relleno = 'y'.repeat(ATTRIBUTION_GAP);
        const text = `Adamson abre el tema. ${relleno} La página p. 59 queda sin dueño.`;

        expect(relabel(text)).toBe(text);
    });

    it('no confunde una clave con el prefijo de otra palabra', () => {
        const text = 'El mayorazgo medieval, p. 240, no viene al caso.';

        expect(relabel(text)).toBe(text);
    });

    it('devuelve el texto tal cual cuando no hay claves', () => {
        const text = 'Adamson (p. 59) lo conecta.';

        expect(relabelProsePages(text, [], label)).toBe(text);
    });

    it('no altera un texto sin menciones de página', () => {
        const text = 'Adamson lo conecta con la madurez espiritual.';

        expect(relabel(text)).toBe(text);
    });
});
