/**
 * Estudio Madre — el contenido fiel, neutro al destino, del que derivan los
 * artefactos (spec `docs/spec-asistentes-preparacion-estudio-v1.3.md` §2).
 *
 * NO es una colección nueva: es un sobre ADITIVO y OPCIONAL dentro de
 * `extractions/{id}` (ver `Extraction.estudioMadre`). Un estudio sin sobre
 * sigue siendo válido y `sin_auditar` (back-compat: los estudios legacy son
 * solo `markdown`). El motor de generación de plan sigue consumiendo
 * `extractions/{id}.markdown`; la única diferencia es que ese markdown ahora
 * puede venir serializado desde los elementos cristalizados (`serializarEstudio`).
 *
 * Convención: campos en camelCase (consistencia con el resto del dominio).
 * El esquema de la spec usa snake_case en su JSON ilustrativo; el contenido
 * editorial (valores de `tipo`) conserva el vocabulario de la skill.
 */

/** Naturaleza del estudio. */
export type EstudioTipo = 'pasaje' | 'doctrina';

/**
 * Rigidez de composición (spec §2.2). `formativo` = set fijo de elementos
 * conducido por el sistema (Asistente A); `experto` = composición libre
 * auditada (Asistente B).
 */
export type EstudioModo = 'formativo' | 'experto';

/** Estado de las puertas de fidelidad sobre el estudio (spec §2.3). */
export type EstadoFidelidad = 'sin_auditar' | 'en_progreso' | 'verde';

/** Quién originó el contenido del elemento (alimenta la métrica de autoría). */
export type Autoria = 'docente' | 'sistema' | 'mixto';

/** Tipos de elemento del modo formativo (Asistente A — spec §2.2). */
export type ElementoTipoFormativo =
    | 'idea_central'
    | 'observacion'
    | 'testigo'
    | 'testigo_historico'
    | 'error_confrontado'
    | 'aplicacion';

/** Tipos de elemento del modo experto (Asistente B — spec §2.2). */
export type ElementoTipoExperto =
    | 'marco'
    | 'argumento'
    | 'contraargumento'
    | 'cita'
    | 'ilustracion'
    | 'conclusion';

export type ElementoTipo = ElementoTipoFormativo | ElementoTipoExperto;

/** Estado de verificación de citas de un elemento (puerta 4). */
export type VerificacionCitas = 'ok' | 'no' | 'parcial';

/** Lectura anti proof-texting de un elemento (puerta 2). */
export type ProofTexting = 'limpio' | 'sospechoso';

/**
 * Un elemento cristalizado del estudio. Tipado + ordenado. Diseñado para
 * soportar confrontación (`aceptadoPorDocente`/`razon`) desde el schema aunque
 * en MVP esos campos se llenen mínimo (spec §2.3, opción 3).
 */
export interface ElementoEstudio {
    /** Estable dentro del estudio (p.ej. "e1"). Referenciado por respaldoTestigos. */
    id: string;
    tipo: ElementoTipo;
    /** Orden lógico del docente (1-based). */
    orden: number;
    contenido: string;
    autoria: Autoria;
    /** Verificación de citas (puerta 4). Ausente hasta que se audita. */
    verificacionCitas?: VerificacionCitas;
    /** Lectura anti proof-texting (puerta 2). Ausente hasta que se audita. */
    proofTexting?: ProofTexting;
    /** Confrontación (opción 3): el docente aceptó esta formulación. */
    aceptadoPorDocente?: boolean;
    /** Justificación del docente al aceptar/confrontar. */
    razon?: string;
    /** IDs de elementos testigo que respaldan una afirmación de peso (puerta 2/5). */
    respaldoTestigos?: string[];
}

/** Agregado de autoría derivado de los elementos (puerta 7, la demo). */
export interface AutoriaResumen {
    docentePct: number;
    sistemaPct: number;
}

/**
 * El sobre del Estudio Madre dentro de `extractions/{id}`. Todo es opcional
 * desde el punto de vista de Firestore: un doc sin este sobre es un estudio
 * legacy `sin_auditar`.
 */
export interface EstudioMadre {
    tipo: EstudioTipo;
    modo: EstudioModo;
    /** Pasaje o doctrina ancla (p.ej. "Juan 1:1-3"). */
    referencia: string;
    /** Transcript de origen (trazabilidad, NO fuente de verdad). */
    origenConversacionId?: string | null;
    estadoFidelidad: EstadoFidelidad;
    version: number;
    /** Estudio del que se clonó éste (null = original). */
    clonadoDe?: string | null;
    elementos: ElementoEstudio[];
    /** Derivado de `elementos[].autoria`. */
    autoriaResumen?: AutoriaResumen;
    proyectosVinculados?: string[];
    historialConfrontacion?: unknown[];
}
