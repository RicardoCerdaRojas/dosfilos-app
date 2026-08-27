/**
 * Lo que el MODELO aporta al analizador griego — y sólo eso.
 *
 * La morfología NO está aquí: es determinista (MorphGNT) y se resolvió en la
 * fase 1. El modelo recibe esa morfología como CONTEXTO y aporta lo que no es
 * calculable: rango semántico del lema, función sintáctica en la frase, y las
 * dos traducciones del versículo. Separar las capas mantiene honesto al
 * sistema: lo verificable nunca depende de lo generado.
 */

/** El aporte del modelo para UNA palabra. */
export interface GreekWordInsight {
    /** Forma superficial, para validar el alineamiento con los tokens. */
    readonly text: string;
    /** Rango semántico del lema: los sentidos posibles, no uno solo. */
    readonly semanticRange: string;
    /** Cómo funciona ESTA palabra en ESTA frase. */
    readonly syntacticFunction: string;
    /**
     * La FUNCIÓN DEL CASO según la taxonomía estándar (Wallace) — el nombre
     * técnico que un profesor de seminario evalúa: "nominativo absoluto",
     * "genitivo de posesión", "dativo de medio". Id de la lista CERRADA
     * (`CASE_FUNCTIONS`); el parser descarta lo que no esté en ella. Ausente
     * cuando la palabra no tiene caso o el modelo no la determinó.
     */
    readonly caseFunction?: string;
    /**
     * Historia del nombre propio: por qué Ἰάκωβος se traduce "Santiago" y no
     * "Jacobo". Sólo en nombres propios y sólo cuando hay algo que contar.
     */
    readonly nameNote?: string;
    /**
     * El uso del ARTÍCULO según la taxonomía cerrada (`ARTICLE_USES`). El
     * artículo griego no es "el/la" español: hace trabajos que el castellano
     * no marca, y explicarlos es lo que convierte un artículo suelto en un
     * hilo argumental visible.
     */
    readonly articleUse?: string;
    /**
     * Con `articleUse: 'anaphoric'`, A QUÉ señala hacia atrás — la palabra y
     * su versículo ("ὑπομονήν, v. 3"). Es lo que explica por qué un versículo
     * puede EMPEZAR con un artículo.
     */
    readonly antecedent?: string;
    /** Traducción contextual de la palabra. */
    readonly translation: string;
}

/**
 * El "¿y qué?" de una palabra teológicamente cargada: POR QUÉ su morfología o
 * su semántica importan para la predicación. Es el salto del dato a la
 * consecuencia — "aoristo imperativo" → "pide una decisión puntual, no una
 * actitud continua".
 */
export interface GreekKeyInsight {
    /** La palabra, verbatim como aparece en el versículo. */
    readonly text: string;
    readonly significance: string;
}

/**
 * Versión del contrato del análisis. Se ESTAMPA al parsear (no la emite el
 * modelo) y viaja al caché: un caché de versión anterior ofrece "Ampliar
 * análisis". Adivinar por campos no funciona — `wordOrderNote` puede faltar
 * legítimamente ("si el orden no enseña nada, omite"), así que su ausencia no
 * distingue un caché viejo de una decisión del modelo.
 *
 * v1: traducciones + words. v2: + keyInsights. v3: + wordOrderNote.
 * v4: genitivos en cadena — la aposición muestra "(de) X" y lo explica.
 * v5: + caseFunction (taxonomía cerrada) y nameNote (nombres propios).
 * v6: + relations (aposición/concordancia) y rhetoric (quiasmo/inclusión).
 * v7: español latinoamericano (ustedes, no vosotros).
 * v8: + articleUse/antecedent, con el versículo anterior como contexto.
 */
export const GREEK_INSIGHT_PROMPT_VERSION = 8;

export interface GreekVerseInsight {
    /** "JAS 1:2" — la clave del caché. */
    readonly reference: string;
    /** Traducción literal: calca el orden y la sintaxis del griego. */
    readonly literalTranslation: string;
    /** Traducción fluida: español natural. */
    readonly fluidTranslation: string;
    /** En el MISMO orden que los tokens del versículo. */
    readonly words: readonly GreekWordInsight[];
    /**
     * Las 2-3 palabras que cargan el peso teológico del versículo, con su
     * significancia homilética. SÓLO ésas: en todas las palabras sería ruido.
     * Ausente en cachés anteriores a este campo.
     */
    readonly keyInsights?: readonly GreekKeyInsight[];
    /**
     * El reordenamiento más ilustrativo del versículo, explicado con SUS
     * palabras ("δοῦλος cierra la frase griega; el español lo antepone…").
     * La regla general —el griego marca la función con casos y usa el orden
     * para el énfasis— es fija y vive en la UI; esta nota es el ejemplo
     * concreto. Ausente cuando el orden no enseña nada en este versículo.
     */
    readonly wordOrderNote?: string;
    /**
     * Relaciones entre palabras (aposición, concordancia…) — validadas
     * contra la morfología real. Permiten iluminar el par en pantalla en vez
     * de dejar el dato como prosa dentro de una sola palabra.
     */
    readonly relations?: readonly import('./rhetoricalStructure').WordRelation[];
    /**
     * Estructura retórica del versículo (quiasmo, inclusión, paralelismo),
     * SI la hay y si se sostiene. Es INTERPRETACIÓN y la UI la muestra como
     * propuesta — ver las salvaguardas en `rhetoricalStructure.ts`.
     */
    readonly rhetoric?: import('./rhetoricalStructure').RhetoricalStructure;
    /** Ausente en cachés anteriores al versionado. */
    readonly promptVersion?: number;
}
