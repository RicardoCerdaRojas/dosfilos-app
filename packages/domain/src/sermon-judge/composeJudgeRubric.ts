/**
 * Redacción v2 Fase 2 (§8.1, §9.1) — el juez COMPONE su vara de tres fuentes.
 *
 * No hay "un catálogo del juez": hay tres capas que se apilan para un sermón
 * concreto (forma elegida × género del pasaje). Componer en vez de fusionar es lo
 * que permite que un 4º eje futuro entre como una fuente más y no como
 * reescritura del motor (abierto/cerrado).
 *
 * El género se LEE de `PassageProfile.genres` — este módulo no lo re-deriva
 * (invariante: una sola fuente de verdad del género).
 */

import type { ApproachType } from '../entities/HomileticalApproach';
import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';
import type { CriterioCumplimiento, Descalificador, SeveridadResuelta } from './complianceTypes';
import { resolveSeveridad } from './complianceTypes';
import {
    APPROACH_COMPLIANCE_CATALOG,
    APPROACH_COMPLIANCE_FORMS,
    DESCALIFICADORES_GLOBALES,
} from './approachComplianceCatalog';
import {
    GENRE_COMPLIANCE_CATALOG,
    GENRE_COMPLIANCE_GENRES,
    genreDisqualifiersFor,
} from './genreComplianceCatalog';

/** De qué capa vino un descalificador. Diagnóstico para el pastor y la sombra. */
export type CapaVara = 'global' | 'forma' | 'genero';

export interface DescalificadorEnVara extends Descalificador {
    capa: CapaVara;
    /** Forma o género del que salió. Ausente en los globales. */
    dueno?: string;
    /**
     * Clave estable y GLOBALMENTE única: `global:G4`, `forma:temático:E1`,
     * `genero:wisdom:D1`.
     *
     * Va calificada por dueño, no solo por capa. Los ids se repiten entre dueños
     * (casi todo género tiene un `D1`), así que una clave `genero:D1` alcanzaría
     * dentro de UNA vara — hay un solo género por sermón — pero al agregar sombra
     * entre sermones fundiría descalificadores distintos bajo el mismo nombre:
     * "proverbio como promesa" y "aplanar el poema" contarían juntos.
     */
    claveVara: string;
    resuelto: SeveridadResuelta;
}

export interface JudgeRubric {
    approach: ApproachType;
    /** `undefined` cuando el perfil del pasaje no fijó género: la vara corre sin piso de género. */
    genre?: LiteraryGenre;
    promise: string;
    criterios: readonly CriterioCumplimiento[];
    descalificadores: readonly DescalificadorEnVara[];
}

function conCapa(
    ds: readonly Descalificador[],
    capa: CapaVara,
    /** Forma o género dueño. Los globales no tienen dueño: aplican a todos. */
    dueno?: string,
): DescalificadorEnVara[] {
    return ds.map(d => ({
        ...d,
        capa,
        ...(dueno ? { dueno } : {}),
        claveVara: dueno ? `${capa}:${dueno}:${d.id}` : `${capa}:${d.id}`,
        resuelto: resolveSeveridad(d, DESCALIFICADORES_GLOBALES),
    }));
}

export function composeJudgeRubric(
    approach: ApproachType,
    genre?: LiteraryGenre,
): JudgeRubric {
    const forma = APPROACH_COMPLIANCE_CATALOG[approach];
    return {
        approach,
        ...(genre ? { genre } : {}),
        promise: forma.promise,
        criterios: forma.criteriosCumplimiento,
        descalificadores: [
            ...conCapa(DESCALIFICADORES_GLOBALES, 'global'),
            ...conCapa(forma.descalificadoresEspecificos, 'forma', approach),
            ...conCapa(genreDisqualifiersFor(genre), 'genero', genre),
        ],
    };
}

/**
 * Cola de revisión del fundador, DERIVADA DEL DATO y no de la memoria: qué
 * descalificadores siguen sin severidad sellada. Mientras estén acá, el juez los
 * trata como `estandar` y nunca escalan a confrontación fuerte, así que la lista
 * no es cosmética — mide cuánta vara está operando en su modo más débil.
 *
 * Recorre los catálogos crudos (no varas compuestas) para no contar la misma
 * entrada una vez por cada combinación forma × género.
 */
export function descalificadoresPendientesDeSellado(): DescalificadorEnVara[] {
    const out: DescalificadorEnVara[] = [];

    out.push(...conCapa(DESCALIFICADORES_GLOBALES, 'global'));

    for (const approach of APPROACH_COMPLIANCE_FORMS) {
        out.push(...conCapa(APPROACH_COMPLIANCE_CATALOG[approach].descalificadoresEspecificos, 'forma', approach));
    }

    for (const genre of GENRE_COMPLIANCE_GENRES) {
        out.push(...conCapa(GENRE_COMPLIANCE_CATALOG[genre], 'genero', genre));
    }

    return out.filter(d => d.resuelto.pendienteDeSellado);
}
