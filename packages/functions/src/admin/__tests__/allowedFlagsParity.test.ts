import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ALLOWED_FLAGS } from '../setUserFeatureFlags';

/**
 * Paridad allowlist ↔ registry del dominio.
 *
 * `packages/functions` NO puede importar `@dosfilos/domain` (decoupling
 * intencional: importarlo revienta el build con ~180 TS6059), así que
 * `ALLOWED_FLAGS` es una copia manual de `FEATURE_FLAG_NAMES`. Sin una barrera,
 * las dos listas driftean en silencio y el síntoma llega tarde y torcido: la UI
 * de admin muestra el toggle (lo renderiza desde el dominio) y el callable lo
 * rechaza como flag desconocido. Pasó de verdad — tres flags shipped quedaron
 * intoggleables y un cuarto ni siquiera estaba registrado.
 *
 * Este test lee el FUENTE del dominio en vez de importarlo, que es la única
 * forma de cruzar el borde sin romper el build.
 */
const DOMAIN_USER_TS = join(__dirname, '../../../../domain/src/entities/User.ts');

function readDomainFlagNames(): string[] {
    const source = readFileSync(DOMAIN_USER_TS, 'utf8');
    const block = /export const FEATURE_FLAG_NAMES = \[([\s\S]*?)\] as const;/.exec(source);
    if (!block) {
        throw new Error(`No se pudo leer FEATURE_FLAG_NAMES en ${DOMAIN_USER_TS}`);
    }
    // Solo los literales de la lista; los comentarios de bloque no llevan comillas simples.
    // SE QUITAN LOS COMENTARIOS ANTES DE EXTRAER. La lista lleva un comentario
    // largo por flag, y cualquier palabra entrecomillada ahí dentro —`'workshop'`
    // dentro de una explicación— entraba como si fuera un flag: la prueba
    // fallaba pidiendo registrar algo que no existe. Una baranda que se dispara
    // en falso enseña a ignorarla, y entonces deja de proteger cuando importa.
    const sinComentarios = block[1]
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
    return [...sinComentarios.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

describe('ALLOWED_FLAGS ↔ FEATURE_FLAG_NAMES', () => {
    it('el parseo del fuente del dominio encuentra la lista', () => {
        const names = readDomainFlagNames();
        expect(names.length).toBeGreaterThan(5);
        expect(names).toContain('pastoral_fidelity_flow');
    });

    it('todo flag del dominio es toggleable desde el admin', () => {
        const faltantes = readDomainFlagNames().filter((f) => !ALLOWED_FLAGS.has(f));
        expect(faltantes, `Flags del dominio ausentes en ALLOWED_FLAGS: ${faltantes.join(', ')}`).toEqual([]);
    });

    it('el allowlist no inventa flags que el dominio no conoce', () => {
        const names = new Set(readDomainFlagNames());
        const fantasma = [...ALLOWED_FLAGS].filter((f) => !names.has(f));
        expect(fantasma, `Flags en ALLOWED_FLAGS que el dominio no declara: ${fantasma.join(', ')}`).toEqual([]);
    });
});
