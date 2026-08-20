/**
 * Redacción v2 Fase 2 (§9) — tipos compartidos de la vara del juez de fidelidad
 * homilética.
 *
 * EL JUEZ ES COMPOSITOR DE TRES FUENTES, no lector de un catálogo (§9.1):
 *   1. Descalificadores GLOBALES (G1-G4) — a los seis enfoques.
 *   2. Criterios + descalificadores de la FORMA elegida por el pastor.
 *   3. Descalificadores del GÉNERO del pasaje.
 *
 * Forma y género son DOS conjuntos distintos y NO deben forzarse a coincidir
 * (invariante sellado): el género es realidad del texto y pone el PISO
 * innegociable; la forma es decisión del predicador y decide el ÉNFASIS dentro
 * de ese piso (§8.2). Por eso viven en catálogos hermanos separados.
 *
 * Todo esto es DATO EDITABLE (SSOT domain, movible a Firestore), no prompt
 * hardcodeado: la vara de fidelidad la define el fundador, no el modelo.
 */

/**
 * Gobierna el ESTADO del veredicto (§8.4): crítica → confrontación fuerte con
 * reconocimiento activo del pastor; estándar → advertencia registrada.
 */
export type Severidad = 'critica' | 'estandar';

/**
 * DIAGNÓSTICO, no peso (§8.4): informa al pastor qué clase de problema tiene y
 * NO cambia el estado del veredicto. `contenido` = qué dice el sermón (moraliza,
 * alegoriza, promete). `tratamiento` = cómo trata el texto (aplana el afecto,
 * disecciona la narrativa en receta).
 */
export type TipoDescalificador = 'contenido' | 'tratamiento';

/**
 * Severidad de un criterio de CUMPLIMIENTO (§9.6). `esencial` = su sola ausencia
 * descalifica. `esperado` = su ausencia baja calidad pero no descalifica sola.
 *
 * INVARIANTE INNEGOCIABLE (§9.6): ningún criterio `esencial` sin ayuda formativa
 * upstream. Un esencial sin andamiaje antes del juez es un MURO, prohibido por
 * diseño — el juez es la última red, no la primera vez que el pastor oye la
 * exigencia. Por eso cada esencial declara `ayudaUpstream`.
 */
export type CriterioSeveridad = 'esencial' | 'esperado';

export interface CriterioCumplimiento {
    /** Estable: el juez adjudica contra este id y la sombra lo agrega. */
    id: string;
    /** La vara explícita contra la que se adjudica `yes | unclear | no`. */
    text: string;
    severidad: CriterioSeveridad;
    /**
     * Dónde vive la ayuda formativa que precede al juicio. OBLIGATORIO en los
     * `esencial` (invariante §9.6); el test rompe CI si falta. Es una referencia
     * legible, no un enlace de código: nombra el momento del acompañamiento.
     */
    ayudaUpstream?: string;
}

export interface Descalificador {
    id: string;
    text: string;
    /**
     * Ausente ⇒ el fundador todavía no la selló para esta entrada. NO se inventa:
     * se resuelve por herencia de `refina` si la hay, y si no queda pendiente y
     * el juez la trata como `estandar` (ver `resolveSeveridad`).
     */
    severidad?: Severidad;
    tipo?: TipoDescalificador;
    /**
     * Enlace jerárquico a un descalificador global que este especializa (ej. E3
     * pastoral refina G2; E1 teológico refina G4). Dos efectos: quien edite el
     * global ve que hay una especialización aguas abajo, y la severidad se hereda
     * cuando no está declarada localmente (§9.5, "hereda crítica de G4").
     */
    refina?: string;
    /** Procedencia de la vara: de qué fuente/sección salió. Auditable. */
    fuente?: string;
}

/**
 * La severidad efectiva con la que el juez opera, y si la vara está sellada.
 *
 * FAIL-CLOSED HACIA LA ADVERTENCIA, no hacia la confrontación: una severidad que
 * el fundador no selló NUNCA escala a confrontación fuerte. Escalar por defecto
 * exigiría reconocimiento activo del pastor sobre un criterio que nadie autorizó
 * — confrontar con vara no sellada es el mismo pecado que confrontar con dato
 * falso (disciplina 036).
 */
export interface SeveridadResuelta {
    severidad: Severidad;
    /** `true` cuando salió de un default, no de una decisión sellada. */
    pendienteDeSellado: boolean;
    /** De dónde salió: declarada, heredada de un global, o default. */
    origen: 'declarada' | 'heredada' | 'default';
}

export function resolveSeveridad(
    d: Descalificador,
    globales: readonly Descalificador[],
): SeveridadResuelta {
    if (d.severidad) {
        return { severidad: d.severidad, pendienteDeSellado: false, origen: 'declarada' };
    }
    if (d.refina) {
        const global = globales.find(g => g.id === d.refina);
        if (global?.severidad) {
            return { severidad: global.severidad, pendienteDeSellado: false, origen: 'heredada' };
        }
    }
    return { severidad: 'estandar', pendienteDeSellado: true, origen: 'default' };
}
