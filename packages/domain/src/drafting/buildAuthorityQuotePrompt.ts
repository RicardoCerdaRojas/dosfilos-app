/** Un fragmento real de la biblioteca del pastor, con su atribución. */
export interface QuotableSource {
    excerpt: string;
    title: string;
    author?: string;
    page?: string;
}

export interface AuthorityQuoteInput {
    /** Fragmentos recuperados de SU biblioteca. Sin esto no se pide nada. */
    sources: readonly QuotableSource[];
    passage: string;
    /** La proposición del punto: la cita tiene que respaldar ESO. */
    pointProposition?: string;
    /** Título del punto, verbatim. */
    pointTitle?: string;
}

/**
 * Propone citas de autoridad SELECCIONÁNDOLAS de la biblioteca del pastor.
 *
 * ES UN SELECTOR, NO UN GENERADOR, y la diferencia es la razón de que este
 * módulo exista aparte del proponedor de elementos. Pedirle a un modelo "una
 * cita de autoridad" sin material es el mecanismo por el que se fabrica una
 * falsa — no es que alucine: se le pidió. Ya pasó en este proyecto con el
 * regenerador de puntos, que listaba la cita como obligatoria.
 *
 * Acá el modelo no escribe la cita: la ELIGE de fragmentos reales que se le
 * entregan, copiada palabra por palabra, y con la atribución que venía con el
 * fragmento. Si ninguno sirve, devuelve la lista vacía — y eso es una respuesta
 * correcta, no un fracaso.
 *
 * Sin fuentes NO SE LLAMA AL MODELO. Quien invoca esto debe comprobarlo antes:
 * un prompt con la lista vacía es exactamente la petición que fabrica.
 */
export function buildAuthorityQuotePrompt(input: AuthorityQuoteInput): string {
    const fuentes = input.sources
        .map((s, i) => {
            const atribucion = [s.author, s.title, s.page && `p. ${s.page}`].filter(Boolean).join(', ');
            return `[${i + 1}] ${atribucion}\n"${s.excerpt.trim()}"`;
        })
        .join('\n\n');

    return `Eres el bibliotecario de un pastor que prepara un sermón. NO escribes citas: BUSCAS entre las suyas.

PASAJE: ${input.passage}
${input.pointTitle ? `PUNTO: "${input.pointTitle}"\n` : ''}${input.pointProposition ? `LO QUE ESTE PUNTO AFIRMA:\n"${input.pointProposition}"\n` : ''}
FRAGMENTOS DE SU BIBLIOTECA:

${fuentes}

TAREA: elige los fragmentos que RESPALDEN lo que este punto afirma, y devuélvelos
como citas listas para el púlpito.

REGLAS — LA PRIMERA ES LA QUE IMPORTA:

1. **SÓLO DE LOS FRAGMENTOS DE ARRIBA, COPIADOS PALABRA POR PALABRA.** No
   escribas una cita nueva, no combines dos fragmentos, no "mejores" la
   redacción de uno. Una cita inventada y atribuida a un autor real destruye la
   credibilidad del predicador en el púlpito, y ese daño no se repara.

2. **SI NINGUNO RESPALDA EL PUNTO, DEVUELVE LA LISTA VACÍA.** Es una respuesta
   correcta. El pastor prefiere no citar a citar algo que no viene al caso —
   forzar una cita para llenar el hueco es cómo aparece una falsa.

3. **NO ESCRIBAS LA ATRIBUCIÓN.** Devuelve el NÚMERO del fragmento que usaste
   y nosotros ponemos autor, obra y página desde nuestros datos. Si la
   escribieras tú, un olvido dejaría una cita anónima en el púlpito y un
   descuido la atribuiría a quien no la dijo.

4. Puedes RECORTAR un fragmento para quedarte con la parte que respalda —
   marcando el corte con […]— pero no cambiar una sola palabra de lo que quede.

FORMATO DE SALIDA (JSON, sin texto alrededor):
{
  "elements": [
    {
      "sourceIndex": 1,
      "text": "La cita, copiada literal del fragmento [1].",
      "why": "Qué afirmación del punto respalda, en una línea."
    }
  ]
}`;
}
