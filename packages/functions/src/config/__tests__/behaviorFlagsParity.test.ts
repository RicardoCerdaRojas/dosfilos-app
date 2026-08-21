import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BEHAVIOR_FLAGS } from '../accountSegment';

/**
 * Los flags de conducta que la sombra registra tienen que EXISTIR en el dominio.
 *
 * El modo de falla que esto ataja es silencioso y caro: si alguien renombra
 * `passage_profile_enforce`, el recorder seguiría escribiendo `false` para
 * siempre — no falla nada, no hay error, y las filas dirían que el pastor
 * trabajaba sin enforcement cuando sí lo tenía. La calibración se haría sobre
 * una mentira prolija.
 *
 * Misma disciplina que los otros parity tests de este paquete: `functions` no
 * puede importar `@dosfilos/domain`, así que la barrera cruza el borde LEYENDO
 * el fuente, no importándolo.
 */
const DOMAIN_USER_TS = join(__dirname, '../../../../domain/src/entities/User.ts');

function readDomainFlagNames(): string[] {
    const source = readFileSync(DOMAIN_USER_TS, 'utf8');
    const block = /export const FEATURE_FLAG_NAMES = \[([\s\S]*?)\] as const;/.exec(source);
    if (!block) throw new Error(`No se pudo leer FEATURE_FLAG_NAMES en ${DOMAIN_USER_TS}`);
    return [...block[1].matchAll(/^\s*'([a-z0-9_]+)',/gm)].map((m) => m[1]!);
}

describe('BEHAVIOR_FLAGS ↔ registro de flags del dominio', () => {
    it('el parseo encuentra el registro en el fuente del dominio', () => {
        expect(readDomainFlagNames().length).toBeGreaterThan(5);
    });

    it('cada flag de conducta existe en el dominio', () => {
        const known = new Set(readDomainFlagNames());
        for (const f of BEHAVIOR_FLAGS) {
            expect(known.has(f), `${f} no existe en FEATURE_FLAG_NAMES — ¿lo renombraron?`).toBe(true);
        }
    });

    it('son flags que ACTÚAN sobre el pastor, no de mera medición', () => {
        // El criterio de la lista: si no cambia lo que el pastor vive, no va.
        // Los de sombra pura quedan fuera a propósito — listarlos haría ruido.
        for (const f of BEHAVIOR_FLAGS) {
            expect(f === 'step3_genre_help' || f.endsWith('_enforce')).toBe(true);
        }
    });
});
