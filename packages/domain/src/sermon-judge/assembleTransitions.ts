import type { HomileticalAnalysis, SermonContent } from '../entities/SermonGenerator';

/**
 * Reconstruye el cierre de cada transición con datos VERBATIM, no generados.
 *
 * EL FALLO QUE ARREGLA, visto en producción (Jonás 1:1-3): el formato del prompt
 * decía `[Proposición, tal cual, como frase]`. Un corchete es una invitación a
 * ESCRIBIR, no a copiar — y el modelo produjo "El Dios que se revela a todas las
 * naciones y la rebeldía de su profeta": un título inventado en el lugar donde
 * debía ir, palabra por palabra, la proposición que el pastor aprobó.
 *
 * Endurecer la instrucción no alcanza. La proposición y los títulos de los
 * puntos son DATOS QUE YA TENEMOS: pedírselos al modelo es darle la oportunidad
 * de reformularlos, y eventualmente la toma. Lo calculable se calcula.
 *
 * QUÉ SE CONSERVA DEL MODELO: la frase de transición, que sí es trabajo suyo —
 * el puente retórico entre un punto y el siguiente. Es el primer bloque, hasta
 * la primera línea en blanco. Todo lo que venga después se descarta y se
 * reemplaza por el recordatorio armado desde el bosquejo.
 *
 * TODOS LOS PUNTOS LO LLEVAN, el último incluido. Se excluía razonando que
 * después de él viene la conclusión y no otro movimiento — y el fundador lo
 * corrigió sobre su propio sermón: él hace la transición siempre, y el punto
 * final quedaba sin nada donde los demás sí tenían.
 *
 * Recoger la tesis antes de la conclusión no es ruido: es el movimiento con el
 * que un predicador cierra el cuerpo. Si además le resulta redundante con la
 * recapitulación, eso lo decide él borrando una de las dos.
 */
export function assembleTransitions(
    content: SermonContent,
    homiletics: HomileticalAnalysis,
): SermonContent {
    const puntos = (homiletics.outline?.mainPoints ?? [])
        .map((p) => p.title?.trim())
        .filter((t): t is string => Boolean(t));
    const proposicion = homiletics.homileticalProposition?.trim();
    if (!content.body?.length || puntos.length === 0 || !proposicion) return content;

    const recordatorio = buildTransitionReminder(proposicion, puntos);

    const body = content.body.map((punto) => {
        const frase = leadIn(punto.transition);
        return { ...punto, transition: frase ? `${frase}\n\n${recordatorio}` : recordatorio };
    });

    return { ...content, body };
}

/**
 * El puente retórico que escribió el modelo: el primer bloque, sin rótulos.
 *
 * Se limpian los rótulos que el modelo pueda anteponer ("Transición:",
 * "**Recordatorio:**") porque la tarjeta ya rotula el campo, y tres etiquetas
 * para un mismo bloque lo vuelven ilegible de un vistazo.
 */
function leadIn(transition: string | undefined): string {
    if (!transition?.trim()) return '';
    const primerBloque = transition.split(/\n\s*\n/)[0] ?? '';
    return primerBloque
        .replace(/^\s*\*{0,2}\s*(?:Transici[oó]n|Recordatorio)\s*:?\s*\*{0,2}\s*/i, '')
        .trim();
}


/**
 * El recordatorio que cierra cada transición: proposición + puntos, verbatim.
 *
 * EXPORTADO para que el taller pueda MOSTRARLE al pastor lo que la transición
 * va a decir. Marcarla como resuelta sin enseñarle el texto cambia un pendiente
 * falso por un "listo" mudo: el check afirma que está hecho y él no tiene cómo
 * verificarlo ni cómo cambiarlo.
 *
 * Se calcula en un solo lugar porque es lo mismo que se ensambla: dos copias de
 * este formato divergirían y el taller mostraría algo distinto de lo que el
 * sermón termina diciendo.
 */
export function buildTransitionReminder(proposition: string, pointTitles: readonly string[]): string {
    return [
        proposition,
        `**Puntos:**\n${pointTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    ].join('\n\n');
}
