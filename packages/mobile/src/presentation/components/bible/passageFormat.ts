/**
 * Cita de un rango elegido a mano, que puede empezar y terminar a mitad de
 * versículo.
 *
 * El texto ya viene armado por quien selecciona: cuando el pastor elige media
 * frase, lo que hay que citar es esa media frase y no los versículos enteros
 * que la contienen. Antes se citaba el versículo completo porque era la única
 * unidad que la Biblia sabía seleccionar.
 */
export function formatSelectionForSermon(
    bookName: string,
    chapter: number,
    fromVerse: number,
    toVerse: number,
    text: string,
): string {
    if (!text.trim()) return '';
    const ref =
        fromVerse === toVerse
            ? `${bookName} ${chapter}:${fromVerse}`
            : `${bookName} ${chapter}:${fromVerse}-${toVerse}`;
    return `> **${ref}** ${text.trim()}\n`;
}
