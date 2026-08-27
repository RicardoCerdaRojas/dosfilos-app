import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import type { SermonContent } from '@dosfilos/domain';
import { buildFullContent } from '../sermonContent';

// Stub t() — returns the key so assertions don't depend on i18n resources.
const t = ((key: string) => key) as unknown as TFunction;

// El borrador de prueba es un `SermonContent` real, no una forma parcial: si el
// fixture pudiera omitir campos, el test dejaría de proteger el caso verdadero.
const draft: SermonContent = {
    title: 'Sermón de prueba',
    introduction: 'Intro',
    conclusion: 'Concl',
    body: [
        {
            point: 'Punto I',
            content: 'Cuerpo',
            scriptureReferences: [
                '> "Porque no os hemos dado a conocer…" (📖 2 Pedro 1:16)',
                '>   "Y aquel Verbo fue hecho carne…" (📖 Juan 1:14)',
                'Salmo 119:105',
            ],
        },
    ],
};

describe('buildFullContent — cross-reference rendering', () => {
    it('strips the leading "> " blockquote prefix so list items render cleanly', () => {
        const md = buildFullContent(draft, t);
        expect(md).toContain('- "Porque no os hemos dado a conocer…" (📖 2 Pedro 1:16)');
        expect(md).toContain('- "Y aquel Verbo fue hecho carne…" (📖 Juan 1:14)');
        // no list item should keep a literal "> " after the bullet
        expect(md).not.toContain('- > ');
        expect(md).not.toContain('- >');
    });

    it('una referencia resoluble sale CON su texto', () => {
        // La vista previa y el sermón publicado mostraban sólo la cita: había
        // que abrir cada una para saber qué dice. El lienzo de edición ya lo
        // traía, y los dos renderizadores habían divergido.
        const md = buildFullContent(draft, t);
        expect(md).toContain('**Salmo 119:105**');
        expect(md).toContain('Lámpara es a mis pies tu palabra');
    });

    it('una referencia que no se puede resolver conserva la cita sola', () => {
        // Perder la referencia sería peor que no tener el texto.
        const md = buildFullContent(
            { ...draft, body: [{ ...draft.body[0], scriptureReferences: ['Libro Inexistente 3:4'] }] } as SermonContent,
            t,
        );
        expect(md).toContain('- Libro Inexistente 3:4');
    });
});
