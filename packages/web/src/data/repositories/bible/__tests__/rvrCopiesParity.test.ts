import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * LAS TRES COPIAS TIENEN QUE SER LA MISMA BIBLIA.
 *
 * `rvr1960.json` está duplicado tres veces —web, infraestructura y mobile—,
 * una por paquete que lo carga. Es deuda conocida (~10 MB repetidos) y no se
 * resuelve acá; lo que sí se resuelve es su peligro real, que no es el
 * espacio en disco.
 *
 * El peligro se hizo visible reparando el asset: el arreglo de los 4.738
 * versículos con el literal `/n` y del corte de más en el Salmo 47 se aplicó
 * a la copia de web y las otras dos quedaron atrás. Durante ese rato la
 * página de Biblia mostraba un texto y el asistente exegético otro, sin un
 * solo error de por medio. Dos Biblias distintas en el mismo producto es peor
 * que el defecto que se estaba arreglando.
 *
 * Esta prueba compara el CONTENIDO de las tres. Si alguien vuelve a reparar,
 * regenerar o actualizar una sola, falla acá y no en producción.
 */

const RAIZ = resolve(__dirname, '../../../../../../..');

const COPIAS = {
    web: 'packages/web/src/assets/bible/rvr1960.json',
    infraestructura: 'packages/infrastructure/src/bible/data/rvr1960.json',
    mobile: 'packages/mobile/assets/bible/rvr1960.json',
} as const;

/**
 * Hash del contenido ya normalizado por `JSON.parse` + `JSON.stringify`, no
 * del archivo crudo: dos copias con distinta indentación o distinto orden de
 * escritura siguen siendo la misma Biblia, y hacerlas fallar por el formato
 * sería una alarma falsa.
 */
function huella(rutaRelativa: string): { hash: string; versiculos: number } {
    const crudo = readFileSync(resolve(RAIZ, rutaRelativa), 'utf8');
    const libros = JSON.parse(crudo) as Array<{ id: string; chapters: string[][] }>;
    const versiculos = libros.reduce(
        (n, l) => n + l.chapters.reduce((m, c) => m + c.length, 0),
        0,
    );
    return {
        hash: createHash('sha256').update(JSON.stringify(libros)).digest('hex'),
        versiculos,
    };
}

describe('paridad entre las tres copias de la RVR', () => {
    it('las tres tienen exactamente el mismo contenido', () => {
        const [primera, ...resto] = Object.entries(COPIAS).map(
            ([nombre, ruta]) => [nombre, huella(ruta)] as const,
        );
        for (const [nombre, actual] of resto) {
            expect(
                actual.hash,
                `"${nombre}" difiere de "${primera![0]}" — reparar una copia y no las otras `
                + 'deja dos Biblias distintas en el mismo producto. '
                + 'Corré: node scripts/reparar-asset-biblico.mjs',
            ).toBe(primera![1].hash);
        }
    });

    it('las tres tienen el mismo conteo de versículos', () => {
        // Redundante con el hash, pero cuando falla dice CUÁNTO se corrió el
        // conteo, que es la primera pregunta al ver el rojo.
        const conteos = Object.entries(COPIAS).map(
            ([nombre, ruta]) => `${nombre}: ${huella(ruta).versiculos}`,
        );
        expect(new Set(conteos.map(c => c.split(': ')[1])).size, conteos.join(' · ')).toBe(1);
    });
});
