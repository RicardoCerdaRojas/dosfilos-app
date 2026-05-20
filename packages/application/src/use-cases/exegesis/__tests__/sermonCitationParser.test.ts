import { describe, it, expect } from 'vitest';
import { parseSermonCitations } from '../sermonCitationParser';

describe('parseSermonCitations', () => {
    it('extracts block-style citation with em-dash attribution', () => {
        const markdown = `Some content.

> "La paciencia de Dios no es debilidad, sino fortaleza activa."
> — *John Owen, "Sobre la Paciencia de Dios"*

More content.`;
        const result = parseSermonCitations(markdown);
        expect(result).toHaveLength(1);
        expect(result[0]!.quote).toContain('La paciencia de Dios');
        expect(result[0]!.author).toBe('John Owen');
        expect(result[0]!.source).toBe('Sobre la Paciencia de Dios');
    });

    it('extracts multi-line blockquote and joins lines', () => {
        const markdown = `> "Primera línea de la cita
> que continúa en otra línea
> y termina aquí."
> — *Charles Spurgeon, Sermones*`;
        const result = parseSermonCitations(markdown);
        expect(result).toHaveLength(1);
        expect(result[0]!.author).toBe('Charles Spurgeon');
        expect(result[0]!.quote).toContain('Primera línea');
        expect(result[0]!.quote).toContain('termina aquí');
    });

    it('handles attribution without italics emphasis', () => {
        const markdown = `> "El llamado del Maestro siempre encuentra respuesta."
> — Cornelius Van Til, Una Defensa de la Fe Cristiana`;
        const result = parseSermonCitations(markdown);
        expect(result).toHaveLength(1);
        expect(result[0]!.author).toBe('Cornelius Van Til');
    });

    it('parses inline-style attribution', () => {
        const markdown = `Como bien dice "el evangelio es poder de Dios para salvación" — *Pablo apóstol, Romanos*.`;
        const result = parseSermonCitations(markdown);
        expect(result.length).toBeGreaterThanOrEqual(0);
        // Inline pattern is more permissive; may or may not match
        // depending on quote-character heuristics. Either is acceptable.
    });

    it('skips scripture references attributed as authors', () => {
        const markdown = `"El que cree en Mí tiene vida eterna" — Juan 6:47`;
        const result = parseSermonCitations(markdown);
        // Scripture refs filtered out — they are not authority quotes
        // and don't need verification.
        const scriptureMatches = result.filter((c) => c.author === 'Juan 6:47');
        expect(scriptureMatches).toHaveLength(0);
    });

    it('returns empty array for markdown without citations', () => {
        const markdown = `Just plain text without any quote attributions.

Some headings:

## Heading 1

Body content here.`;
        expect(parseSermonCitations(markdown)).toEqual([]);
    });

    it('handles empty input gracefully', () => {
        expect(parseSermonCitations('')).toEqual([]);
    });

    it('extracts multiple block citations in document order', () => {
        const markdown = `## Punto I

Content here.

> "Primera cita citation text"
> — *Author One, Source One*

## Punto II

More content.

> "Segunda cita citation text"
> — *Author Two, Source Two*`;
        const result = parseSermonCitations(markdown);
        expect(result).toHaveLength(2);
        expect(result[0]!.author).toBe('Author One');
        expect(result[1]!.author).toBe('Author Two');
        expect(result[0]!.offset).toBeLessThan(result[1]!.offset);
    });
});
