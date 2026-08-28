/** Cita en el formato de markdown que ya usa el sermón, para copiar. */
export function formatPassageForSermon(
    bookName: string,
    chapter: number,
    verses: { verse: number; text: string }[],
): string {
    if (!verses.length) return '';
    const first = verses[0].verse;
    const last = verses[verses.length - 1].verse;
    const ref = first === last ? `${bookName} ${chapter}:${first}` : `${bookName} ${chapter}:${first}-${last}`;
    // Cita de bloque: en el púlpito se colapsa a una marca al margen, que es
    // exactamente lo que corresponde a un pasaje citado.
    const body = verses.map((v) => v.text).join(' ');
    return `> **${ref}** ${body}\n`;
}
