/**
 * VIVE APARTE DEL COMPONENTE porque es una función pura.
 *
 * Estaba dentro de `SectionCard` y su test importaba el componente entero para
 * probarla: al agregarle una dependencia nueva al componente, el test se rompió
 * arrastrando el grafo de módulos —y el fallo no tenía nada que ver con lo que
 * el test verifica.
 */
/**
 * Strip a redundant leading field label from a value. The LLM occasionally
 * repeats the section label inside the field value (e.g. an `authorityQuote`
 * that begins with "**Cita de Autoridad:**"), which would render the label
 * twice. Removes a single leading occurrence (with optional `**` / `:`).
 */
export function stripLeadingFieldLabel(value: string, label: string): string {
  if (!value || !label) return value;
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sinEtiqueta = value.replace(
    new RegExp(`^\\s*(\\*{0,2})\\s*${esc}\\s*:?\\s*(\\*{0,2})\\s*\\n*`, 'i'),
    (_m, abre: string, cierra: string) => (abre && !cierra ? '\u0000' : ''),
  );
  // MARCADOR HUÉRFANO.
  //
  // El modelo suele meter etiqueta y título en UNA sola negrita:
  // `**Ilustración: El Mensajero Real**`. Al quitar la etiqueta se va también
  // el `**` de apertura y queda el de cierre solo, que se renderiza literal:
  // el pastor veía "El Mensajero Real**" en su sermón.
  //
  // El centinela marca que se consumió una apertura sin su cierre; entonces se
  // quita el `**` final que quedó suelto. Es defensa en profundidad: el prompt
  // ya no pide la etiqueta, pero el modelo puede volver a agregarla y esto no
  // puede llegar a pantalla.
  if (sinEtiqueta.startsWith('\u0000')) {
    // El huérfano cierra la PRIMERA LÍNEA, no el texto: el título va solo en su
    // renglón y el desarrollo viene después. Anclar al final del string dejaría
    // el marcador intacto.
    const resto = sinEtiqueta.slice(1);
    const corte = resto.indexOf('\n');
    const primera = corte === -1 ? resto : resto.slice(0, corte);
    const cola = corte === -1 ? '' : resto.slice(corte);
    return primera.replace(/\*{1,2}\s*$/, '') + cola;
  }
  return sinEtiqueta;
}
