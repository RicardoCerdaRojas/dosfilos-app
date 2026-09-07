import {
    parsePassageReference,
    passageToOriginal,
    type SyntacticUnit,
} from '@dosfilos/domain';

/**
 * Recalcula las fronteras estructurales de una perícopa a partir del pasaje
 * que el pastor escribió.
 *
 * Por qué existe: el diálogo de detalles del sermón cambiaba SÓLO la cadena
 * `passage` y dejaba intacto el `syntacticUnit`, que es el que guarda las
 * fronteras en coordenadas del texto original y del que sale el encuadre del
 * paper. La perícopa decía una cosa y su registro otra, y nadie se enteraba.
 *
 * El editor que sí mantenía la coherencia —el popover de frontera— vive en el
 * asistente expositivo, por el que sólo se pasa al CREAR el plan. Una vez
 * creada la serie, el único editor disponible era el incompleto. Dos editores
 * del mismo dato y sólo uno correcto.
 *
 * Dos reglas:
 *
 * 1. **Lo que el pastor escribe está en la numeración de SU Biblia**, así que
 *    se traduce a la del original antes de guardar. Escribir «Jonás 1:17»
 *    pensando en el pez tiene que quedar guardado como el 2:1 del Masorético.
 *
 * 2. **Ante la duda, no se toca.** Si el texto no se puede interpretar como
 *    referencia, se devuelve la unidad tal como estaba. Una etiqueta libre
 *    —«Jonás 2 (segunda mitad)»— es una edición legítima, y perder las
 *    fronteras por no saber leerla sería peor que no actualizarlas.
 */
export function syncSyntacticUnit(
    actual: SyntacticUnit | undefined,
    textoDelPasaje: string,
): SyntacticUnit | undefined {
    const parsed = parsePassageReference(textoDelPasaje);
    if (!parsed.ok || parsed.ref.verseStart === null || parsed.ref.verseEnd === null) {
        return actual;
    }
    const enOriginal = passageToOriginal(parsed.ref).passage;
    return {
        ...actual,
        book: actual?.book ?? (parsed.book.nameEs || parsed.ref.bookId),
        chapterStart: enOriginal.chapterStart,
        verseStart: enOriginal.verseStart ?? parsed.ref.verseStart,
        chapterEnd: enOriginal.chapterEnd,
        verseEnd: enOriginal.verseEnd ?? parsed.ref.verseEnd,
    };
}
