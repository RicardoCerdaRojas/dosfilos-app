import { parsePassageReference } from '../bible/canon/passage-reference';

export interface CrossReferenceCheck {
    /** Referencias que repiten el libro que se está predicando. */
    mismoLibro: string[];
    /** Referencias que sí cruzan a otro libro del canon. */
    cruzan: string[];
    /** Referencias que no se pudieron leer — no se acusan, se informan. */
    ilegibles: string[];
    /** ¿Hay al menos `minimo` referencias que realmente crucen? */
    suficientes: boolean;
}

/**
 * Cuántas referencias de OTRO libro se esperan por punto.
 *
 * El fundador (2026-08-23): "las referencias cruzadas para mí son una manera de
 * argumentar que nuestro punto es consistente con el resto de las escrituras…
 * espero dos o tres citas de otros pasajes que respalden exegéticamente el
 * punto".
 */
export const CROSS_REF_MIN_OTHER_BOOKS = 2;

/**
 * ¿Estas referencias cruzan de verdad, o repiten el pasaje que se predica?
 *
 * POR QUÉ ES UN VALIDADOR Y NO SÓLO UNA LÍNEA DE PROMPT: esto es CALCULABLE.
 * `parsePassageReference` ya devuelve el `bookId`; compararlo con el libro del
 * sermón es aritmética, no criterio. Y a diferencia de una instrucción, un
 * validador no se erosiona cuando alguien reescribe el prompt.
 *
 * EL FALLO QUE ATRAPA, visto en producción (Jonás 1:1-3): de cuatro
 * "referencias cruzadas" del punto I, dos eran Jonás 1:1 y Jonás 1:2 — el
 * propio texto que se estaba exponiendo. Volver a citar el pasaje predicado no
 * es cruzar referencias, es repetir el texto; y no es capricho del modelo, el
 * prompt pedía "referencias relevantes" sin decir relevantes RESPECTO DE QUÉ, y
 * lo más relevante que tiene a mano es el pasaje mismo.
 *
 * Las ilegibles se informan aparte y NO cuentan como violación: una referencia
 * mal formateada es un problema distinto, y mezclarlos haría que el reporte
 * acuse al modelo de algo que no hizo.
 */
export function checkCrossReferences(
    refs: readonly string[],
    sermonPassage: string,
    minimo: number = CROSS_REF_MIN_OTHER_BOOKS,
): CrossReferenceCheck {
    const predicado = parsePassageReference(sermonPassage);
    const bookIdPredicado = predicado.ok ? predicado.ref.bookId : null;

    const mismoLibro: string[] = [];
    const cruzan: string[] = [];
    const ilegibles: string[] = [];

    for (const raw of refs) {
        const ref = extraerReferencia(raw);
        const parsed = parsePassageReference(ref);
        if (!parsed.ok) {
            ilegibles.push(raw);
            continue;
        }
        // Sin libro predicado legible no se puede comparar: se cuenta como que
        // cruza en vez de acusar. Acusar por no poder verificar es peor que no
        // acusar.
        if (bookIdPredicado && parsed.ref.bookId === bookIdPredicado) mismoLibro.push(raw);
        else cruzan.push(raw);
    }

    return { mismoLibro, cruzan, ilegibles, suficientes: cruzan.length >= minimo };
}

/**
 * Saca la referencia de una línea del borrador.
 *
 * El prompt pide las referencias como blockquote con el texto del versículo:
 * `> "En el principio era el Verbo" (Juan 1:1)`. La referencia real es lo que
 * está entre paréntesis al final; parsear la línea entera fallaría siempre
 * porque el texto bíblico va delante.
 */
function extraerReferencia(linea: string): string {
    const entreParentesis = linea.match(/\(([^()]+)\)\s*$/);
    if (entreParentesis?.[1]) return entreParentesis[1].trim();
    return linea.replace(/^[>\s"“]+/, '').replace(/["”]\s*$/, '').trim();
}
