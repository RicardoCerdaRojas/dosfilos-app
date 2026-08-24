/**
 * ¿La cita está en un idioma que el lector no lee?
 *
 * PARA QUÉ: las citas del sermón son un SNAPSHOT VERBATIM de la biblioteca del
 * pastor. Si su biblioteca está en inglés, sus citas salen en inglés — y el
 * blockquote es justamente el ancla verificable que impide que el modelo
 * invente atribuciones. No se puede reemplazar; sí se puede TRADUCIR y ofrecer
 * el original a un clic.
 *
 * Esta decisión es calculable, así que se calcula: preguntarle al modelo "¿esto
 * está en inglés?" cuesta una llamada y falla en textos cortos.
 */

export type ReaderLanguage = 'es' | 'en';

/** Palabras función: aparecen en cualquier texto real del idioma, y casi nunca en el otro. */
const FUNCION: Record<ReaderLanguage, RegExp> = {
    es: /\b(?:el|la|los|las|un|una|de|del|que|para|con|por|como|pero|este|esta|su|sus|más|no|se|es|son|al|lo|le)\b/gi,
    en: /\b(?:the|of|and|to|in|that|is|was|for|with|as|but|this|these|his|her|its|from|which|not|are|be)\b/gi,
};

/** Debajo de esto, cualquier veredicto es ruido: "Sic transit gloria" no es inglés. */
const MIN_PALABRAS = 12;

/**
 * Cuánto tiene que ganar el otro idioma para declararlo extranjero.
 *
 * Una cita en español puede traer un par de términos en inglés y sigue siendo
 * española. Exigir el DOBLE de coincidencias evita ofrecer una traducción al
 * idioma que el lector ya está leyendo — que es peor que no ofrecer nada:
 * sugiere que el sistema no entiende lo que muestra.
 */
const MARGEN = 2;

/**
 * `true` sólo cuando el texto parece estar en el OTRO idioma, con holgura.
 *
 * Conservador a propósito: ante la duda responde `false`. El costo de un falso
 * negativo es un botón que no aparece; el de un falso positivo es ofrecer
 * traducir algo que ya está traducido.
 */
export function needsTranslation(text: string, reader: ReaderLanguage): boolean {
    const limpio = (text ?? '').trim();
    if (limpio.split(/\s+/).filter(Boolean).length < MIN_PALABRAS) return false;

    const otro: ReaderLanguage = reader === 'es' ? 'en' : 'es';
    const cuenta = (re: RegExp) => (limpio.match(new RegExp(re.source, 'gi')) ?? []).length;

    const enOtro = cuenta(FUNCION[otro]);
    const enPropio = cuenta(FUNCION[reader]);

    // Sin señal del otro idioma no hay nada que traducir.
    if (enOtro === 0) return false;
    return enOtro >= enPropio * MARGEN && enOtro >= 3;
}
