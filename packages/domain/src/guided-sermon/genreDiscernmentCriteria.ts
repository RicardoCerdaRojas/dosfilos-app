/**
 * Redacción v2 Fase 1 (§4.4) — criterios de discernimiento de género (la VARA
 * del juez de engagement de género, paso 2).
 *
 * Disciplina 036: el juez NO emite un juicio libre — adjudica CONTRA estos
 * criterios estructurados. Cada entrada nombra las marcas que distinguen una
 * lectura de ese género (¿argumenta? ¿narra? ¿canta/ora? ¿legisla? ¿predice?).
 * El dispatch pasa la marca del género PROPUESTO al juez; el juez decide si la
 * lectura del pastor engancha esa marca o trata el pasaje como otro género.
 *
 * DATO EDITABLE (SSOT domain, movible a Firestore). Llaves = enum `LiteraryGenre`
 * (invariante: un test rompe CI si difieren — el juez quedaría sin vara para un
 * género). DISTINTO del catálogo hermano de género de Fase 2
 * (`genre-compliance-criteria`, que juzga la fidelidad del SERMÓN a los
 * descalificadores del género); este juzga el DISCERNIMIENTO del género en el
 * estudio. No confundir.
 *
 * Nota: `gospel`/`mixed` traen su marca hasta la reconciliación del enum (Fase 2,
 * §11.0): gospel se disuelve por perícopa, mixed dispara el override socrático.
 */

import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';

export const GENRE_DISCERNMENT_CRITERIA: Record<LiteraryGenre, string> = {
    epistle:
        'Discurso lógico/argumentativo: razona con conectores ("por tanto", "porque", "para que"), expone una tesis y la sostiene. Se lee siguiendo el flujo del argumento, no una trama ni una imagen.',
    narrative:
        'Relato histórico: trama, escenas, personajes y el juicio del narrador. Enseña por ilustración de hechos, no por mandato directo ni por argumento abstracto.',
    // parable: VACÍO TEMPORAL — lo autora el fundador en su revisión criterio-por-
    // criterio (§6.3, "narrativa con regla de punto único"). Stub visible: sale de
    // PENDING_AUTHOR en el test cuando se llene. 0a NO inventa criterio.
    parable: '',
    poetry:
        'Poesía: paralelismo (sinónimo/antitético/sintético), imágenes y afecto. El sentido va por la figura y el movimiento afectivo, no por cronología literal ni cadena lógica.',
    prophecy:
        'Oráculo profético: confrontación al presente (denuncia/juicio/promesa) en lenguaje figurado, no almanaque de eventos futuros. Portavoz de Dios a SU audiencia.',
    wisdom:
        'Literatura de sabiduría: máximas y reflexión (proverbio o discurso reflexivo). Guías generales, no promesas absolutas; en textos reflexivos importa QUIÉN habla y si el libro lo afirma.',
    gospel:
        'Evangelio: narra hechos y enseñanzas de Jesús. Se discierne por perícopa — relato (narrativa), parábola, o discurso de enseñanza (argumentativo). Si es mixto, el pastor nombra el dominante.',
    apocalypse:
        'Apocalíptico: visiones y símbolos que consuelan/desafían al pueblo oprimido. Se distingue la FORMA simbólica de la SUSTANCIA/verdad; no es calendario de eventos.',
    law:
        'Material legal: precepto (apodíctico o casuístico) y su fundamento. Se lee preguntando la transferibilidad (moral permanente / ceremonial anulada / civil con principio), no como alegoría.',
    mixed:
        'Género mixto o indeterminado: la perícopa combina formas. NO se adjudica una forma única — el pastor discierne el género que GOBIERNA su perícopa; la perícopa manda.',
};

/** Lista canónica de géneros con criterio (para el test de invariante enum≡llaves). */
export const GENRE_DISCERNMENT_GENRES = Object.keys(GENRE_DISCERNMENT_CRITERIA) as LiteraryGenre[];

/**
 * La marca de discernimiento del género propuesto, o cadena vacía si el género
 * no está en el catálogo (fail-safe: el juez recibe vara vacía y el adapter
 * fail-closed a `unclear`, nunca inventa criterio).
 */
export function genreDiscernmentCriteriaFor(genre: string | undefined): string {
    if (!genre) return '';
    return GENRE_DISCERNMENT_CRITERIA[genre as LiteraryGenre] ?? '';
}
