import { GREEK_INSIGHT_PROMPT_VERSION, type GreekVerseInsight, type GreekWordInsight } from './verseInsight';
import { isKnownCaseFunction } from './caseFunctionTaxonomy';
import type { GreekCase } from './morphGntToken';

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
    input: {
        reference: string;
        expectedWordCount: number;
        /**
         * El caso de cada token, en orden. Sirve para VALIDAR la función que
         * devuelve el modelo contra la taxonomía cerrada de ESE caso: un
         * "genitivo de medio" no existe, y una etiqueta con aire académico
         * que ningún profesor reconoce es peor que ninguna.
         */
        cases?: readonly (GreekCase | undefined)[];
    },
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
    for (const [i, crudo] of p.words.entries()) {
        const w = crudo as Record<string, unknown>;
        const text = typeof w.text === 'string' ? w.text.trim() : '';
        const semanticRange = typeof w.semanticRange === 'string' ? w.semanticRange.trim() : '';
        const syntacticFunction = typeof w.syntacticFunction === 'string' ? w.syntacticFunction.trim() : '';
        const translation = typeof w.translation === 'string' ? w.translation.trim() : '';
        if (!text || !semanticRange || !syntacticFunction || !translation) return null;

        const caso = input.cases?.[i];
        const fnCruda = typeof w.caseFunction === 'string' ? w.caseFunction.trim() : '';
        const caseFunction = caso && fnCruda && isKnownCaseFunction(caso, fnCruda) ? fnCruda : undefined;
        const nameNote = typeof w.nameNote === 'string' ? w.nameNote.trim() : '';

        words.push({
            text,
            semanticRange,
            syntacticFunction,
            translation,
            ...(caseFunction ? { caseFunction } : {}),
            ...(nameNote ? { nameNote } : {}),
        });
    }

    // Las claves exegéticas son OPCIONALES y se validan suave: una entrada
    // malformada se descarta sola, sin tumbar el análisis entero — a
    // diferencia de `words`, donde el desalineamiento corrompe todo.
    const keyInsights = Array.isArray(p.keyInsights)
        ? p.keyInsights
              .map((crudo) => {
                  const k = crudo as Record<string, unknown>;
                  const text = typeof k.text === 'string' ? k.text.trim() : '';
                  const significance = typeof k.significance === 'string' ? k.significance.trim() : '';
                  return text && significance ? { text, significance } : null;
              })
              .filter((k): k is { text: string; significance: string } => k !== null)
              .slice(0, 3)
        : [];

    const wordOrderNote = typeof p.wordOrderNote === 'string' ? p.wordOrderNote.trim() : '';

    return {
        reference: input.reference,
        literalTranslation: literal,
        fluidTranslation: fluida,
        words,
        ...(keyInsights.length > 0 ? { keyInsights } : {}),
        ...(wordOrderNote ? { wordOrderNote } : {}),
        promptVersion: GREEK_INSIGHT_PROMPT_VERSION,
    };
}
