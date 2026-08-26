import { describe, it, expect } from 'vitest';
import { SERMON_INTRO_HEADINGS } from '@dosfilos/domain';
import es from '../locales/es/generator.json';
import en from '../locales/en/generator.json';

/**
 * PARIDAD entre la constante de dominio y los JSON de i18n.
 *
 * El generador escribe los encabezados de la introducción desde
 * `SERMON_INTRO_HEADINGS` (su prompt vive en infraestructura, sin i18n); el
 * taller los pinta con `t('drafting.sections.*.heading')`. Son LA MISMA
 * introducción por dos caminos: si alguien renombra un encabezado en el JSON y
 * no en la constante, los dos borradores dejan de coincidir en silencio.
 * Mismo patrón que el parity test de ALLOWED_FLAGS.
 */
describe('SERMON_INTRO_HEADINGS ≡ drafting.sections.*.heading', () => {
    const claves = [
        'openingIllustration',
        'bookOverview',
        'historicalContext',
        'currentConnection',
        'sermonProposition',
    ] as const;

    it.each(claves)('es: %s', (k) => {
        expect(SERMON_INTRO_HEADINGS.es[k]).toBe((es as any).drafting.sections[k].heading);
    });

    it.each(claves)('en: %s', (k) => {
        expect(SERMON_INTRO_HEADINGS.en[k]).toBe((en as any).drafting.sections[k].heading);
    });
});
