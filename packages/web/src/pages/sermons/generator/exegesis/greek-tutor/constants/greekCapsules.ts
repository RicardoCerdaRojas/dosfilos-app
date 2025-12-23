/**
 * Educational capsules about Biblical Greek concepts
 * Used in the empty state of the Greek Tutor board
 */

export interface GreekCapsule {
    id: string;
    title: string;
    content: string;
    example?: string;
}

export const GREEK_CAPSULES: GreekCapsule[] = [
    {
        id: 'article',
        title: 'El Poder del Artículo Griego',
        content: `En griego, el artículo definido (ὁ, ἡ, τό) hace mucho más que en español. No solo identifica sustantivos específicos, sino que puede:

**Sustantivar cualquier palabra**: Convierte adjetivos, participios o frases enteras en sustantivos.

**Indicar énfasis**: Su presencia o ausencia puede cambiar el significado teológico de manera radical.

**Marcar sujeto/objeto**: En oraciones complejas, ayuda a identificar roles gramaticales cuando el orden de palabras es flexible.`,
        example: 'En Juan 1:1, "θεὸς ἦν ὁ λόγος" - la ausencia del artículo antes de θεὸς pero su presencia antes de λόγος es teológicamente significativa, indicando cualidad versus identidad.'
    },
    {
        id: 'aspect',
        title: 'Más Allá del Tiempo: El Aspecto Verbal',
        content: `Los tiempos verbales griegos comunican principalmente **aspecto**, no tiempo cronológico:

**Presente (Continuo)**: Énfasis en acción en progreso, continua o repetida.

**Aoristo (Puntual)**: Acción vista como un todo completo, sin énfasis en duración.

**Perfecto (Completado)**: Resultado presente de una acción completada en el pasado.

**Imperfecto (Continuo Pasado)**: Acción que continuaba o se repetía en el pasado.`,
        example: 'En Juan 3:16, "ἠγάπησεν" (aoristo) enfatiza el acto decisivo del amor de Dios, mientras que si fuera presente enfatizaría el amor continuo.'
    },
    {
        id: 'middle-voice',
        title: 'La Voz Media: Perdida en la Traducción',
        content: `El griego tiene tres voces: activa, pasiva, y **media** (inexistente en español).

**La voz media indica:**

El sujeto realiza la acción **para sí mismo** o en su propio beneficio.

El sujeto está **particularmente involucrado** en el resultado de la acción.

Énfasis en la participación personal o reflexividad del sujeto.`,
        example: 'βαπτίζομαι puede ser pasiva ("soy bautizado" por otro) o media ("me hago bautizar" - decisión personal, participación activa). En Hechos 2:38, la voz media enfatiza la respuesta personal y voluntaria.'
    },
    {
        id: 'cases',
        title: 'Los Cinco Casos Gramaticales',
        content: `El griego usa casos para mostrar la función de sustantivos y adjetivos en la oración:

**Nominativo**: Sujeto de la oración o predicado nominal.

**Genitivo**: Posesión, origen, descripción, o relación.

**Dativo**: Objeto indirecto, instrumento, ubicación, o interés personal.

**Acusativo**: Objeto directo, extensión, o dirección.

**Vocativo**: Llamado directo o invocación.`,
        example: 'En "ὁ λόγος τοῦ θεοῦ" (la palabra de Dios), θεοῦ está en genitivo mostrando posesión/origen. El mismo sustantivo en diferentes casos comunica diferentes relaciones.'
    },
    {
        id: 'genitive-absolute',
        title: 'El Genitivo Absoluto',
        content: `Una construcción gramatical única del griego que usa un participio en genitivo con su propio sujeto (también en genitivo) para expresar una circunstancia o condición.

**Características:**

Es "absoluto" porque es gramaticalmente independiente de la oración principal.

Expresa tiempo, causa, condición, o circunstancia.

El sujeto del participio es diferente al sujeto de la oración principal.`,
        example: 'En Mateo 17:5, "ἔτι αὐτοῦ λαλοῦντος" (mientras él todavía hablaba) - αὐτοῦ y λαλοῦντος están ambos en genitivo, formando una cláusula temporal independiente.'
    }
];

/**
 * Get a random capsule from the collection
 */
export function getRandomCapsule(): GreekCapsule {
    const randomIndex = Math.floor(Math.random() * GREEK_CAPSULES.length);
    return GREEK_CAPSULES[randomIndex] || GREEK_CAPSULES[0];
}

/**
 * Get a specific capsule by ID
 */
export function getCapsuleById(id: string): GreekCapsule | undefined {
    return GREEK_CAPSULES.find(capsule => capsule.id === id);
}
