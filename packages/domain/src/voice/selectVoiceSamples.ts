/**
 * QUÉ SERMONES PUEDEN ENSEÑARLE AL SISTEMA CÓMO ESCRIBE EL PASTOR.
 *
 * Fase 4, sub-feature 3 (voice fingerprint), etapa 1: se eligen unos pocos
 * fragmentos de SU prosa y viajan en el prompt como ejemplo de voz. Nada sale de
 * su cuenta y nada entrena a ningún modelo: es su propio texto, en su propia
 * generación.
 *
 * LA REGLA QUE GOBIERNA TODO ESTE MÓDULO: sólo enseña la prosa que ESCRIBIÓ ÉL.
 *
 * Suena obvio y no lo es. Un sermón publicado pudo salir entero del modelo por
 * el camino de emergencia; aprender de ése sería aprender NUESTRA voz y
 * devolvérsela como si fuera la suya — un bucle que se cierra sobre sí mismo y
 * que además se vuelve más convincente en cada vuelta. `assembledFrom` es lo que
 * permite distinguirlos: `workshop` significa armado desde sus decisiones.
 *
 * Y LOS SERMONES SIN ESE DATO TAMPOCO ENTRAN. Son anteriores al campo, así que
 * no sabemos quién escribió esa prosa. La ausencia de dato no es evidencia — ni
 * a favor ni en contra— y una huella de voz construida sobre una suposición
 * suena a él sin serlo, que es exactamente lo que no queremos.
 */

export interface VoiceCandidate {
    id: string;
    title: string;
    /** El sermón renderizado. De acá salen los fragmentos. */
    content: string;
    /** Cómo se armó. Sólo `workshop` califica: ver la regla de arriba. */
    assembledFrom?: 'workshop' | 'generated';
    publishedAt?: Date;
    /** Pasajes que expone. Sirve para no repetir el del sermón en curso. */
    bibleReferences?: readonly string[];
}

export interface VoiceSample {
    sermonId: string;
    title: string;
    /** Un fragmento de su prosa, no el sermón entero. */
    excerpt: string;
}

export interface SelectVoiceSamplesOptions {
    /** Pasaje del sermón que se está escribiendo. Se evita repetirlo. */
    currentPassage?: string;
    /** Cuántos ejemplos entran en el prompt. Más no es mejor: ver abajo. */
    maxSamples?: number;
    /** Largo de cada fragmento en caracteres. */
    maxExcerptChars?: number;
}

/**
 * MÍNIMO DOS SERMONES, y no es un número puesto al azar.
 *
 * Con UNO solo, lo que se destila no es una voz: es ESE sermón. El modelo copia
 * su molde —cómo abrió, cómo cerró, de qué habló— y el resultado se parece más a
 * un remake que al pastor. Hacen falta al menos dos para que lo COMÚN entre
 * ellos se distinga de lo particular de cada uno.
 */
export const MIN_VOICE_CORPUS = 2;

const DEFAULT_MAX_SAMPLES = 2;
const DEFAULT_EXCERPT_CHARS = 900;

/** Normaliza una referencia para comparar pasajes sin depender del formato. */
function mismoPasaje(refs: readonly string[] | undefined, pasaje: string | undefined): boolean {
    if (!pasaje?.trim() || !refs?.length) return false;
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const objetivo = norm(pasaje);
    return refs.some((r) => {
        const ref = norm(r);
        return ref === objetivo || ref.startsWith(objetivo) || objetivo.startsWith(ref);
    });
}

/**
 * Recorta un fragmento representativo SIN cortar a mitad de frase.
 *
 * Se toma del CUERPO y no del principio: las primeras líneas de un sermón son
 * saludo y encuadre —lo más parecido entre un sermón y otro— y justo lo que
 * menos distingue a un predicador de otro.
 */
export function voiceExcerpt(content: string, maxChars: number): string {
    const limpio = content.replace(/\r/g, '').trim();
    if (!limpio) return '';

    // Saltar el primer tramo: título y apertura.
    const desde = Math.min(Math.floor(limpio.length * 0.25), 1200);
    const cuerpo = limpio.slice(desde);

    // Empezar en un límite de frase para no abrir a media palabra.
    const primerCorte = cuerpo.search(/[.!?]\s/);
    const inicio = primerCorte >= 0 && primerCorte < 400 ? primerCorte + 2 : 0;
    const bruto = cuerpo.slice(inicio, inicio + maxChars).trim();
    if (bruto.length < maxChars) return bruto;

    // Y cerrar en el último punto, para no dejar la frase colgando.
    const ultimo = bruto.lastIndexOf('. ');
    return ultimo > maxChars * 0.5 ? bruto.slice(0, ultimo + 1) : bruto;
}

/**
 * Elige los fragmentos que enseñarán la voz del pastor.
 *
 * Devuelve una lista VACÍA cuando no hay material del que aprender, y eso es una
 * respuesta correcta: el sermón se escribe como se escribe hoy y no se le avisa
 * de ninguna carencia. Es la misma regla que gobierna la procedencia del
 * borrador y la autoría — cuando no hay dato, no se dice nada.
 */
export function selectVoiceSamples(
    candidates: readonly VoiceCandidate[],
    options: SelectVoiceSamplesOptions = {},
): VoiceSample[] {
    const maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES;
    const maxChars = options.maxExcerptChars ?? DEFAULT_EXCERPT_CHARS;

    const suyos = candidates.filter(
        (c) => c.assembledFrom === 'workshop' && Boolean(c.content?.trim()),
    );
    if (suyos.length < MIN_VOICE_CORPUS) return [];

    // NO EL MISMO PASAJE. Un ejemplo sobre el texto que está predicando hoy
    // invita a copiar su contenido —ilustraciones, giros, conclusiones— en vez
    // de su forma, y el sermón nuevo nacería siendo el viejo.
    const otroPasaje = suyos.filter((c) => !mismoPasaje(c.bibleReferences, options.currentPassage));
    // Si TODOS son del mismo pasaje, se prefiere no enseñar nada antes que
    // enseñar a repetirse.
    if (otroPasaje.length === 0) return [];

    // Los más recientes primero: su voz de ahora, no la de hace tres años.
    const ordenados = [...otroPasaje].sort(
        (a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );

    return ordenados
        .slice(0, maxSamples)
        .map((c) => ({ sermonId: c.id, title: c.title, excerpt: voiceExcerpt(c.content, maxChars) }))
        .filter((s) => s.excerpt.length > 0);
}
