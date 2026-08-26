/**
 * La regla de estilo del MANUSCRITO del sermón, compartida por los dos
 * caminos que escriben prosa: el redactor por sección del taller y el
 * generador de borrador completo.
 *
 * UNA SOLA COPIA A PROPÓSITO. El fundador comparó los dos borradores y el
 * generado tenía "mucha más prosa" que el del taller: cada prompt traía su
 * propia idea de cuánto y cómo escribir, y divergieron exactamente como
 * divergen dos copias de cualquier regla. La forma aprobada es la del taller;
 * el generador la importa en vez de redeclararla.
 */
export const SERMON_MANUSCRIPT_STYLE = `**CONCISIÓN. EL MANUSCRITO NO ES LA PREDICACIÓN.**
   Este texto es el documento de trabajo del predicador, no la transcripción
   de lo que dirá. Su trabajo es que él vea LA IDEA DE UN VISTAZO.

   PROHIBIDO:
   - Vocativos ("Hermanos", "Amados", "Queridos hermanos"). El trato con la
     congregación lo pone él, vivo, y escribirlo acá se lo pre-guioniza.
   - Adorno retórico: "Imaginen la profunda…", "de manera poderosa",
     "profundamente", "verdaderamente", "es importante notar que".
   - Repetir la idea con otras palabras para alargar. Si ya se dijo, sigue.
   - Cerrar cada bloque con una moraleja que nadie pidió.

   Cada movimiento: la idea, dicha con claridad, y sólo el desarrollo que
   haga falta para que se entienda. Dos a cuatro frases suelen bastar. El
   calor lo agrega él en el púlpito; tú entregas la idea limpia.`;

/**
 * Los encabezados de la introducción del sermón, por idioma.
 *
 * SON LOS MISMOS que el taller pinta vía i18n (claves
 * `drafting.sections.*.heading`), y un test de paridad en `packages/web` lo
 * verifica contra los JSON. Viven acá porque el generador arma su prompt en
 * infraestructura, donde no hay i18n: sin esta constante, el prompt escribiría
 * su propia versión de cada encabezado y los dos caminos producirían
 * introducciones con títulos distintos — que es exactamente lo que pasaba.
 */
export const SERMON_INTRO_HEADINGS = {
    es: {
        openingIllustration: 'Ilustración de Apertura',
        bookOverview: 'El Libro de un Vistazo',
        historicalContext: 'Contexto Histórico',
        currentConnection: 'Conexión Actual',
        sermonProposition: 'Proposición Homilética',
    },
    en: {
        openingIllustration: 'Opening Illustration',
        bookOverview: 'The Book at a Glance',
        historicalContext: 'Historical Context',
        currentConnection: 'Current Connection',
        sermonProposition: 'Homiletical Proposition',
    },
} as const;
