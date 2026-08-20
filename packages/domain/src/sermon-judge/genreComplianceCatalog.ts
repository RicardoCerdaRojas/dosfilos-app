/**
 * Redacción v2 Fase 2 — catálogo HERMANO: descalificadores del GÉNERO del pasaje
 * (los D de los 8 perfiles sellados en §6).
 *
 * EXTRACCIÓN, NO DISEÑO NUEVO (§9.1): cada entrada sale literalmente de su perfil
 * sellado. Donde el perfil no declaró severidad o tipo, ESTE ARCHIVO NO LOS
 * INVENTA — quedan sin declarar y `resolveSeveridad` los hereda del global que
 * refinan o los deja pendientes de sellado. La vara la sella el fundador.
 *
 * DISTINTO de `GENRE_DISCERNMENT_CRITERIA` (Fase 1), que juzga el DISCERNIMIENTO
 * del género en el ESTUDIO. Este juzga la fidelidad del SERMÓN al género. No
 * confundir: son fases distintas y colectores de sombra distintos.
 *
 * EL GÉNERO ES PISO INNEGOCIABLE (§8.2): puedes predicar un texto profético en
 * forma pastoral, pero NO puedes violar los descalificadores del profético. El
 * género pone los límites; la forma decide el énfasis dentro de ellos.
 *
 * DATO EDITABLE (SSOT domain, movible a Firestore). Llaves = enum `LiteraryGenre`
 * (test rompe CI si difieren).
 */

import type { LiteraryGenre } from '../exegesis/expository/BookPanorama';
import type { Descalificador } from './complianceTypes';

export const GENRE_COMPLIANCE_CATALOG: Record<LiteraryGenre, readonly Descalificador[]> = {
    // §6.1 — el perfil no lista un bloque "Descalificadores propios": declara la
    // infidelidad en su criterio de fidelidad ("Infiel = ... O ..."). Se extraen
    // esas dos caras, sin agregar una tercera.
    //
    // OJO al extraer: el perfil advierte explícitamente NO reducir exhortación a
    // imperativo moral. Un sermón de puro consuelo (1 Ts 4) es aplicación fiel;
    // penalizarlo por "faltarle un mandato" es un error del juez, no del pastor.
    epistle: [
        {
            id: 'D1',
            text: 'Doctrina sin aterrizaje: expone la verdad del texto pero nunca la lleva a la vida del oyente; queda en lección.',
            fuente: 'Redacción v2 §6.1 (criterio de fidelidad propio de la epístola)',
        },
        {
            id: 'D2',
            text: 'Aplicación sin fundamento: exhorta o consuela desconectado del texto (moralismo o sentimentalismo sin ancla).',
            fuente: 'Redacción v2 §6.1',
        },
    ],
    narrative: [
        {
            // TIPO tratamiento por la nota retroactiva de §6.5 ("narrativa D1
            // —moralizar/receta— también es tratamiento"). No confundir con E1
            // narrativo del catálogo de FORMA, que §9.5 selló como contenido:
            // son catálogos hermanos, no la misma entrada.
            id: 'D1',
            text: 'Moralizar / caricaturizar: identificación solo con lo negativo ("no seas como X"); caricaturizar un personaje traicionando el balance del texto.',
            tipo: 'tratamiento',
            fuente: 'Redacción v2 §6.2 · tipo por nota retroactiva §6.5',
        },
        {
            // Vara de los TRES CONTROLES (sellada): (1) ¿derivado del texto?
            // (2) ¿coherente con el canon? (3) ¿el texto emite juicio sobre esto?
            id: 'D2',
            text: 'Sobre-extracción de principios: extrae principios que el texto no sostiene. Se confronta con tres controles — ¿está DERIVADO directamente del texto?, ¿es COHERENTE con el resto del canon?, ¿el texto EMITE JUICIO sobre esto?',
            tipo: 'contenido',
            fuente: 'Redacción v2 §6.2 (Zuck, McQuilkin)',
        },
    ],
    // §6.3 PARÁBOLA está SELLADO y su descalificador AUTORADO — distinto de su
    // criterio de DISCERNIMIENTO (Fase 1), que sigue vacío esperando al fundador.
    // No se estampa el stub de PENDING_AUTHOR aquí: eso borraría vara que el
    // diseño sí selló.
    parable: [
        {
            id: 'D1',
            text: 'Alegorizar los detalles: asignar significado espiritual a elementos que solo dan realismo (mesonero, monedas, burro), más allá del punto único. Excepción: cuando el propio Jesús interpreta los detalles (sembrador, cizaña).',
            tipo: 'contenido',
            // "Es el proof-texting de la parábola" (§6.3) → hereda la crítica de
            // G4 por el mismo mecanismo que E1 teológico (§9.5).
            refina: 'G4',
            fuente: 'Redacción v2 §6.3 (Zuck: error de Agustín; Terry)',
        },
    ],
    poetry: [
        {
            id: 'D1',
            text: 'Aplanar el poema en prosa doctrinal: desmenuzar el salmo en proposiciones frías que pierden el movimiento afectivo.',
            tipo: 'tratamiento',
            fuente: 'Redacción v2 §6.5 (Terry)',
        },
        {
            id: 'D2',
            text: 'Sobre-literalizar o vaciar la imagen: tomar la figura literalmente (absurdo) o vaciarla en abstracción sin fuerza. La figura comunica un hecho literal por medio pintoresco — hallarlo sin destruir la imagen.',
            tipo: 'contenido',
            fuente: 'Redacción v2 §6.5 (Zuck)',
        },
    ],
    prophecy: [
        {
            id: 'D1',
            text: 'Profecía como almanaque de eventos futuros: reducir el oráculo a mapa de fechas/eventos, perdiendo el mensaje al presente.',
            tipo: 'tratamiento',
            fuente: 'Redacción v2 §6.6 (Terry)',
        },
        {
            id: 'D2',
            text: 'Sobre-literalizar el lenguaje figurado: tomar el lenguaje poético-cósmico literalmente cuando describe juicio histórico o realidad espiritual.',
            tipo: 'contenido',
            fuente: 'Redacción v2 §6.6 (Terry, Isaías 13)',
        },
        {
            // §8.3 la nombra entre los ejemplos de confrontación fuerte
            // ("imponer escuela escatológica como el texto") → crítica sellada.
            // NO descalifica TENER postura: descalifica ABSOLUTIZARLA.
            id: 'D3',
            text: 'Imponer una escuela escatológica como si fuera el texto: presentar una postura contestada como "lo que el texto claramente dice", sin reconocer marcos fieles distintos.',
            severidad: 'critica',
            tipo: 'contenido',
            refina: 'G4',
            fuente: 'Redacción v2 §6.6 · severidad por §8.3',
        },
    ],
    apocalypse: [
        {
            id: 'D1',
            text: 'Simbolizar todo o literalizar todo: los dos errores gemelos. Vara: la regla literal-salvo-imposible + la auto-interpretación del texto.',
            tipo: 'contenido',
            fuente: 'Redacción v2 §6.7 (Zuck)',
        },
        {
            id: 'D2',
            text: 'Descifrado especulativo del calendario: convertir el apocalíptico en mapa de eventos actuales (la bestia = un político; las langostas = los turcos). Pierde el propósito pastoral.',
            tipo: 'tratamiento',
            fuente: 'Redacción v2 §6.7 (Zuck)',
        },
        {
            // Heredado de profético y "aquí MÁS crítico" (§6.7): Apocalipsis y
            // Daniel son el campo de batalla escatológico.
            id: 'D3',
            text: 'Imponer escuela escatológica como el texto: el sistema no impone premilenial/amilenial/preterista/futurista; absolutizar una postura contestada como el sentido llano del texto descalifica.',
            severidad: 'critica',
            tipo: 'contenido',
            refina: 'G4',
            fuente: 'Redacción v2 §6.7 · severidad por §8.3',
        },
    ],
    wisdom: [
        {
            // La única severidad que el perfil declara con todas las letras. Es
            // la puerta de la teología de prosperidad.
            id: 'D1',
            text: 'Proverbio como promesa absoluta: predicar un proverbio como contrato garantizado de Dios ("sé diligente y Dios te hará rico"). Los proverbios son guías, no garantías; preceptos, no promesas.',
            severidad: 'critica',
            tipo: 'contenido',
            refina: 'G4',
            fuente: 'Redacción v2 §6.4 (Zuck, Terry) — severidad CRÍTICA declarada en el perfil',
        },
        {
            id: 'D2',
            text: 'Citar la voz equivocada en Job / literatura reflexiva como verdad: predicar palabras de los amigos de Job (que el libro REFUTA) como enseñanza del libro.',
            tipo: 'contenido',
            refina: 'G4',
            fuente: 'Redacción v2 §6.4 (Terry)',
        },
    ],
    law: [
        {
            id: 'D1',
            text: 'Aplicar mal la transferibilidad: (a) predicar una ley ceremonial/civil anulada como vigente hoy (legalismo), o (b) descartar una ley moral permanente como "eso era solo para Israel" (antinomianismo).',
            tipo: 'contenido',
            fuente: 'Redacción v2 §6.8 (McQuilkin)',
        },
        {
            id: 'D2',
            text: 'Alegorizar la ley: asignar significados místicos a los detalles legales. La ley no es alegoría.',
            tipo: 'contenido',
            fuente: 'Redacción v2 §6.8 (Terry)',
        },
    ],
    // CENTINELAS (partición sellada del enum): no son géneros predicables, así que
    // no aportan piso propio. `gospel` se disuelve por perícopa (relato /
    // parábola / discurso argumentativo) y `mixed` dispara el override socrático;
    // en ambos casos el piso lo pone el género que el pastor nombre, no estos.
    // Vacío es la respuesta CORRECTA, no un hueco por llenar.
    gospel: [],
    mixed: [],
};

/** Llaves del catálogo (para el test de invariante enum ≡ llaves). */
export const GENRE_COMPLIANCE_GENRES = Object.keys(GENRE_COMPLIANCE_CATALOG) as LiteraryGenre[];

/**
 * Los descalificadores del género, o lista vacía si el género no está en el
 * catálogo (fail-safe: el juez se queda sin piso de género y adjudica solo con
 * globales + forma, nunca inventa vara).
 */
export function genreDisqualifiersFor(genre: string | undefined): readonly Descalificador[] {
    if (!genre) return [];
    return GENRE_COMPLIANCE_CATALOG[genre as LiteraryGenre] ?? [];
}
