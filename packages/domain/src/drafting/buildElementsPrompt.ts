import { ELEMENTS_PER_SECTION } from './SermonElement';

export interface ElementsPromptInput {
    /** Pasaje del sermón, como lo escribió el pastor. */
    passage: string;
    /** Sección para la que se proponen elementos. */
    sectionLabel: string;
    /** Qué tiene que lograr esa sección — su trabajo dentro del sermón. */
    sectionJob: string;
    /** La proposición homilética, verbatim. */
    proposition?: string;
    /** Los títulos de los puntos, verbatim. */
    points?: readonly string[];
    /**
     * La proposición que el pastor decidió para ESTE punto, si existe.
     *
     * Cuando está, es el insumo principal: los elementos de la exposición son
     * las partes que la desglosan. Proponer sin ella produce ideas sueltas
     * sobre el pasaje en vez de las piezas de SU argumento.
     */
    pointProposition?: string;
    /** Texto bíblico real de la sección, para no proponer de memoria. */
    scriptureText?: string;
    /** Lo que el pastor YA trabajó y es suyo: observaciones, principio, notas… */
    pastorWork?: readonly string[];
    /** Elementos que el pastor ya decidió para esta sección: no se repiten. */
    alreadyDecided?: readonly string[];
}

/**
 * Pide ELEMENTOS —ideas decidibles—, no prosa.
 *
 * LA DIFERENCIA NO ES COSMÉTICA. Pedir prosa produce párrafos que el pastor
 * acepta o rechaza en bloque; pedir elementos produce decisiones que puede
 * tomar una por una, y son esas decisiones las que llevan procedencia. Un texto
 * generado de una vez no tiene costuras: no hay forma de atribuir nada.
 *
 * TRES INSTRUCCIONES QUE DECIDEN SI LA PROPUESTA SIRVE:
 *
 * 1. **Específico del pasaje, no del tema.** "Hablar del contexto histórico" no
 *    es un elemento: es el nombre de la sección. "La crueldad asiria y por qué
 *    Nínive aterraba a Israel" sí lo es, porque podría ser otra cosa.
 * 2. **No repetir lo que el pastor ya decidió.** Re-proponer su trabajo es la
 *    forma más rápida de que abandone el flujo.
 * 3. **Puede proponer MENOS.** Si el pasaje no da para cinco elementos, cinco
 *    elementos son relleno. Exigir un número fijo es el mecanismo por el que se
 *    fabrica contenido — la misma lección que la cita de autoridad obligatoria.
 */
export function buildElementsPrompt(input: ElementsPromptInput): string {
    const bloque = (titulo: string, items: readonly string[] | undefined) =>
        items?.length ? `\n${titulo}\n${items.map((i) => `- ${i}`).join('\n')}\n` : '';

    return `Eres el acompañante de un pastor que está redactando un sermón. NO escribes el sermón: le ayudas a DECIDIR qué va en cada sección.

PASAJE: ${input.passage}
${input.proposition ? `\nPROPOSICIÓN HOMILÉTICA (la escribió él, es la tesis del sermón):\n"${input.proposition}"\n` : ''}${bloque('PUNTOS DEL SERMÓN:', input.points)}${bloque('LO QUE ÉL YA TRABAJÓ EN SU ESTUDIO (es suyo, respétalo):', input.pastorWork)}${bloque('YA DECIDIÓ ESTOS ELEMENTOS PARA ESTA SECCIÓN — NO los repitas ni los reformules:', input.alreadyDecided)}
${input.scriptureText ? `TEXTO BÍBLICO:\n"${input.scriptureText}"\n` : ''}${input.pointProposition ? `\nPROPOSICIÓN DE ESTE PUNTO (la escribió él):\n"${input.pointProposition}"\n\nLOS ELEMENTOS DE ESTA SECCIÓN SON LAS PARTES QUE DESGLOSAN ESA FRASE. Propón\nuno por cada concepto que ella nombra y que el texto sostenga — no ideas\nsueltas sobre el pasaje.\n` : ''}
SECCIÓN: ${input.sectionLabel}
TRABAJO DE ESTA SECCIÓN: ${input.sectionJob}

TAREA: propón entre ${ELEMENTS_PER_SECTION.min} y ${ELEMENTS_PER_SECTION.max} ELEMENTOS para esta sección.

QUÉ ES UN ELEMENTO: una idea DECIDIBLE — una afirmación o imagen concreta que
PODRÍA SER OTRA y que cambia el sermón si cambia. La prueba: ¿podría un pastor
competente elegir distinto y seguir siendo fiel al texto? Si la respuesta es no,
no es un elemento.

REGLAS:
1. **ESPECÍFICO DE ESTE PASAJE, no del tema.** "Hablar del trasfondo histórico"
   NO es un elemento: es el nombre de la sección. "La crueldad asiria y por qué
   Nínive aterraba a un israelita" SÍ lo es.
2. **Una o dos frases cada uno.** No redactes el párrafo: nombra la idea. El
   pastor decide primero y la prosa se escribe después.
3. **PROPÓN MENOS SI EL PASAJE NO DA PARA MÁS.** Es preferible ${ELEMENTS_PER_SECTION.min}
   elementos sólidos que ${ELEMENTS_PER_SECTION.max} donde tres son relleno. No
   rellenes para llegar a un número.
4. **NADA QUE NO PUEDAS SOSTENER.** Si un dato histórico es disputado, dilo
   dentro del elemento o no lo propongas. Este material va al púlpito.
5. No repitas lo que él ya decidió ni lo que ya trabajó en su estudio.

FORMATO DE SALIDA (JSON, sin texto alrededor):
{
  "elements": [
    { "text": "La idea, en una o dos frases.", "why": "Por qué sirve a ESTE sermón, en una línea." }
  ]
}`;
}
