/**
 * Distingue un ELEMENTO (una idea decidible) de una DIRECTIVA (un tema a
 * cubrir). ADR-037 pregunta 5.
 *
 * POR QUÉ HACE FALTA: puesto frente al campo, lo primero que sale no es
 * contenido sino ESTRUCTURA — "Autor / Fecha del libro / Período histórico con
 * años". Eso no son ideas decidibles: el contenido que las llena (Jonás hijo de
 * Amitai, Jeroboam II, siglo VIII a.C.) no admite alternativa. Registrarlas como
 * elementos propios inflaría la autoría con decisiones que no se tomaron.
 *
 * EL SESGO ES DELIBERADO Y VA HACIA `elemento`.
 *
 * Los dos errores no cuestan lo mismo. Marcar una directiva como elemento
 * regala un poco de autoría; marcar un elemento como directiva le QUITA al
 * pastor una idea que sí fue suya — y eso es lo que rompe la confianza en el
 * indicador. Ante la duda, es de él. Por eso una frase larga sin verbo
 * reconocido sale `elemento`: el catálogo de verbos es finito y el idioma no.
 *
 * NO SE LE PIDE AL PASTOR QUE CLASIFIQUE. El sistema propone y él corrige con
 * un clic si se equivocó — su corrección manda siempre.
 */
export type ContributionKind = 'elemento' | 'directiva';

/** Arriba de esto, una línea sin verbo reconocido se asume afirmación. */
const MAX_PALABRAS_TEMA = 6;

/**
 * Interrogativo al inicio, con preposición opcional delante: "en qué contexto",
 * "para cuándo", "de dónde". El pastor escribe SIN TILDES, así que la
 * comparación corre sobre el texto ya normalizado — sin eso, "estan" y "qué"
 * no se reconocen y su propia lista quedaba mal clasificada.
 */
const INTERROGATIVOS = /^\s*(?:¿)?\s*(?:(?:en|de|para|por|con|a|hacia|desde|hasta|sobre)\s+)?(?:quien|que|cuando|donde|cual|cuant|como)\b/i;

/** Primera persona del plural en subjuntivo: "citemos", "hablemos". Inequívoco. */
const EXHORTATIVO = /^\s*\w+emos\b/i;

/**
 * Formas finitas frecuentes. Catálogo CURADO, no exhaustivo a propósito: lo que
 * no reconoce cae del lado del pastor, que es el lado seguro.
 */
const VERBOS_FINITOS_RAW = [
    'es', 'era', 'fue', 'son', 'eran', 'fueron', 'sea', 'será', 'serán',
    'está', 'estaba', 'estuvo', 'están', 'estaban', 'hay', 'había', 'hubo',
    'tiene', 'tenía', 'tuvo', 'tienen', 'tenían',
    'representa', 'representaba', 'significa', 'significaba',
    'explica', 'explicaba', 'revela', 'revelaba', 'muestra', 'mostraba',
    'implica', 'implicaba', 'subraya', 'sugiere', 'apunta', 'refleja',
    'contrasta', 'confronta', 'anticipa', 'prefigura', 'aludía', 'alude',
    'dominaba', 'domina', 'aterraba', 'aterra', 'huye', 'huyó', 'llama', 'llamó',
    'habla', 'hablaba', 'dice', 'decía', 'dijo', 'hace', 'hacía', 'hizo',
    'se', 'no', // clíticos y negación acompañan verbo finito en la práctica
];

/** Quita tildes: el pastor escribe sin ellas y el catálogo las lleva. */
function sinTildes(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function palabras(texto: string): string[] {
    return sinTildes(texto)
        .toLowerCase()
        .replace(/[.,;:!¡?¿()"'“”]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

const VERBOS_FINITOS = new Set(VERBOS_FINITOS_RAW.map((v) => sinTildes(v)));

export function classifyContribution(text: string): ContributionKind {
    const limpio = text.trim();
    if (!limpio) return 'elemento';

    // Una pregunta nunca afirma nada: pide que se cubra algo.
    // SÓLO la pregunta TEMÁTICA —la que abre con un interrogativo— es directiva.
    //
    // El signo de cierre por sí solo no alcanza: una ilustración se escribe muy
    // seguido como pregunta retórica ("¿Han visto a los niños cuando hacen
    // rabietas?"), y ésa SÍ es una idea decidible — podría ser otra imagen. Con
    // la regla vieja quedaba marcada como tema y le quitaba autoría real.
    if (INTERROGATIVOS.test(sinTildes(limpio))) return 'directiva';

    // "Citemos el versículo donde…" — le habla al motor, no a la congregación.
    if (EXHORTATIVO.test(sinTildes(limpio))) return 'directiva';

    const ps = palabras(limpio);
    if (ps.some((p) => VERBOS_FINITOS.has(p))) return 'elemento';

    // Sin verbo reconocido: sólo es tema si además es CORTO. Una frase larga sin
    // verbo del catálogo es, casi siempre, una afirmación con vocabulario que el
    // catálogo no cubre — y en la duda la idea es del pastor.
    return ps.length <= MAX_PALABRAS_TEMA ? 'directiva' : 'elemento';
}
