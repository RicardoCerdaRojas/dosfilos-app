/**
 * LOS USOS DEL ARTÍCULO GRIEGO — taxonomía cerrada (Wallace, *Greek Grammar
 * Beyond the Basics*, cap. "The Article").
 *
 * El artículo es la llave del griego y era nuestra palabra peor explicada:
 * mostrábamos su paradigma y nada más. Pero el artículo griego NO es "el/la"
 * español — hace trabajos que el castellano reparte entre otros recursos o
 * simplemente no marca.
 *
 * EL CASO QUE LO MOTIVÓ: Santiago 1:4 abre con ἡ δὲ ὑπομονή — un versículo
 * que empieza con artículo. No es adorno: es ANAFÓRICO, señala hacia atrás,
 * a la ὑπομονήν que el v.3 acaba de introducir. "Y ESA paciencia (la que
 * acabo de nombrar)…". Sin explicarlo, el pastor ve un artículo suelto donde
 * hay un hilo argumental entre versículos.
 *
 * Cerrada por la misma razón que `CASE_FUNCTIONS`: la etiqueta la elige el
 * modelo, y con libertad inventaría categorías que ningún profesor reconoce.
 */
export const ARTICLE_USES = [
    'anaphoric',      // señala hacia atrás: lo ya mencionado
    'deictic',        // señala algo presente en la escena
    'parExcellence',  // EL por antonomasia (el Profeta, el Cristo)
    'monadic',        // el único de su clase (el sol, el diablo)
    'wellKnown',      // el conocido por todos
    'generic',        // la clase entera (el hombre = los seres humanos)
    'abstract',       // sustantiva una cualidad (la fe, el amor)
    'possessive',     // hace de posesivo ("levantó LA mano" = su mano)
    'substantivizer', // convierte en sustantivo un infinitivo, adjetivo o frase
    'withProperName', // con nombre propio: familiaridad o retoma
] as const;

export type ArticleUse = (typeof ARTICLE_USES)[number];

export function isKnownArticleUse(id: string): id is ArticleUse {
    return (ARTICLE_USES as readonly string[]).includes(id);
}
