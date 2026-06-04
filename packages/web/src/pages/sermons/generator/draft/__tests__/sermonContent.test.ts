import { describe, it, expect } from 'vitest';
import type { TFunction } from 'i18next';
import { buildFullContent } from '../sermonContent';

// Stub t() — returns the key so assertions don't depend on i18n resources.
const t = ((key: string) => key) as unknown as TFunction;

const draft = {
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

    it('leaves a ref without a blockquote prefix untouched', () => {
        const md = buildFullContent(draft, t);
        expect(md).toContain('- Salmo 119:105');
    });
});
