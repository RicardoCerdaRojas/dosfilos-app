import type { ConduccionCorazonTrace, ElementoEstudio } from './types';

/**
 * Conducción del corazón (manifiesto v1.3 §3.2). Núcleo PURO: valida la FORMA de
 * las respuestas C1–C5 del docente y arma el elemento `aplicacion:corazon`. NO
 * valida fidelidad al texto — eso es el examen del corazón en la cristalización
 * (PR C). Y NO escribe la afección: el `contenido` es siempre lo que el docente
 * formuló (C5); el sistema solo condujo con preguntas y pistas.
 */

/** Respuestas crudas del docente a lo largo de C1–C5. */
export interface ConduccionCorazonRespuestas {
    /** C1 — proposición elegida (id de un elemento `idea_central` del estudio). */
    proposicionElementoId: string;
    /** C2 — qué buscaba mover el autor en el corazón de su audiencia original. */
    caraAfectiva: string;
    /** C3 — la verdad sobre Dios, revelada en el texto, de la que cuelga el afecto. */
    raizTeocentrica: string;
    /** C4 — cómo aterriza ese mismo afecto en la congregación de hoy. */
    puenteCongregacion: string;
    /** C5 — la afección en las palabras del docente; va a `contenido`. */
    afeccion: string;
}

/** Pasos de la conducción, en orden C1→C5. */
export type PasoCorazon =
    | 'proposicion'
    | 'caraAfectiva'
    | 'raizTeocentrica'
    | 'puenteCongregacion'
    | 'afeccion';

/**
 * Longitud mínima para que un paso de texto cuente como respondido (filtra
 * placeholders triviales; NO es un juicio de calidad — eso es el examen).
 */
export const CONDUCCION_CORAZON_MIN_CHARS = 12;

export interface ConduccionCorazonValidacion {
    valido: boolean;
    /** Pasos sin responder o demasiado cortos, en orden C1→C5. */
    faltantes: PasoCorazon[];
}

/** Valida que cada paso C1–C5 esté respondido (forma, no fidelidad). */
export function validarConduccionCorazon(r: ConduccionCorazonRespuestas): ConduccionCorazonValidacion {
    const faltantes: PasoCorazon[] = [];
    if (!r.proposicionElementoId.trim()) faltantes.push('proposicion');
    if (r.caraAfectiva.trim().length < CONDUCCION_CORAZON_MIN_CHARS) faltantes.push('caraAfectiva');
    if (r.raizTeocentrica.trim().length < CONDUCCION_CORAZON_MIN_CHARS) faltantes.push('raizTeocentrica');
    if (r.puenteCongregacion.trim().length < CONDUCCION_CORAZON_MIN_CHARS) faltantes.push('puenteCongregacion');
    if (r.afeccion.trim().length < CONDUCCION_CORAZON_MIN_CHARS) faltantes.push('afeccion');
    return { valido: faltantes.length === 0, faltantes };
}

/**
 * Arma los campos de un `aplicacion:corazon` desde respuestas YA validadas. La
 * afección (C5) es el `contenido`; el resto va a la traza `conduccionCorazon`.
 * NO asigna `id`/`orden` (eso es del store). Autoría siempre `docente`: el afecto
 * lo escribió el docente.
 */
export function construirAplicacionCorazon(
    r: ConduccionCorazonRespuestas,
): Pick<ElementoEstudio, 'tipo' | 'subtipo' | 'autoria' | 'contenido' | 'conduccionCorazon'> & {
    conduccionCorazon: ConduccionCorazonTrace;
} {
    return {
        tipo: 'aplicacion',
        subtipo: 'corazon',
        autoria: 'docente',
        contenido: r.afeccion.trim(),
        conduccionCorazon: {
            proposicionElementoId: r.proposicionElementoId,
            caraAfectiva: r.caraAfectiva.trim(),
            raizTeocentrica: r.raizTeocentrica.trim(),
            puenteCongregacion: r.puenteCongregacion.trim(),
        },
    };
}
