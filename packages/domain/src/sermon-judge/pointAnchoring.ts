/**
 * Redacción v2 Fase 3 / Ola 6.2a (§6, regla estructural transversal SELLADA) —
 * la vara real de la estructura del sermón.
 *
 * LA VARA NO ES "Nº PUNTOS = Nº MOVIMIENTOS". Es COBERTURA + ANCLAJE:
 *
 *   - ESTUDIO = cobertura exegética total. El texto se estudia con TODOS sus
 *     movimientos, los que manda el género. Sin agrupación. Fidelidad = cobertura.
 *   - SERMÓN = libertad homilética. Sobre movimientos YA estudiados, el pastor
 *     organiza: puede fusionar movimientos afines o dividir uno profundo en
 *     varios puntos. Eso no es infidelidad, es oficio.
 *   - Lo que sí se confronta: un punto que no rastrea a ningún movimiento
 *     estudiado. Eso es G3 — el texto no gobernó ese punto, el predicador lo
 *     puso.
 *   - OMISIÓN: predicar menos movimientos de los estudiados es FIEL si es
 *     decisión consciente (foco, tiempo, propósito panorámico). La omisión
 *     CIEGA — saltarse un movimiento sin haberlo visto — se confronta.
 *   - TECHO DE PUNTOS = guía de carga homilética, NO límite exegético. Pasarse
 *     no es una violación: es una señal de carga.
 *
 * Por eso los hallazgos vienen separados en violación vs guía. Mezclarlos
 * convertiría el rango de puntos del catálogo en una regla de conteo, que es
 * justo lo que la regla transversal niega.
 */

import type { Severidad } from './complianceTypes';
import type { GenreSermonStructure } from './genreSermonStructure';

export interface PuntoDelBosquejo {
    id: string;
    /** Ids de los movimientos exegéticos estudiados que este punto cubre. */
    anclajes: readonly string[];
}

export interface AnchoringInput {
    puntos: readonly PuntoDelBosquejo[];
    /** Movimientos del análisis estructural del paso 3 (cobertura total). */
    movimientosEstudiados: readonly string[];
    /**
     * Movimientos que el pastor declaró omitir a conciencia. Convierte una
     * omisión de ciega en deliberada — la diferencia entre las dos es todo el
     * juicio, y solo el pastor puede declararla.
     */
    omisionesDeclaradas?: readonly string[];
    /** `null` cuando el género no tiene estructura derivable (centinela). */
    estructura: GenreSermonStructure | null;
}

export type ClaseHallazgo =
    | 'punto-sin-anclaje'
    | 'anclaje-fantasma'
    | 'omision-ciega'
    | 'sobre-techo'
    | 'bajo-piso'
    | 'multiplicacion-en-parabola';

export interface HallazgoDeAnclaje {
    clase: ClaseHallazgo;
    /** `false` ⇒ es GUÍA de carga homilética, no infidelidad. */
    esViolacion: boolean;
    /** Solo en violaciones. Gobierna el estado del veredicto igual que en el juez. */
    severidad?: Severidad;
    /** Punto o movimiento señalado. */
    referencia: string;
    mensaje: string;
    /** El global que esto especializa, cuando aplica. */
    refina?: string;
}

export interface ReporteDeAnclaje {
    hallazgos: readonly HallazgoDeAnclaje[];
    cobertura: {
        estudiados: number;
        cubiertos: number;
        omitidosDeclarados: number;
        omitidosCiegos: number;
    };
    /** Sin violaciones. Puede haber guías y seguir siendo fiel. */
    fiel: boolean;
}

export function evaluatePointAnchoring(input: AnchoringInput): ReporteDeAnclaje {
    const { puntos, movimientosEstudiados, estructura } = input;
    const declaradas = new Set(input.omisionesDeclaradas ?? []);
    const estudiados = new Set(movimientosEstudiados);
    const hallazgos: HallazgoDeAnclaje[] = [];

    const cubiertos = new Set<string>();

    for (const p of puntos) {
        if (p.anclajes.length === 0) {
            hallazgos.push({
                clase: 'punto-sin-anclaje',
                esViolacion: true,
                // Un punto que no rastrea a nada estudiado es el texto NO
                // gobernando el contenido. Es G3 en miniatura, y G3 es crítica.
                severidad: 'critica',
                refina: 'G3',
                referencia: p.id,
                mensaje: 'Este punto no rastrea a ningún movimiento del texto estudiado: lo puso el predicador, no el pasaje.',
            });
            continue;
        }
        for (const a of p.anclajes) {
            if (!estudiados.has(a)) {
                // Anclaje a un movimiento que el estudio no cubrió: el punto
                // dice apoyarse en algo que no existe en el análisis. Es más
                // grave que no anclar, porque APARENTA cobertura.
                hallazgos.push({
                    clase: 'anclaje-fantasma',
                    esViolacion: true,
                    severidad: 'critica',
                    refina: 'G3',
                    referencia: `${p.id}→${a}`,
                    mensaje: 'El punto ancla a un movimiento que no está en el análisis estructural: aparenta cobertura que el estudio no tiene.',
                });
                continue;
            }
            cubiertos.add(a);
        }
    }

    let omitidosCiegos = 0;
    let omitidosDeclarados = 0;
    for (const m of movimientosEstudiados) {
        if (cubiertos.has(m)) continue;
        if (declaradas.has(m)) {
            omitidosDeclarados++;
            continue;
        }
        omitidosCiegos++;
        hallazgos.push({
            clase: 'omision-ciega',
            esViolacion: true,
            // Se CONFRONTA, no se bloquea, y no es crítica: el pastor pudo
            // tener razones y solo faltó declararlas. Declararla la vuelve
            // fiel — la omisión consciente es libertad homilética.
            severidad: 'estandar',
            referencia: m,
            mensaje: 'Movimiento estudiado que ningún punto cubre y que no fue declarado como omisión consciente.',
        });
    }

    if (estructura) {
        const n = puntos.length;
        if (n > estructura.puntos.max) {
            hallazgos.push({
                clase: 'sobre-techo',
                // GUÍA, no violación: el techo es carga homilética, no límite
                // exegético. Marcarlo como falla convertiría el rango en una
                // regla de conteo, que la regla transversal niega.
                esViolacion: false,
                referencia: `${n} puntos`,
                mensaje: `El género sugiere hasta ${estructura.puntos.max} puntos (${estructura.puntos.razon}). Con ${n}, revisa la carga del sermón — no es infidelidad, es peso.`,
            });
        }
        if (n > 0 && n < estructura.puntos.min) {
            hallazgos.push({
                clase: 'bajo-piso',
                esViolacion: false,
                referencia: `${n} puntos`,
                mensaje: `El género suele rendir al menos ${estructura.puntos.min} puntos (${estructura.puntos.razon}). Con ${n}, revisa si el texto quedó cubierto.`,
            });
        }
        if (estructura.confrontaMultiplicacion && n > 1) {
            hallazgos.push({
                clase: 'multiplicacion-en-parabola',
                // El único género donde el sistema RESISTE la multiplicación en
                // vez de proponerla. Confronta —pregunta— no descalifica: el
                // pastor puede tener una razón y la decisión sigue siendo suya.
                esViolacion: false,
                referencia: `${n} puntos`,
                mensaje: 'La parábola enseña por un punto mayor de comparación: ¿tus puntos no fragmentan la única verdad?',
            });
        }
    }

    return {
        hallazgos,
        cobertura: {
            estudiados: estudiados.size,
            cubiertos: cubiertos.size,
            omitidosDeclarados,
            omitidosCiegos,
        },
        fiel: !hallazgos.some(h => h.esViolacion),
    };
}
