/**
 * Trunca a BYTES sin partir un carácter por la mitad.
 *
 * Firestore topa cada documento en 1.048.576 bytes. `substring(0, N)`
 * cuenta CARACTERES: seguro en ASCII, catastrófico en griego o hebreo,
 * donde un carácter son dos bytes en UTF-8. 900.000 caracteres de
 * griego pesan ~1,8 MB y Firestore rechaza la escritura entera con
 * INVALID_ARGUMENT — para NTG28 eso mataba la extracción completa.
 *
 * Vive en su propio módulo porque la trampa ya se pagó dos veces: el
 * trigger de extracción la corrigió y el callable de reproceso quedó
 * con el `substring` original. Una función compartida es la única
 * forma de que el arreglo valga para los dos.
 */
export function truncateUtf8(text: string, maxBytes: number): string {
    if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text;
    let bytes = 0;
    let result = '';
    for (const char of text) {  // for-of recorre puntos de código, no unidades UTF-16
        const charBytes = Buffer.byteLength(char, 'utf8');
        if (bytes + charBytes > maxBytes) break;
        bytes += charBytes;
        result += char;
    }
    return result;
}
