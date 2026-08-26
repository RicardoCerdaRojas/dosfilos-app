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
    /** Traducción contextual de la palabra. */
    readonly translation: string;
}

export interface GreekVerseInsight {
    /** "JAS 1:2" — la clave del caché. */
    readonly reference: string;
    /** Traducción literal: calca el orden y la sintaxis del griego. */
    readonly literalTranslation: string;
    /** Traducción fluida: español natural. */
    readonly fluidTranslation: string;
    /** En el MISMO orden que los tokens del versículo. */
    readonly words: readonly GreekWordInsight[];
}
