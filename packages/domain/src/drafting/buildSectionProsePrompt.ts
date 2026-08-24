import type { SermonElement } from './SermonElement';
import type { WalkSection } from './deriveSectionWalk';

export interface SectionProseInput {
    section: WalkSection;
    /** Etiqueta y trabajo de la sección, ya traducidos por quien llama. */
    sectionLabel: string;
    sectionJob: string;
    /** Lo que el pastor decidió para esta sección. Sin descartados. */
    elements: readonly SermonElement[];
    passage: string;
    proposition?: string;
    /** Título del punto al que pertenece la sección, verbatim. */
    pointTitle?: string;
    /** Registro del sermón: cómo habla este pastor a su congregación. */
    audienceRigor?: 'beginner' | 'seminary';
}

const VINETA = (t: string) => `- ${t}`;

/**
 * Escribe la prosa de UNA sección A PARTIR de lo que el pastor decidió.
 *
 * ESTE ES EL PROMPT QUE HACE QUE TODO EL FLUJO SIGNIFIQUE ALGO. Sin él, las
 * decisiones se guardan y el sermón se genera igual que antes — ideas que se
 * piden, se muestran y nadie lee.
 *
 * LA RESTRICCIÓN CENTRAL NO ES DE ESTILO, ES DE HONESTIDAD DE LA MEDICIÓN. El
 * modelo DESARROLLA lo decidido y NO AGREGA ideas propias. Si contrabandea
 * contenido que el pastor no decidió, la procedencia deja de describir el
 * sermón: la pantalla diría que las ideas son suyas mientras el texto lleva
 * otras que nunca vio.
 *
 * ELEMENTOS Y DIRECTIVAS SE TRATAN DISTINTO, y es la razón de que el modelo de
 * datos los separe:
 *   - Un ELEMENTO es una idea que él tuvo. Se DESARROLLA sin cambiarla.
 *   - Una DIRECTIVA es un tema que él mandó cubrir. Ahí el modelo SÍ aporta el
 *     contenido, porque eso fue lo que se le pidió.
 *
 * Mezclarlos rompe las dos direcciones: desarrollar una directiva deja el tema
 * sin cubrir, y "cubrir" un elemento invita a reemplazar su idea por otra.
 */
export function buildSectionProsePrompt(input: SectionProseInput): string {
    const vivos = input.elements.filter((e) => e.provenance !== 'descartado');
    const ideas = vivos.filter((e) => e.kind === 'elemento');
    const temas = vivos.filter((e) => e.kind === 'directiva');

    const bloqueIdeas = ideas.length
        ? `\nIDEAS QUE ÉL DECIDIÓ (desarróllalas; NO las reemplaces ni las corrijas):\n${ideas.map((e) => VINETA(e.text)).join('\n')}\n`
        : '';
    const bloqueTemas = temas.length
        ? `\nTEMAS QUE ÉL MANDÓ CUBRIR (acá SÍ aportas el contenido, porque eso te pidió):\n${temas.map((e) => VINETA(e.text)).join('\n')}\n`
        : '';

    /**
     * UN ELEMENTO, UN MOVIMIENTO — cuando hay varios.
     *
     * La prosa corrida FUNDE las ideas: el oyente no puede seguir dónde termina
     * una y empieza la otra, y el pastor pierde la estructura con la que las
     * pensó. Desarrollar una por una es cómo se predica un punto con varias
     * partes, y además deja el texto AUDITABLE contra las decisiones: se ve qué
     * párrafo salió de qué idea.
     *
     * Con UNA sola idea no hay nada que separar: ahí la lista sería andamiaje
     * vacío, y una ilustración partida en viñetas deja de ser una ilustración.
     */
    const estructura =
        ideas.length + temas.length > 1
            ? `   Abre citando el texto bíblico que se está exponiendo, si la sección lo
   expone. Después desarrolla UNA IDEA POR MOVIMIENTO, en el orden en que
   están arriba: cada idea recibe su propio bloque, con su propio desarrollo.
   Puedes usar viñetas para separarlos. NO fundas dos ideas en un mismo
   párrafo — el oyente tiene que poder seguir una a la vez.`
            : `   Es una sola idea: escríbela como un párrafo continuo. No la partas en
   viñetas — sin varias partes que separar, la lista es andamiaje vacío.`;

    const registro =
        input.audienceRigor === 'seminary'
            ? 'Registro técnico: puedes usar vocabulario exegético sin explicarlo.'
            : 'Registro llano: si aparece un término técnico, explícalo en la misma frase.';

    return `Eres el redactor del sermón de un pastor. Él YA DECIDIÓ qué dice esta sección. Tu trabajo es escribirla, no pensarla.

PASAJE: ${input.passage}
${input.proposition ? `PROPOSICIÓN DEL SERMÓN: "${input.proposition}"\n` : ''}${input.pointTitle ? `PUNTO AL QUE PERTENECE: "${input.pointTitle}"\n` : ''}
SECCIÓN: ${input.sectionLabel}
TRABAJO DE LA SECCIÓN: ${input.sectionJob}
${bloqueIdeas}${bloqueTemas}
REGLAS — LAS TRES PRIMERAS NO SON NEGOCIABLES:

1. **NO AGREGUES IDEAS QUE ÉL NO DECIDIÓ.** Ésta es la regla que sostiene todo
   lo demás. Si crees que falta algo, NO lo agregues: escribe sólo lo decidido.
   Contrabandear contenido hace que el sermón lleve ideas que él nunca vio.

2. **DESARROLLA LAS IDEAS, NO LAS SUSTITUYAS.** Cada idea decidida tiene que
   aparecer en el texto, reconocible. Puedes darle forma, ordenarla y conectarla
   con las otras; no puedes cambiarla por una mejor.

3. **NO INVENTES CITAS NI DATOS.** Nada de citas atribuidas a autores, cifras,
   fechas ni referencias que no vengan de arriba. Una cita inventada en el
   púlpito destruye la credibilidad del predicador. Si un dato haría falta y no
   lo tienes, escribe la frase sin él.

4. **LA FORMA DEL TEXTO SIGUE LA FORMA DE LO DECIDIDO.**
${estructura}

5. ${registro}

6. Frases para SER LEÍDAS EN VOZ ALTA: cortas, sin subtítulos.

7. Escribe en la voz del predicador dirigiéndose a su congregación. Nada de
   meta-comentarios ("en esta sección veremos"), nada de encabezados.

SALIDA: sólo la prosa de la sección. Sin título, sin comillas, sin explicación.`;
}
