/**
 * Redacción v2 Fase 2 (§8.3, §8.4, §9.6) — el veredicto del juez a partir de las
 * adjudicaciones, determinista y puro.
 *
 * EL JUEZ CONFRONTA, NO BLOQUEA (§4.6, §8.3). Ningún estado impide publicar: el
 * pastor es el predicador. Lo que cambia es qué le debe el sistema — nada, una
 * advertencia registrada, o un reconocimiento activo ("vi esto y decido
 * proceder") que no se puede pasar de largo.
 *
 * SHADOW PRIMERO (§8.5): esto arranca midiendo, no confrontando. La
 * confrontación visible se activa cuando los datos muestren que adjudica bien.
 */

import type { JudgeRubric, DescalificadorEnVara } from './composeJudgeRubric';

/** Adjudicación de un criterio de cumplimiento. */
export type AdjudicacionCriterio = 'yes' | 'unclear' | 'no';

/** Adjudicación de un descalificador. `unclear` va a cola, no infla la tasa. */
export type AdjudicacionDescalificador = 'disparado' | 'no-disparado' | 'unclear';

export interface Adjudicaciones {
    /** Por `id` de criterio (C1, C2…). Ausente ⇒ se trata como `unclear`. */
    criterios: Readonly<Record<string, AdjudicacionCriterio>>;
    /** Por `claveVara` (`global:G4`, `forma:E1`, `genero:D2`). Ausente ⇒ `unclear`. */
    descalificadores: Readonly<Record<string, AdjudicacionDescalificador>>;
}

/** §8.3 — los tres estados. */
export type EstadoVeredicto = 'limpio' | 'advertencia' | 'confrontacion-fuerte';

export interface Veredicto {
    estado: EstadoVeredicto;
    /**
     * §9.6 — TODOS los esenciales en `yes` + MAYORÍA de los esperados en `yes` +
     * CERO descalificadores disparados.
     */
    cumple: boolean;
    /**
     * `true` cuando la vara no alcanzó para decidir (hubo `unclear` en algo
     * portante). SEPARADO de `cumple: false` a propósito: un indeterminado NO es
     * un incumplimiento, y contarlo como tal inflaría la tasa de falla — la
     * disciplina que §8.4 pide explícitamente.
     */
    indeterminado: boolean;
    /** Disparados, con su severidad ya resuelta. Ordenados: críticos primero. */
    disparados: readonly DescalificadorEnVara[];
    /** Todo lo que quedó en `unclear` → cola de revisión. */
    colaDeRevision: readonly string[];
    esenciales: { total: number; enYes: number; faltantes: readonly string[] };
    esperados: { adjudicados: number; enYes: number; mayoria: boolean };
}

export function evaluateCompliance(
    rubric: JudgeRubric,
    adj: Adjudicaciones,
): Veredicto {
    const colaDeRevision: string[] = [];

    // ── Criterios ────────────────────────────────────────────────────────────
    const esenciales = rubric.criterios.filter(c => c.severidad === 'esencial');
    const esperados = rubric.criterios.filter(c => c.severidad === 'esperado');

    const esencialesFaltantes: string[] = [];
    let esencialesEnYes = 0;
    let esencialIndeterminado = false;
    for (const c of esenciales) {
        const v = adj.criterios[c.id] ?? 'unclear';
        if (v === 'yes') esencialesEnYes++;
        else if (v === 'no') esencialesFaltantes.push(c.id);
        else {
            // Un esencial que no se pudo adjudicar NO se cuenta como violado
            // (no infla la tasa) pero tampoco como cumplido: el resultado es
            // indeterminado, y eso es información distinta de "falló".
            esencialIndeterminado = true;
            colaDeRevision.push(`criterio:${c.id}`);
        }
    }

    // Los `unclear` salen del numerador Y del denominador: no cuentan como
    // cumplido ni como violación (§8.4). Con todos en unclear el denominador
    // queda en 0 y la mayoría es vacuamente cierta — el estado igual será
    // `advertencia` por la presencia de unclear, así que no se cuela nada.
    let esperadosAdjudicados = 0;
    let esperadosEnYes = 0;
    for (const c of esperados) {
        const v = adj.criterios[c.id] ?? 'unclear';
        if (v === 'unclear') {
            colaDeRevision.push(`criterio:${c.id}`);
            continue;
        }
        esperadosAdjudicados++;
        if (v === 'yes') esperadosEnYes++;
    }
    const mayoriaEsperados = esperadosEnYes * 2 > esperadosAdjudicados;

    // ── Descalificadores ─────────────────────────────────────────────────────
    const disparados: DescalificadorEnVara[] = [];
    for (const d of rubric.descalificadores) {
        const v = adj.descalificadores[d.claveVara] ?? 'unclear';
        if (v === 'disparado') disparados.push(d);
        else if (v === 'unclear') colaDeRevision.push(`descalificador:${d.claveVara}`);
    }
    disparados.sort((a, b) => {
        const peso = (x: DescalificadorEnVara) => (x.resuelto.severidad === 'critica' ? 0 : 1);
        return peso(a) - peso(b);
    });

    const hayCritico = disparados.some(d => d.resuelto.severidad === 'critica');
    const hayEstandar = disparados.some(d => d.resuelto.severidad === 'estandar');
    const hayUnclear = colaDeRevision.length > 0;

    const cumple =
        esencialesFaltantes.length === 0 &&
        !esencialIndeterminado &&
        mayoriaEsperados &&
        disparados.length === 0;

    // ── Veredicto (§8.3) ─────────────────────────────────────────────────────
    // La severidad es lo único que mueve el estado (§8.4). El `tipo`
    // (contenido/tratamiento) es diagnóstico y NO pesa acá a propósito.
    //
    // `limpio` EXIGE `cumple`. Sin esa condición, un sermón que falla el único
    // esencial sellado —C4 narrativo, la trayectoria a Cristo— salía "limpio"
    // mientras ningún descalificador disparara: §9.6 dice que su ausencia
    // descalifica aunque C1-C3 pasen, y sin ella es drama moral, no sermón
    // cristiano. Un estado que contradice a `cumple` no es un matiz: es el juez
    // callándose en el único caso que el fundador selló como innegociable.
    //
    // Un esencial fallado se queda en `advertencia` y NO escala a confrontación
    // fuerte: §8.3 reserva el reconocimiento activo para descalificadores de
    // severidad crítica. Si el fundador quiere que un esencial fallado escale,
    // es decisión suya que se sella en el catálogo, no un default que inventa
    // este motor.
    let estado: EstadoVeredicto;
    if (hayCritico) estado = 'confrontacion-fuerte';
    else if (hayEstandar || hayUnclear || !cumple) estado = 'advertencia';
    else estado = 'limpio';

    return {
        estado,
        cumple,
        indeterminado: esencialIndeterminado || hayUnclear,
        disparados,
        colaDeRevision,
        esenciales: { total: esenciales.length, enYes: esencialesEnYes, faltantes: esencialesFaltantes },
        esperados: { adjudicados: esperadosAdjudicados, enYes: esperadosEnYes, mayoria: mayoriaEsperados },
    };
}
