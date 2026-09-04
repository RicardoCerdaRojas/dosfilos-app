/**
 * El desfase entre la hoja del archivo y la página impresa de un recurso.
 *
 * Las citas de un análisis llevan el número de HOJA: `anchorFor` rotula
 * `p. ${chunk.sheet}` sobre el fragmento recuperado y el modelo cita esa
 * ancla. Para el trabajo interno está bien —el visor navega por hoja—
 * pero el entregable lo lee un profesor con el libro de papel delante, y
 * ahí el número que vale es el impreso.
 *
 * Medido sobre una biblioteca real de ocho obras: dos coinciden, tres
 * tienen desfase (−2, −4 y −40) y tres no lo declaran de forma
 * detectable. Citar la hoja como si fuera página impresa mandaba al
 * profesor cuarenta páginas más allá en el peor caso.
 *
 * `null` significa «no se pudo medir», y es una respuesta legítima: hay
 * documentos cuyo OCR perdió el folio y otros que numeran las
 * preliminares aparte. Quien reciba `null` debe rotular el número como
 * hoja y decirlo, nunca convertir a ciegas.
 */
export interface IPrintedPageOffsetReader {
    /** `impresa = hoja + offset`. `null` cuando no hay evidencia. */
    offsetFor(resourceId: string): Promise<number | null>;
}
