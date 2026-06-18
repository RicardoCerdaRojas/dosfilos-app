// Reusa la SSOT de copy del landing (packages/web/src/i18n/locales/{es,en}/landing.json)
// vía import directo. Acople conocido con el layout de packages/web; si molesta,
// promover a un paquete @dosfilos/locales (documentado en docs/Preach_SEO_descubribilidad.md §8.4).
import esLanding from '../../../web/src/i18n/locales/es/landing.json';
import enLanding from '../../../web/src/i18n/locales/en/landing.json';

export type Lang = 'es' | 'en';

export const LOCALES: Lang[] = ['es', 'en'];
export const DEFAULT_LOCALE: Lang = 'es';

const dicts: Record<Lang, unknown> = { es: esLanding, en: enLanding };

/**
 * Crea un lookup `t` para el idioma dado. Soporta claves anidadas con punto
 * (`faq.items`, `heroCarousel.panels`) y devuelve arrays/objetos tal cual
 * (equivalente a `returnObjects: true` de i18next). Si la clave falta, devuelve
 * la clave misma (fail-loud visible, no string vacío silencioso).
 */
export function createT(lang: Lang) {
  const dict = dicts[lang];
  return function t<T = string>(key: string): T {
    const val = key
      .split('.')
      .reduce<unknown>((acc, k) => (acc == null ? acc : (acc as Record<string, unknown>)[k]), dict);
    if (val === undefined) return key as unknown as T;
    return val as T;
  };
}
