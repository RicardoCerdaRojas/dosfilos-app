import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SANITIZER_RANGES, sanitizeExtractedText } from '../sanitizeExtractedText';

/**
 * El saneador está duplicado en `domain` y en `functions`, porque `functions`
 * no importa `@dosfilos/domain` a propósito.
 *
 * El modo de falla que esto ataja es silencioso: alguien agrega un rango
 * peligroso al saneador del dominio —digamos un bloque nuevo de invisibles— y
 * la nube, que es la que indexa de verdad, sigue dejándolo pasar. El índice
 * quedaría sucio mientras los tests del dominio dicen que todo está limpio.
 *
 * Misma disciplina que `behaviorFlagsParity`: la barrera cruza el borde
 * LEYENDO el fuente, no importándolo.
 */
const DOMAIN_SANITIZER_TS = join(
    __dirname,
    '../../../../domain/src/library/sanitizeExtractedText.ts'
);

type Range = readonly [number, number, string];

function readDomainRanges(): Range[] {
    const source = readFileSync(DOMAIN_SANITIZER_TS, 'utf8');
    const block = /export const SANITIZER_RANGES[^=]*=\s*\[([\s\S]*?)\n\];/.exec(source);
    if (!block) throw new Error(`No se pudo leer SANITIZER_RANGES en ${DOMAIN_SANITIZER_TS}`);
    return [...block[1].matchAll(/\[\s*(0x[0-9a-f]+),\s*(0x[0-9a-f]+),\s*'([a-zA-Z]+)'\s*\]/g)].map(
        (m) => [parseInt(m[1]!, 16), parseInt(m[2]!, 16), m[3]!] as Range
    );
}

describe('saneador: paridad entre domain y functions', () => {
    it('el parseo encuentra la tabla en el fuente del dominio', () => {
        expect(readDomainRanges().length).toBeGreaterThan(5);
    });

    it('las dos tablas son idénticas, rango por rango y en el mismo orden', () => {
        const domain = readDomainRanges();
        const local = SANITIZER_RANGES.map((r) => [r[0], r[1], r[2]] as Range);
        expect(local).toEqual(domain);
    });

    it('la copia de functions sanea lo mismo que promete la tabla', () => {
        // Un representante por categoría declarada, construido DESDE la tabla:
        // si alguien agrega una categoría y se olvida de cubrirla, este test la
        // ejercita igual.
        for (const [start, , category] of SANITIZER_RANGES) {
            const sucio = `a${String.fromCodePoint(start)}b`;
            const { text, report } = sanitizeExtractedText(sucio);
            expect(text, `U+${start.toString(16)} (${category}) no fue removido`).toBe('ab');
            expect(report.byCategory[category]).toBe(1);
        }
    });

    it('conserva griego y hebreo en la copia de functions', () => {
        const sagrado = 'Ἀκούσατε, λαοί · בְּרֵאשִׁ֖ית בָּרָ֣א';
        expect(sanitizeExtractedText(sagrado).text).toBe(sagrado);
    });
});
