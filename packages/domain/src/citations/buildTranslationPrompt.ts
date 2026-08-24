import type { ReaderLanguage } from './citationLanguage';

const NOMBRE: Record<ReaderLanguage, string> = { es: 'español', en: 'inglés' };

/**
 * El prompt que TRADUCE una cita — y que no puede parafrasearla.
 *
 * LA DISTINCIÓN QUE JUSTIFICA TODO ESTE MÓDULO: una traducción conserva lo que
 * el autor afirmó y cambia el idioma; una paráfrasis cambia sus palabras y las
 * presenta como suyas. Con comillas alrededor y su nombre debajo, lo segundo
 * pone en boca de un autor real una frase que nunca escribió — exactamente lo
 * que `injectNarrativeCitationAnchors` existe para impedir.
 *
 * Por eso el original NUNCA se reemplaza: la traducción es una ayuda de
 * lectura, rotulada como tal, y el verbatim sigue siendo el ancla verificable.
 *
 * NO SE PIDE NADA QUE OBLIGUE A INVENTAR. Si el modelo no puede traducir con
 * fidelidad, devuelve el original: es preferible una cita en otro idioma a una
 * traducción que le atribuya al autor algo que no dijo. Es la misma lección que
 * la cita de autoridad obligatoria.
 */
export function buildCitationTranslationPrompt(excerpt: string, target: ReaderLanguage): string {
    return `Traduce al ${NOMBRE[target]} la siguiente cita textual de una obra académica.

REGLAS (obligatorias):
1. TRADUCE, NO PARAFRASEES. Conserva exactamente lo que el autor afirma. No
   resumas, no expliques, no agregues nada que no esté, no quites matices.
2. Mantén el registro académico del original: si el autor es técnico, la
   traducción es técnica.
3. Conserva los nombres propios, las referencias bíblicas y los términos en
   lenguas originales (hebreo, griego, latín) TAL CUAL aparecen.
4. Si la cita está cortada (empieza o termina a mitad de frase), tradúcela
   igual de cortada. No la completes.
5. Si NO puedes traducirla con fidelidad, devuelve el texto original sin
   cambios. Una cita mal traducida que lleva el nombre de su autor es peor que
   una cita en otro idioma.

Devuelve ÚNICAMENTE la traducción, sin comillas, sin encabezados y sin
comentarios.

CITA:
${excerpt}`;
}
