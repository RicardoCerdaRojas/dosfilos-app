/**
 * Redacción v2 Fase 1 (§4.5) B1 — vara de "análisis estructural suficiente" del
 * paso 3, sensible al género.
 *
 * DETERMINISTA Y TOSCA POR DISEÑO: mide si el pastor HIZO análisis estructural
 * propio del género (presencia de marcas), NO si fue bueno. El juicio fino (un
 * juez LLM semántico) se escala DESPUÉS, con datos de shadow que muestren que la
 * heurística no basta. FAIL-CLOSED a `unclear`: género sin vara, género sin
 * marcas deterministas (ej. `mixed`), o nota vacía → `unclear` (no cuenta ni como
 * suficiente ni como insuficiente).
 *
 * DATO EDITABLE (SSOT domain, movible a Firestore). Llaves = enum `LiteraryGenre`
 * (invariante: test rompe CI si difieren). El fundador revisa las marcas
 * criterio-por-criterio con datos de shadow (como GENRE_DISCERNMENT_CRITERIA).
 * `workedExamples` son CURADOS por el fundador (NO generados) — arrancan vacíos.
 */

import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';

export interface StructuralSufficiencyGenreEntry {
    /**
     * Guía humana para la ayuda sensible al género (B3, prompt live): qué mirar
     * estructuralmente en este género. Editable.
     */
    guidance: string;
    /**
     * Marcas estructurales TOSCAS cuya PRESENCIA mide la vara determinista. Miden
     * si hubo trabajo estructural propio del género, no su calidad. Vacío ⇒ el
     * género no se mide deterministamente (ej. `mixed`) → `unclear`.
     */
    markers: string[];
    /**
     * Ejemplos trabajados CURADOS por el fundador (no generados). Alimentan la
     * ayuda del paso 3 (B3). Arrancan vacíos hasta que el fundador los llene.
     */
    workedExamples: string[];
}

export const STRUCTURAL_SUFFICIENCY_BY_GENRE: Record<LiteraryGenre, StructuralSufficiencyGenreEntry> = {
    epistle: {
        guidance:
            'Sigue el flujo del argumento: identifica la cláusula principal y cómo los conectores lógicos (por tanto, porque, para que) encadenan y subordinan las demás.',
        markers: ['por tanto', 'porque', 'para que', 'pues', 'de modo que', 'conector', 'argumento', 'tesis', 'premisa', 'clausula principal', 'subordina'],
        workedExamples: [],
    },
    // parable: VACÍO TEMPORAL — lo autora el fundador (§6.3, "regla de punto único").
    // Stub visible: sale de PENDING_AUTHOR en el test cuando se llene. markers/guidance
    // vacíos hasta entonces (evaluateStructuralSufficiency → unclear, fail-closed). 0a
    // NO inventa vara.
    parable: {
        guidance: '',
        markers: [],
        workedExamples: [],
    },
    narrative: {
        guidance:
            'Traza el arco de la trama: dónde arranca la tensión, dónde el clímax, dónde la resolución. La estructura son los giros de la escena, no cláusulas lógicas.',
        markers: ['escena', 'trama', 'tension', 'climax', 'clima', 'resolucion', 'giro', 'conflicto', 'personaje', 'arco', 'desenlace'],
        workedExamples: [],
    },
    poetry: {
        guidance:
            'Traza el paralelismo (sinónimo, antitético, sintético) y los giros de imagen. La estructura es la figura y el movimiento, no una cadena lógica.',
        markers: ['paralelismo', 'sinonimo', 'antitetico', 'sintetico', 'imagen', 'metafora', 'estrofa', 'figura', 'quiasmo'],
        workedExamples: [],
    },
    prophecy: {
        guidance:
            'Traza la estructura del oráculo (acusación → juicio → restauración) y su lenguaje figurado. Es confrontación al presente, no almanaque de eventos.',
        markers: ['oraculo', 'acusacion', 'denuncia', 'juicio', 'promesa', 'restauracion', 'lenguaje figurado'],
        workedExamples: [],
    },
    wisdom: {
        guidance:
            'En proverbio, abre el paralelismo (¿ilustra o contrasta?). En reflexivo (Job/Eclesiastés), rastrea el argumento y UBICA la voz (¿quién habla y el libro lo afirma?).',
        markers: ['paralelismo', 'maxima', 'proverbio', 'antitetico', 'sinonimo', 'contraste', 'reflexion', 'voz', 'quien habla'],
        workedExamples: [],
    },
    // `gospel` se DISUELVE (§11.0): no es género propio, se discierne por perícopa
    // (narrativa / parábola / argumentativo). SIN marcas deterministas → la vara
    // devuelve `unclear` y remite al discernimiento del paso 2. Poner marcas reales
    // aquí contradiría la decisión sellada.
    gospel: {
        guidance:
            'El evangelio se discierne por perícopa (paso 2): relato, parábola o discurso de enseñanza. La estructura sigue al género de la perícopa, no a "gospel".',
        markers: [],
        workedExamples: [],
    },
    apocalypse: {
        guidance:
            'Traza los bloques de la visión (sietes: iglesias/sellos/trompetas) y distingue la FORMA simbólica de la SUSTANCIA/verdad. No es calendario.',
        markers: ['vision', 'simbolo', 'bloque', 'sello', 'trompeta', 'forma', 'sustancia', 'juicio', 'salvacion'],
        workedExamples: [],
    },
    law: {
        guidance:
            'Identifica el precepto (apodíctico o casuístico) y su fundamento (la razón que la ley da). Pregunta la transferibilidad al oyente hoy.',
        markers: ['precepto', 'mandato', 'apodictico', 'casuistico', 'fundamento', 'razon', 'transferib', 'ley'],
        workedExamples: [],
    },
    // `mixed` es el disparador del override socrático de género, no un género con
    // estructura propia → sin marcas deterministas → la vara devuelve `unclear`.
    mixed: {
        guidance:
            'Género mixto: primero discierne el género que gobierna la perícopa (paso 2); la estructura sigue a ese género.',
        markers: [],
        workedExamples: [],
    },
};

/** Lista canónica de géneros con vara (para el test de invariante enum≡llaves). */
export const STRUCTURAL_SUFFICIENCY_GENRES = Object.keys(STRUCTURAL_SUFFICIENCY_BY_GENRE) as LiteraryGenre[];

export type StructuralSufficiency = 'suficiente' | 'insuficiente' | 'unclear';

/**
 * Redacción v2 Fase 1 (§4.5) — tasa de muestreo de la señal structuralSufficiency
 * en sombra (1 de N turnos elegibles del paso 3). KNOB EDITABLE (dato, movible a
 * Firestore), SEPARADO de la tasa de genreOverride: la vara es DETERMINISTA (sin
 * costo LLM), así que muestrea cada turno elegible (N=1) para dar máximo volumen
 * de decisión al gate de §4.5; el único costo es un write y los turnos de paso 3
 * son pocos por estudio. Bajar N reduce writes si molesta.
 */
export const STRUCTURAL_SUFFICIENCY_SHADOW_SAMPLE_1_IN = 1;

function normalize(value: string): string {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/**
 * La guía de discernimiento estructural del género, o cadena vacía si el género
 * no está en el catálogo (fail-safe). La consume la ayuda live del paso 3 (B3).
 * Es TEXTO PASTORAL-FACING sujeto a revisión del fundador — no embarca live sin
 * su aprobación (B3 sale flag-inert).
 */
export function structuralGuidanceFor(genre: string | undefined): string {
    if (!genre) return '';
    return STRUCTURAL_SUFFICIENCY_BY_GENRE[genre as LiteraryGenre]?.guidance ?? '';
}

/**
 * Vara determinista y tosca del paso 3: ¿la nota del pastor muestra trabajo
 * estructural propio del género? Presencia de al menos una marca del género →
 * `suficiente`; contenido sin marca → `insuficiente`; sin vara para el género,
 * sin marcas deterministas (mixed), o nota vacía → `unclear` (FAIL-CLOSED, no
 * cuenta como violación). Mide EXISTENCIA de análisis, NO calidad.
 */
export function evaluateStructuralSufficiency(genre: string | undefined, note: string): StructuralSufficiency {
    const entry = genre ? STRUCTURAL_SUFFICIENCY_BY_GENRE[genre as LiteraryGenre] : undefined;
    if (!entry || entry.markers.length === 0) return 'unclear';
    const text = normalize(note);
    if (!text.trim()) return 'unclear';
    const hasMarker = entry.markers.some((m) => text.includes(normalize(m)));
    return hasMarker ? 'suficiente' : 'insuficiente';
}
