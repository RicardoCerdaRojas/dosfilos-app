import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_FEATURE_FLAGS } from '../defaultFeatureFlags';

/**
 * Paridad del set de defaults con el dominio. Hermano del test de `ALLOWED_FLAGS`
 * y por la misma razón: `packages/functions` no puede importar `@dosfilos/domain`
 * (el build revienta con ~180 TS6059), así que la lista vive duplicada y la
 * barrera cruza el borde LEYENDO el fuente, no importándolo.
 *
 * El síntoma de un drift acá es peor que el del allowlist: las cuentas de PAGO
 * (que nacen por este callable) estrenarían un set distinto al de las cuentas
 * free — dos productos distintos según cómo pagaste, sin que nadie lo decidiera.
 */
const DOMAIN_USER_TS = join(__dirname, '../../../../domain/src/entities/User.ts');

function readDomainDefaults(): string[] {
    const source = readFileSync(DOMAIN_USER_TS, 'utf8');
    const block = /export const DEFAULT_FEATURE_FLAGS: readonly FeatureFlagName\[\] = \[([\s\S]*?)\];/.exec(source);
    if (!block) throw new Error(`No se pudo leer DEFAULT_FEATURE_FLAGS en ${DOMAIN_USER_TS}`);
    return [...block[1].matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
}

describe('defaults de functions ↔ DEFAULT_FEATURE_FLAGS del dominio', () => {
    it('el parseo encuentra el set en el fuente del dominio', () => {
        expect(readDomainDefaults().length).toBeGreaterThan(3);
    });

    it('las dos listas son el MISMO conjunto, en el mismo orden', () => {
        expect([...DEFAULT_FEATURE_FLAGS]).toEqual(readDomainDefaults());
    });
});
