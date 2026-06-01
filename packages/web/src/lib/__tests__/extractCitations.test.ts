import { describe, it, expect } from 'vitest';
import type { SourceReference } from '@dosfilos/domain';
import { extractCitations } from '../citations';

/**
 * Gate test for `extractCitations` — the client-side rule that super-admins
 * see every citation while normal users only see `publiclyCitable` sources.
 *
 *  - `onlyCitableSources: false` (admin path, `!isAdmin === false`) → no gate,
 *    every cited source is numbered + rendered.
 *  - `onlyCitableSources: true` (normal user) → citations whose source is not
 *    `publiclyCitable` are stripped from the prose AND excluded from the list.
 */

const sources: SourceReference[] = [
    { title: 'Institución de la Religión Cristiana', author: 'Calvino', publiclyCitable: true },
    { title: 'Material Privado', author: 'Anónimo', publiclyCitable: false },
];

const content =
    'El conocimiento de Dios es doble (Calvino, "Institución de la Religión Cristiana"). ' +
    'Una afirmación apoyada en material reservado (Anónimo, "Material Privado").';

describe('extractCitations — admin/normal citation gate', () => {
    it('admin (no gate) renders BOTH citations', () => {
        const { rendered, citations } = extractCitations(content, sources, {
            onlyCitableSources: false,
        });
        expect(citations).toHaveLength(2);
        expect(rendered).toContain('data-cite="1"');
        expect(rendered).toContain('data-cite="2"');
    });

    it('normal user keeps only the publiclyCitable citation', () => {
        const { rendered, citations } = extractCitations(content, sources, {
            onlyCitableSources: true,
        });
        expect(citations).toHaveLength(1);
        expect(citations[0].author).toBe('Calvino');
        expect(rendered).toContain('data-cite="1"');
        // The protected citation is stripped entirely — no second marker.
        expect(rendered).not.toContain('data-cite="2"');
        expect(rendered).not.toContain('Material Privado');
    });

    it('defaults to no gate when options omitted (admin-equivalent)', () => {
        const { citations } = extractCitations(content, sources);
        expect(citations).toHaveLength(2);
    });

    it('treats a source with undefined publiclyCitable as protected under the gate', () => {
        const ambiguous: SourceReference[] = [
            { title: 'Sin Flag', author: 'X' }, // publiclyCitable undefined
        ];
        const text = 'Una idea (X, "Sin Flag").';
        const { citations } = extractCitations(text, ambiguous, { onlyCitableSources: true });
        expect(citations).toHaveLength(0);
    });
});
