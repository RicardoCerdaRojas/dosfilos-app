import { tallyProvenance, type SermonElement } from './SermonElement';

/**
 * La forma de la autoría A NIVEL DE SERMÓN COMPLETO.
 *
 * `sin-medir` NO ES UNA QUINTA GRADACIÓN: es la ausencia de la pregunta.
 *
 * Un sermón anterior al taller no tiene decisiones registradas porque el
 * registro no existía, no porque el pastor no aportara ideas. Si cayera en
 * `seleccionada` —el estado más bajo—, la aplicación le diría a un pastor con
 * noventa sermones propios que ninguna idea es suya. Sería una acusación falsa,
 * y la haría precisamente contra el usuario con más historia.
 *
 * LA AUSENCIA DE DATO NO ES EVIDENCIA DE CERO. Es la misma regla que gobierna
 * `assembledFrom` en el borrador: cuando no hay registro, no se dice nada.
 *
 * NO SE PUNTÚA, SE DESCRIBE, y tampoco es cosmética la decisión. El número es un
 * NIVEL, y el nivel de un sermón aislado no significa nada: un pastor que
 * empieza selecciona mucho, y seleccionar es el mecanismo por el que se forma.
 * Lo que significa algo es la TRAYECTORIA a través de muchos sermones — y eso
 * requiere historia, no un sermón.
 */
export type SermonAuthorshipShape = 'sin-medir' | 'vacia' | 'propia' | 'mixta' | 'seleccionada';

/**
 * Describe la autoría de un sermón a partir de sus decisiones por sección.
 *
 * `undefined` → `sin-medir`. El mapa ausente es un sermón de antes del taller.
 *
 * UN MAPA VACÍO TAMBIÉN ES `sin-medir`. El pastor que abre el taller y sale sin
 * decidir nada no ha producido una medición de cero: no ha producido ninguna.
 * Distinguirlos sólo serviría para tener dos maneras de no decir nada.
 */
export function describeSermonAuthorship(
    sectionElements: Record<string, SermonElement[]> | undefined,
): SermonAuthorshipShape {
    if (!sectionElements) return 'sin-medir';

    const todos = Object.values(sectionElements).flat();
    if (todos.length === 0) return 'sin-medir';

    const t = tallyProvenance(todos);
    // Sin ideas que hayan quedado en el sermón no hay autoría que describir,
    // aunque haya habido decisiones: descartar todo es trabajo, no aporte.
    if (t.inSermon === 0) return 'vacia';

    const suyos = t.pastor + t.editado;
    if (suyos === 0) return 'seleccionada';
    if (suyos === t.inSermon) return 'propia';
    return 'mixta';
}

/**
 * Lo que queda GRABADO en el sermón publicado sobre cómo se armó.
 *
 * Hace falta un snapshot —y no leer las decisiones en vivo— por una razón dura:
 * la copia publicada NO lleva `wizardProgress`. Sin esto, cualquier pantalla que
 * describiera la autoría de un sermón publicado diría `sin-medir` para TODOS,
 * incluido el que se armó entero en el taller. La trampa de la ausencia de dato,
 * otra vez, por un camino distinto.
 *
 * SE GUARDAN LOS CONTEOS CRUDOS, no sólo la forma. La forma responde por este
 * sermón; los conteos son lo que permitirá leer la TRAYECTORIA cuando haya
 * varios — y esa lectura es la única que significa algo. Guardar sólo la
 * etiqueta obligaría a rehacer la medición sobre datos que ya no existen.
 */
export interface SermonAuthorshipSnapshot {
    capturedAt: Date;
    shape: SermonAuthorshipShape;
    /** Ideas que el pastor originó. */
    pastor: number;
    /** Ideas propuestas que aceptó tal cual. */
    elegido: number;
    /** Ideas propuestas que reescribió — cuentan como suyas. */
    editado: number;
    /** Ideas que quedaron en el sermón (todo menos lo descartado). */
    inSermon: number;
    /** Secciones con al menos una decisión. Da escala al resto. */
    sectionsDecided: number;
}

/**
 * Captura el snapshot al publicar. Devuelve `undefined` para un sermón sin
 * decisiones registradas: NO se graba una medición en cero, porque grabarla
 * convertiría "no se midió" en "se midió y dio cero" — que es exactamente la
 * confusión que este módulo existe para impedir.
 */
export function buildSermonAuthorshipSnapshot(
    sectionElements: Record<string, SermonElement[]> | undefined,
    capturedAt: Date = new Date(),
): SermonAuthorshipSnapshot | undefined {
    const shape = describeSermonAuthorship(sectionElements);
    if (shape === 'sin-medir') return undefined;

    const secciones = Object.values(sectionElements ?? {});
    const t = tallyProvenance(secciones.flat());
    return {
        capturedAt,
        shape,
        pastor: t.pastor,
        elegido: t.elegido,
        editado: t.editado,
        inSermon: t.inSermon,
        sectionsDecided: secciones.filter((els) => els.some((e) => e.provenance !== 'descartado')).length,
    };
}
