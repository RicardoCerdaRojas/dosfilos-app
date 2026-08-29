import type { SermonAnnotationAnchor } from './SermonAnnotation';

/**
 * Nota de tinta: lo que el predicador escribe a mano sobre su sermón.
 *
 * EL PROBLEMA QUE RESUELVE EL ANCLAJE. La tinta es espacial y el texto es
 * lineal. Guardar los trazos en coordenadas de pantalla los rompe apenas
 * cambia el cuerpo, se prende la colometría o se repagina — y anclarlos al
 * MOVIMIENTO tampoco alcanza: un movimiento son varias pantallas, así que al
 * achicar la letra la nota queda a la altura de otra cosa y pierde su
 * referencia. Fue la objeción del fundador y es correcta.
 *
 * LA SOLUCIÓN. Cada nota lleva un ancla de TEXTO —la misma que usan las
 * marcas: `(sectionSlug, offset)` con el texto exacto y su contexto— y sus
 * trazos se guardan en coordenadas RELATIVAS a esa ancla, medidas en unidades
 * del cuerpo. Al dibujar se busca dónde cayó esa palabra ahora y se pinta la
 * nota ahí.
 *
 * Consecuencias, todas deseadas: cambiar el cuerpo mueve la nota con su
 * pasaje y la escala; prender colometría la sigue; editar el sermón en la web
 * la reancla igual que a un resaltado.
 *
 * Y hace que margen y sobre-el-texto dejen de ser dos sistemas: una nota cuyos
 * trazos caen a la derecha de la caja de medida está al margen; una cuyos
 * trazos caen encima, está sobre el texto. Mismo anclaje para las dos.
 *
 * LÍMITE CONOCIDO: un trazo que encierra varias palabras conserva su forma,
 * no se re-envuelve. Si cambia el corte de renglón, el círculo sigue en el
 * lugar correcto pero puede no encerrarlas con precisión. Degrada — nunca
 * apunta a otro párrafo.
 */

/** Un punto del trazo, en unidades del cuerpo relativas al ancla. */
export interface InkPoint {
    x: number;
    y: number;
}

export interface InkStroke {
    points: InkPoint[];
    /** Grosor en unidades del cuerpo, para que escale con el texto. */
    width: number;
    color: InkColor;
}

export const INK_COLORS = ['ink', 'red', 'blue'] as const;
export type InkColor = (typeof INK_COLORS)[number];

export interface InkNote extends SermonAnnotationAnchor {
    id: string;
    type: 'ink';
    strokes: InkStroke[];
    createdAt: Date;
    updatedAt: Date;
    updatedBy: 'mobile' | 'web';
}

/**
 * Pasa un trazo de coordenadas de PANTALLA a coordenadas de la nota.
 *
 * `originX/originY` es dónde está el ancla ahora; `bodySize` es el cuerpo con
 * el que se dibujó. Dividir por el cuerpo es lo que hace que la nota escale
 * cuando el pastor cambia el tamaño del texto — sin eso, achicar la letra
 * dejaría un garabato gigante sobre un párrafo chico.
 */
export function toNoteSpace(
    point: { x: number; y: number },
    origin: { x: number; y: number },
    bodySize: number,
): InkPoint {
    const size = bodySize > 0 ? bodySize : 1;
    return { x: (point.x - origin.x) / size, y: (point.y - origin.y) / size };
}

/** La inversa: de coordenadas de la nota a pantalla, para dibujarla. */
export function toScreenSpace(
    point: InkPoint,
    origin: { x: number; y: number },
    bodySize: number,
): { x: number; y: number } {
    return { x: origin.x + point.x * bodySize, y: origin.y + point.y * bodySize };
}
