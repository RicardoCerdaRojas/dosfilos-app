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
 * Subtipo de una `aplicacion` — la facultad que la aplicación atiende
 * (manifiesto de conducción formativa v1.3 §5). Mapeo 1:1 a la dimensión que
 * produce el objetivo: `mente→saber`, `corazon→sentir`, `conducta→hacer`.
 *
 * ADITIVO y backward-compatible: una `aplicacion` legacy SIN subtipo se trata
 * como `sin_auditar` — no la elicita la conducción del corazón ni la confronta
 * el examen, y sigue contando como `hacer` hasta que se subtipe. Solo tiene
 * sentido sobre `tipo: 'aplicacion'`.
 */
export type SubtipoAplicacion = 'mente' | 'corazon' | 'conducta';

/**
 * Traza estructurada de la conducción del corazón (manifiesto v1.3 §3.2, pasos
 * C1–C5). Solo en `aplicacion` subtipo `corazon`. La AFECCIÓN que el docente
 * formula (C5) vive en `contenido`; esta traza guarda los pasos que la anclan al
 * texto para que el examen del corazón (cristalización, PR C) la confronte sin
 * re-elicitar. El sistema NUNCA escribe estos campos — los escribe el docente.
 */
export interface ConduccionCorazonTrace {
    /** C1 — id del elemento `idea_central` (proposición exegética) que ancla el afecto. */
    proposicionElementoId: string;
    /** C2 — qué buscaba mover el autor en el corazón de su audiencia original. */
    caraAfectiva: string;
    /** C3 — la verdad sobre Dios, revelada en el texto, de la que cuelga el afecto. */
    raizTeocentrica: string;
    /** C4 — cómo aterriza ese mismo afecto en la congregación de hoy (tramo libre). */
    puenteCongregacion: string;
}

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
    /**
     * Solo para `tipo: 'cita'` — procedencia de la cita (puerta 4). En MVP el
     * estado se deriva de aquí sin correr el verificador del paper: `corpusId`
     * presente ⇒ la cita vino de una fuente RAG con corpus (verificable).
     */
    citaFuente?: {
        /** Referencia citada (p.ej. "Calcedonia, Definición" o "Wallace p.47"). */
        referencia?: string;
        /** Id del recurso RAG si la cita salió del corpus; null/ausente si no. */
        corpusId?: string | null;
    };
    /**
     * Solo para `tipo: 'aplicacion'` — la facultad que atiende la aplicación
     * (manifiesto §5). Ausente = legacy `sin_auditar`. Marca qué dimensión
     * produce (`mente`/`corazon`/`conducta`), no el estado de fidelidad.
     */
    subtipo?: SubtipoAplicacion;
    /**
     * Solo para `aplicacion` subtipo `corazon` — la traza de la conducción C1–C5
     * que ancla la afección al texto. Aditiva: una `corazon` sin traza (legacy o
     * clasificada a mano) no la trae; el examen del corazón la tratará como
     * huérfana (no se puede trazar) y la confronta.
     */
    conduccionCorazon?: ConduccionCorazonTrace;
    /**
     * Solo para `aplicacion` subtipo `conducta` — id del `aplicacion:corazon` del
     * que esta conducta se desprende (la piedad es el afecto en movimiento,
     * manifiesto §3.3). Aditiva: una conducta sin vínculo declarado es moralismo
     * y el examen la confronta a declararlo. NO afirma que la conducta esté
     * validada — solo de qué afecto dice desprenderse (la sustancia del vínculo
     * es deuda v1).
     */
    derivaDeElementoId?: string;
}

/** Agregado de autoría derivado de los elementos (puerta 7, la demo). */
export interface AutoriaResumen {
    docentePct: number;
    sistemaPct: number;
}

/**
 * Objetivos de aprendizaje del estudio (Gap 1 de la spec §10): saber / sentir /
 * hacer. Se DERIVAN de los elementos cristalizados por el docente (no los inventa
 * el LLM); cada dimensión es la lista VERBATIM de los contenidos que aportan, o
 * vacía si no hay material. Campo neutro (string[] por dimensión), NO acoplado a
 * modo/género: cuando exista la transposición (Nivel 4), el perfil de audiencia
 * podrá calibrarlos sin romper el contrato.
 *
 * Mapeo (manifiesto v1.3 §5): saber ← idea_central + observacion; sentir ←
 * aplicacion:corazon (afecto validado por el examen del corazón); hacer ←
 * aplicacion:conducta + aplicacion legacy sin subtipo. El parche
 * `sentir ← error_confrontado` quedó RETIRADO al llegar la conducción afectiva.
 *
 * DEUDA conocida: la puerta de medibilidad (T1) NO se aplica aún — un objetivo
 * blando ("valorar más a Cristo") pasa sin confrontar su medibilidad.
 */
export interface Objetivos {
    saber: string[];
    sentir: string[];
    hacer: string[];
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
    /** Objetivos derivados de los elementos (Gap 1). Aditivo. */
    objetivos?: Objetivos;
    proyectosVinculados?: string[];
    historialConfrontacion?: unknown[];
}
