/**
 * `validarEstudioMadre` — orquestador delgado de las puertas de fidelidad sobre
 * el Estudio Madre (spec v1.3 §8). Corre en la cristalización (§2.4), NO en la
 * generación de artefactos: así todo lo que derive del estudio hereda la
 * fidelidad (un motor, no uno por recurso).
 *
 * MOTOR ÚNICO: las puertas 1–3 (contexto / paralelos / confesión) reusan el
 * motor de tres testigos del sermón VERBATIM — esta capa NO reimplementa la
 * escalación, solo la compone:
 *   - `escalateWitnessedClaim`, `aggregateWitnessResult`, `canProceedFromWitnesses`
 *     viven en `../entities/WitnessValidation` y se importan tal cual.
 *
 * Esta capa es PURA (sin IO): los verdicts de los testigos (puertas 1–3) y la
 * verificación de citas (puerta 4) se INYECTAN ya resueltos por el llamador
 * (el callable de testigos + el ICitationVerifier se cablean en el sub-checkpoint
 * 2b). Aquí se computan las puertas ESTRUCTURALES deterministas:
 *   - puerta 2 (anti proof-texting cuantitativo): ≥2 testigos por afirmación de
 *     peso. El motor de testigos NO cubre esto (es un detector cualitativo de
 *     tensión), así que es lógica nueva — pero estructural, no reimplementación.
 *   - puerta 4 (estado de citas): citas ✗ no entran a artefactos.
 *   - puerta 7 (autoría): `autoria_resumen` derivado de los elementos.
 */

import {
    aggregateWitnessResult,
    canProceedFromWitnesses,
    escalateWitnessedClaim,
    type ProceedDecision,
    type WitnessResult,
    type WitnessVerdict,
} from '../entities/WitnessValidation';
import type { DoctrineLevel } from '../entities/Confession';
import type {
    AutoriaResumen,
    ElementoEstudio,
    ElementoTipo,
    EstadoFidelidad,
    ProofTexting,
    VerificacionCitas,
} from './types';

/**
 * Tipos de elemento que se VALIDAN como claim contra los tres testigos
 * (puertas 1–3). El resto (`testigo`, `testigo_historico`, `cita`,
 * `ilustracion`) son evidencia/soporte, no afirmaciones a validar.
 * Incluye `aplicacion` (espejo de `doxologicalApplication` del seed: una
 * aplicación puede malusar el contexto y debe verse contra los testigos).
 */
const TIPOS_CLAIM: ReadonlySet<ElementoTipo> = new Set<ElementoTipo>([
    // formativo
    'idea_central',
    'observacion',
    'error_confrontado',
    'aplicacion',
    // experto
    'marco',
    'argumento',
    'contraargumento',
    'conclusion',
]);

/**
 * Tipos que exigen ≥2 testigos de respaldo propio (anti proof-texting, puerta 2).
 * = afirmaciones doctrinales independientes. EXCLUYE `aplicacion`: una aplicación
 * pastoral se deriva de la idea central ya probada (hereda su respaldo, no exige
 * el propio). Decisión del fundador en Capa 2b.
 */
const TIPOS_DE_PESO: ReadonlySet<ElementoTipo> = new Set<ElementoTipo>(
    [...TIPOS_CLAIM].filter((t) => t !== 'aplicacion'),
);

/** Mínimo de testigos de respaldo por afirmación de peso (anti proof-texting). */
export const MIN_RESPALDO_TESTIGOS = 2;

/** ¿Se valida contra los tres testigos? (puertas 1–3) */
export function esClaimValidable(tipo: ElementoTipo): boolean {
    return TIPOS_CLAIM.has(tipo);
}

/** ¿Exige respaldo propio ≥2? (puerta 2, anti proof-texting) */
export function esAfirmacionDePeso(tipo: ElementoTipo): boolean {
    return TIPOS_DE_PESO.has(tipo);
}

// ── Colector: elementos → claims genéricos del motor de testigos ────────────

export interface EstudioClaim {
    /** Estable: el id del elemento. */
    key: string;
    /** El tipo de elemento, como label de procedencia (ClaimKind es abierto). */
    kind: ElementoTipo;
    text: string;
}

/**
 * Hermano de `collectSeedClaims`: mapea los elementos de peso del estudio a la
 * forma de claim que consume el motor de testigos. Las afirmaciones de soporte
 * (testigos, citas, ilustraciones) no se validan como claims.
 */
export function collectEstudioClaims(elementos: ElementoEstudio[]): EstudioClaim[] {
    return elementos
        .filter((e) => esClaimValidable(e.tipo) && e.contenido.trim().length > 0)
        .sort((a, b) => a.orden - b.orden)
        .map((e) => ({ key: e.id, kind: e.tipo, text: e.contenido.trim() }));
}

// ── Puerta 2 (estructural): anti proof-texting ──────────────────────────────

export interface ProofTextingResult {
    /** Veredicto por id de elemento de peso. */
    porElemento: Record<string, ProofTexting>;
    /** Ids de afirmaciones de peso con < MIN_RESPALDO_TESTIGOS respaldos. */
    sospechosos: string[];
}

/**
 * Cuenta los respaldos de cada afirmación de peso. < 2 ⇒ `sospechoso`
 * (cuelga de un solo proof-text). No reimplementa el motor: es una cuenta
 * estructural sobre `respaldoTestigos`.
 */
export function evaluarProofTexting(elementos: ElementoEstudio[]): ProofTextingResult {
    const porElemento: Record<string, ProofTexting> = {};
    const sospechosos: string[] = [];
    for (const e of elementos) {
        if (!esAfirmacionDePeso(e.tipo)) continue;
        const respaldos = e.respaldoTestigos?.length ?? 0;
        const veredicto: ProofTexting = respaldos >= MIN_RESPALDO_TESTIGOS ? 'limpio' : 'sospechoso';
        porElemento[e.id] = veredicto;
        if (veredicto === 'sospechoso') sospechosos.push(e.id);
    }
    return { porElemento, sospechosos };
}

// ── Puerta 4 (estructural): estado de citas ─────────────────────────────────

export interface CitasResult {
    /** Citas con verificación ✗ — no entran a artefactos. */
    fallidas: string[];
    /** Citas sin verificación concluyente (ausente o parcial). */
    sinVerificar: string[];
}

/** Revisa el estado de verificación de los elementos `cita` (puerta 4). */
export function evaluarCitas(elementos: ElementoEstudio[]): CitasResult {
    const fallidas: string[] = [];
    const sinVerificar: string[] = [];
    for (const e of elementos) {
        if (e.tipo !== 'cita') continue;
        if (e.verificacionCitas === 'no') fallidas.push(e.id);
        else if (e.verificacionCitas !== 'ok') sinVerificar.push(e.id);
    }
    return { fallidas, sinVerificar };
}

/**
 * Puerta 4 — verificación MVP (spec §8, alcance acotado por el fundador).
 *
 * NO corre el `ICitationVerifier` del paper ni mapea a `VerifierSource` (eso es
 * v1): deriva el estado de lo que el propio elemento `cita` SÍ tiene.
 *   - `corpusId` presente ⇒ vino de una fuente RAG con corpus ⇒ `ok`.
 *   - solo `referencia` (sin corpus) ⇒ `parcial` (afirmada, no RAG-anclada).
 *   - nada ⇒ `undefined` (sin_verificar; por el gating NO bloquea `verde`).
 *
 * Devuelve `undefined` para no-citas. NUNCA produce `'no'` en MVP (no hay
 * verificador real que pueda refutar): ese estado queda reservado a marca
 * manual del docente o al verificador real de v1, y `evaluarCitas` lo respeta.
 */
export function derivarVerificacionCitaMvp(elemento: ElementoEstudio): VerificacionCitas | undefined {
    if (elemento.tipo !== 'cita') return undefined;
    const fuente = elemento.citaFuente;
    if (fuente?.corpusId) return 'ok';
    if (fuente?.referencia && fuente.referencia.trim().length > 0) return 'parcial';
    return undefined;
}

/**
 * Aplica la puerta 4 MVP a una lista de elementos: rellena `verificacionCitas`
 * de las citas SIN estado previo (respeta una marca explícita del docente, p.ej.
 * `'no'`). Pura — devuelve una copia nueva, no muta. Se corre en la cristalización.
 */
export function aplicarVerificacionCitasMvp(elementos: ElementoEstudio[]): ElementoEstudio[] {
    return elementos.map((e) => {
        if (e.tipo !== 'cita' || e.verificacionCitas !== undefined) return e;
        const derivado = derivarVerificacionCitaMvp(e);
        return derivado === undefined ? e : { ...e, verificacionCitas: derivado };
    });
}

// ── Puerta 7: métrica de autoría ────────────────────────────────────────────

/** Deriva `autoria_resumen` de los elementos (mixto cuenta medio a cada lado). */
export function calcularAutoriaResumen(elementos: ElementoEstudio[]): AutoriaResumen {
    const total = elementos.length;
    if (total === 0) return { docentePct: 0, sistemaPct: 0 };
    let docente = 0;
    let sistema = 0;
    for (const e of elementos) {
        if (e.autoria === 'docente') docente += 1;
        else if (e.autoria === 'sistema') sistema += 1;
        else {
            docente += 0.5;
            sistema += 0.5;
        }
    }
    return {
        docentePct: Math.round((docente / total) * 100),
        sistemaPct: Math.round((sistema / total) * 100),
    };
}

// ── Orquestador ─────────────────────────────────────────────────────────────

/** Un verdict de los tres testigos sobre un claim del estudio (puertas 1–3). */
export interface EstudioWitnessVerdicts {
    /** key del claim (= id del elemento). */
    claimKey: string;
    /** Nivel doctrinal detectado por el Testigo confesional (null si no aplica). */
    detectedLevel: DoctrineLevel | null;
    /** Verdicts de los tres testigos (context, parallels, confession). */
    verdicts: WitnessVerdict[];
}

export interface ValidarEstudioInput {
    elementos: ElementoEstudio[];
    /**
     * Verdicts de los tres testigos por claim (puertas 1–3), inyectados por el
     * callable. `null`/ausente ⇒ las puertas de testigos aún no se corrieron ⇒
     * el estudio no puede ser `verde`.
     */
    witnessVerdicts?: EstudioWitnessVerdicts[] | null;
    /** Respuestas del docente a los bloqueos de testigos (cristalización). */
    resolutions?: ReadonlyArray<{ claimKey: string; response: string }>;
    /** Identificadores para componer el WitnessResult reusado. */
    estudioId: string;
}

export interface EstudioFidelidadResult {
    estadoFidelidad: EstadoFidelidad;
    /** Resultado de los tres testigos (forma reusada del motor). null si no se corrieron. */
    testigos: WitnessResult | null;
    proceed: ProceedDecision | null;
    proofTexting: ProofTextingResult;
    citas: CitasResult;
    autoria: AutoriaResumen;
    /** Razones legibles por las que el estudio no es `verde` ("qué falta"). */
    bloqueos: string[];
}

/**
 * Compone las puertas y decide `estadoFidelidad`. Reusa la escalación de
 * testigos verbatim; suma las puertas estructurales (proof-texting, citas,
 * autoría). No persiste nada (eso es del llamador / `updateEstudioMadre`).
 */
export function validarEstudioMadre(input: ValidarEstudioInput): EstudioFidelidadResult {
    const { elementos, witnessVerdicts, resolutions = [], estudioId } = input;

    const proofTexting = evaluarProofTexting(elementos);
    const citas = evaluarCitas(elementos);
    const autoria = calcularAutoriaResumen(elementos);

    let testigos: WitnessResult | null = null;
    let proceed: ProceedDecision | null = null;
    if (witnessVerdicts && witnessVerdicts.length > 0) {
        const claimsById = new Map(collectEstudioClaims(elementos).map((c) => [c.key, c]));
        const witnessedClaims = witnessVerdicts.map((wv) => {
            const claim = claimsById.get(wv.claimKey);
            return escalateWitnessedClaim({
                key: wv.claimKey,
                kind: claim?.kind ?? 'argumento',
                text: claim?.text ?? '',
                detectedLevel: wv.detectedLevel,
                verdicts: wv.verdicts,
            });
        });
        testigos = aggregateWitnessResult({
            // El motor etiqueta seedId/sermonId; aquí ambos son el estudio.
            seedId: estudioId,
            sermonId: estudioId,
            claims: witnessedClaims,
            confessionalWitnessesEnabled: true,
        });
        proceed = canProceedFromWitnesses(testigos, resolutions);
    }

    const bloqueos: string[] = [];
    if (!testigos) {
        bloqueos.push('Las puertas de testigos (contexto, paralelos, confesión) aún no se han corrido.');
    } else if (proceed && !proceed.allowed) {
        if (proceed.hasAbsoluteBlock) {
            bloqueos.push('Una afirmación niega una doctrina ecuménica central: revisa el contenido antes de cerrar.');
        }
        if (proceed.pendingKeys.length > 0) {
            bloqueos.push(`${proceed.pendingKeys.length} afirmación(es) marcada(s) por los testigos necesitan tu respuesta.`);
        }
    }
    if (proofTexting.sospechosos.length > 0) {
        bloqueos.push(
            `${proofTexting.sospechosos.length} afirmación(es) de peso necesitan ≥${MIN_RESPALDO_TESTIGOS} testigos de respaldo (anti proof-texting).`,
        );
    }
    if (citas.fallidas.length > 0) {
        bloqueos.push(`${citas.fallidas.length} cita(s) no verifican; no pueden entrar a los artefactos.`);
    }

    let estadoFidelidad: EstadoFidelidad;
    if (!testigos) estadoFidelidad = 'sin_auditar';
    else if (bloqueos.length === 0) estadoFidelidad = 'verde';
    else estadoFidelidad = 'en_progreso';

    return { estadoFidelidad, testigos, proceed, proofTexting, citas, autoria, bloqueos };
}
