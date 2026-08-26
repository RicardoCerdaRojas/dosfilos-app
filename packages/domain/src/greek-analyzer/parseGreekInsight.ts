import type { GreekVerseInsight, GreekWordInsight } from './verseInsight';

/**
 * Valida la respuesta del modelo ANTES de cachearla.
 *
 * EL ALINEAMIENTO ES EL CONTRATO: la palabra i del insight explica al token i
 * del versículo. Un modelo que omite o duplica una palabra desalinearía TODAS
 * las siguientes — cada tarjeta mostraría el análisis de la palabra vecina, el
 * peor error posible en una herramienta de estudio porque parece correcto. Por
 * eso una longitud distinta descarta la respuesta entera: mejor sin análisis
 * que con el análisis corrido.
 */
export function parseGreekInsight(
    raw: string,
    input: { reference: string; expectedWordCount: number },
): GreekVerseInsight | null {
    const inicio = raw.indexOf('{');
    const fin = raw.lastIndexOf('}');
    if (inicio === -1 || fin <= inicio) return null;

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw.slice(inicio, fin + 1));
    } catch {
        return null;
    }
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Record<string, unknown>;

    const literal = typeof p.literalTranslation === 'string' ? p.literalTranslation.trim() : '';
    const fluida = typeof p.fluidTranslation === 'string' ? p.fluidTranslation.trim() : '';
    if (!literal || !fluida) return null;

    if (!Array.isArray(p.words) || p.words.length !== input.expectedWordCount) return null;

    const words: GreekWordInsight[] = [];
    for (const crudo of p.words) {
        const w = crudo as Record<string, unknown>;
        const text = typeof w.text === 'string' ? w.text.trim() : '';
        const semanticRange = typeof w.semanticRange === 'string' ? w.semanticRange.trim() : '';
        const syntacticFunction = typeof w.syntacticFunction === 'string' ? w.syntacticFunction.trim() : '';
        const translation = typeof w.translation === 'string' ? w.translation.trim() : '';
        if (!text || !semanticRange || !syntacticFunction || !translation) return null;
        words.push({ text, semanticRange, syntacticFunction, translation });
    }

    return {
        reference: input.reference,
        literalTranslation: literal,
        fluidTranslation: fluida,
        words,
    };
}
