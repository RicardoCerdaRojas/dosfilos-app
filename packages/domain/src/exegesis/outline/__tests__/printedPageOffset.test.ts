import { describe, expect, it } from 'vitest';
import {
    detectPrintedPageOffset,
    printedPageFor,
    type PageTextSample,
} from '../printedPageOffset';

/**
 * Hojas con encabezado corrido «TÍTULO  N», que es la forma más común. Las
 * hojas cuyo número impreso caería en cero o negativo son las preliminares:
 * ahí el libro no numera en árabe, así que no llevan folio.
 */
function runningHead(pages: number, offset: number, title = 'INTRODUCTION'): PageTextSample[] {
    const out: PageTextSample[] = [];
    for (let page = 1; page <= pages; page++) {
        const printed = page + offset;
        out.push({
            page,
            text: printed >= 1
                ? `${title}   ${printed}\n\nCuerpo de la página con prosa corrida.`
                : 'Portada y créditos, sin folio impreso.',
        });
    }
    return out;
}

describe('detectPrintedPageOffset', () => {
    it('detecta el desfase constante de un encabezado corrido', () => {
        // Forma real medida en "Obadiah, Jonah and Micah": la hoja 77 lleva
        // impreso el 75.
        const result = detectPrintedPageOffset(runningHead(40, -2));

        expect(result.offset).toBe(-2);
        expect(result.samples).toBe(38); // las dos primeras hojas son preliminares
    });

    it('detecta desfase cero cuando el libro numera desde la primera hoja', () => {
        expect(detectPrintedPageOffset(runningHead(30, 0)).offset).toBe(0);
    });

    it('tolera hojas sin encabezado', () => {
        // Las aperturas de capítulo suelen omitir el folio, y el OCR pierde
        // algunos: no se exige unanimidad.
        const samples = runningHead(40, -2);
        for (let i = 0; i < 10; i++) samples[i]!.text = 'Sin encabezado, solo cuerpo.';

        expect(detectPrintedPageOffset(samples).offset).toBe(-2);
    });

    it('no arriesga un desfase con pocas muestras', () => {
        const result = detectPrintedPageOffset(runningHead(5, -2));

        expect(result.offset).toBeNull();
        expect(result.samples).toBe(3);
    });

    it('no arriesga un desfase cuando no hay acuerdo', () => {
        // Números sueltos distintos en cada hoja: cuerpo con cifras, sin folio.
        const noisy: PageTextSample[] = [];
        for (let page = 1; page <= 30; page++) {
            noisy.push({ page, text: `${page * 7} algo de cuerpo con cifras dispersas` });
        }

        expect(detectPrintedPageOffset(noisy).offset).toBeNull();
    });

    it('ignora números demasiado lejanos para ser un folio', () => {
        const samples: PageTextSample[] = [];
        for (let page = 1; page <= 20; page++) {
            samples.push({ page, text: `Nota sobre el año 1947 en la apertura del párrafo.` });
        }

        expect(detectPrintedPageOffset(samples).offset).toBeNull();
    });

    it('una sola hoja no puede imponer el desfase por tener muchas cifras', () => {
        const samples = runningHead(30, -3);
        samples[0]!.text = '9 8 7 6 5 4 3 2 1 tabla de cifras al inicio de la página';

        expect(detectPrintedPageOffset(samples).offset).toBe(-3);
    });

    it('lee el folio cuando va al pie en vez del encabezado', () => {
        const samples: PageTextSample[] = [];
        for (let page = 1; page <= 25; page++) {
            samples.push({ page, text: `Cuerpo de la página, prosa corrida sin números.\n\n${page - 4}` });
        }

        expect(detectPrintedPageOffset(samples).offset).toBe(-4);
    });

    it('devuelve vacío sin muestras', () => {
        expect(detectPrintedPageOffset([])).toEqual({ offset: null, samples: 0, agreement: 0 });
    });
});

describe('printedPageFor', () => {
    it('traduce hoja a número impreso', () => {
        expect(printedPageFor(77, -2)).toBe(75);
    });

    it('devuelve null sin desfase detectado', () => {
        expect(printedPageFor(77, null)).toBeNull();
    });

    it('devuelve null en las preliminares, donde el libro no numera en árabe', () => {
        expect(printedPageFor(1, -4)).toBeNull();
    });
});
