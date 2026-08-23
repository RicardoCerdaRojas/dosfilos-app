import { parsePassageReference } from './passage-reference';

/**
 * ¿Este pasaje ABRE el libro?
 *
 * Verdadero sólo para un rango que empieza en el capítulo 1, versículo 1 (o sin
 * versículo, que es el capítulo entero). Es una pregunta CALCULABLE, y por eso
 * vive acá y no en un prompt: preguntarle al modelo "¿esto es la introducción
 * del libro?" invita a que lo decida por parecido, y se equivoca en los casos
 * raros — Salmos, cartas cortas, libros de un solo capítulo.
 *
 * PARA QUÉ SE USA: cuando un sermón abre un libro, la introducción tiene un
 * trabajo extra que no tiene en medio de una serie — orientar a la congregación
 * en el libro completo antes de entrar al texto. Fuera de ese caso, ese mismo
 * material es relleno que le roba minutos a la exposición.
 *
 * Deliberadamente ESTRICTO: ante una referencia que no se puede parsear
 * responde `false`. Un falso negativo cuesta un párrafo de orientación que no
 * se escribió; un falso positivo hace que un sermón de la mitad del libro
 * arranque presentándolo desde cero.
 */
export function opensBook(passage: string): boolean {
    const parsed = parsePassageReference(passage);
    if (!parsed.ok) return false;
    const { chapterStart, verseStart } = parsed.ref;
    if (chapterStart !== 1) return false;
    // `null` = capítulo completo ("Jonás 1"), que también abre el libro.
    return verseStart === null || verseStart === 1;
}
