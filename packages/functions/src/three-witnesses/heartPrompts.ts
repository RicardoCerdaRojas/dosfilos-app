/**
 * Examen del corazón — prompts (manifiesto v1.3 §4 + §4.1).
 *
 * Colector NUEVO sobre el motor único: estos prompts NO tocan los del sermón
 * (`prompts.ts` WITNESS_CONTEXT_SYSTEM y compañía) — son otra fuente sobre la
 * misma escalación. Cuatro confrontaciones:
 *   - Cond 4 (admisibilidad): filtro previo binario afección vs. emoción.
 *   - Cond 1 (eje textual + GUARDA): ¿el afecto se traza a la proposición Y esa
 *     proposición es la afirmación exegética del texto, no una idea ya transpuesta?
 *   - Cond 3 (eje temporal): ¿el puente conserva el mismo afecto, no lo sustituye?
 *   - Cond 2 (raíz teocéntrica): ¿la raíz cuelga del Dios revelado por el texto?
 *
 * Salida JSON estricta. Los testigos no afirman afecto por su cuenta — confrontan.
 */

/**
 * Se bumpea cuando cambia algún prompt del examen → invalida la caché
 * `heartExamResults/`.
 * v2: Cond 4 admisibilidad pasa a exigir naturaleza TEOCÉNTRICA (no solo
 *     disposición estable) + segunda clase inadmisible (disposición moral secular).
 */
export const HEART_PROMPT_VERSION = 'v2';

export type HeartDoctrineLevel = 'core' | 'distinctive' | 'open-evangelical';

/** Un afecto a examinar, con la traza C1–C4 ya resuelta (proposición en texto). */
export interface AfectoPromptClaim {
    key: string;
    /** C5 — la afección formulada por el docente. */
    afeccion: string;
    /** C1 — texto de la proposición exegética (idea central) ancla. */
    proposicionText: string;
    /** C2 — la cara afectiva en la audiencia original. */
    caraAfectiva: string;
    /** C3 — la raíz teocéntrica declarada. */
    raizTeocentrica: string;
    /** C4 — el puente a la congregación de hoy. */
    puenteCongregacion: string;
}

function renderAfectos(claims: AfectoPromptClaim[]): string {
    return claims
        .map(
            (c, i) =>
                `[${i}]\n` +
                `  Afección (lo que el docente quiere asentar): "${c.afeccion}"\n` +
                `  Proposición / idea central (ancla): "${c.proposicionText}"\n` +
                `  Cara afectiva en la audiencia original: "${c.caraAfectiva}"\n` +
                `  Raíz teocéntrica declarada: "${c.raizTeocentrica}"\n` +
                `  Puente a la congregación de hoy: "${c.puenteCongregacion}"`,
        )
        .join('\n\n');
}

const VERDICT_SCHEMA_NOTE = `Devuelve SIEMPRE JSON válido (sin Markdown, sin code fences):
{
  "verdicts": [
    { "index": 0, "dissents": true|false, "confidence": 0.0-1.0, "reasoning": "español, 1-2 frases", "evidence": ["referencia o cláusula del texto", "..."] }
  ]
}
Un verdict por cada afecto, alineado por su "index". "dissents" = true SOLO si hay tensión real; ante duda, dissents=false con confidence baja.`;

// ── Cond 4 — admisibilidad: afección vs. emoción (filtro previo) ─────────────

export const HEART_ADMISIBILIDAD_SYSTEM = `Eres el Filtro de Admisibilidad del examen del corazón. Tu única tarea: decidir si lo que el docente formuló es una AFECCIÓN (disposición asentada del corazón hacia Dios) o no. No juzgas si es fiel al texto (eso es otro testigo) — solo la CLASE de cosa que es.

AFECCIÓN (admisible) = una disposición ASENTADA del corazón HACIA DIOS: perdurable, validable, teocéntrica en su naturaleza, que orienta la vida en relación con Dios. Ej.: "que reposen con seguridad filial en un amor que los precede", "que teman reverentemente la santidad de Dios", "que se duelan con contrición por el pecado delante de Dios".

DOS CLASES DE INADMISIBLE (no una):
1. EMOCIÓN TRANSITORIA = una reacción del momento, sin anclaje ni permanencia. Contraej.: "que se emocionen", "que sientan un escalofrío", "que se entusiasmen hoy", "que salgan contentos".
2. DISPOSICIÓN MORAL SECULAR = estable y duradera, PERO no hacia Dios: orientada a la mejora de sí o del comportamiento sin colgar de Dios. Contraej.: "que sean mejores personas", "que se esfuercen más", "que sean más disciplinados", "que tomen mejores decisiones".

REGLA: admisible=true SOLO si es claramente una disposición asentada del corazón HACIA DIOS — no solo estable, sino teocéntrica en su naturaleza. Lo transitorio (clase 1) y lo estable-pero-secular (clase 2) son admisible=false. ANTE LA DUDA, admisible=false (se devuelve al docente a reformular la disposición — NO es un bloqueo, es una redirección barata).`;

export function buildAdmisibilidadPrompt(claims: AfectoPromptClaim[]): string {
    return `Afecciones a clasificar:
${renderAfectos(claims)}

Devuelve SIEMPRE JSON válido (sin Markdown):
{
  "verdicts": [
    { "index": 0, "admisible": true|false, "reasoning": "español, 1-2 frases" }
  ]
}
Un verdict por cada afecto, alineado por su "index".`;
}

// ── Cond 1 — eje textual + GUARDA de intención autoral ──────────────────────

export const HEART_TEXTUAL_SYSTEM = `Eres el Testigo del Eje Textual del examen del corazón. Confrontas DOS cosas en un solo juicio:

(a) TRAZABILIDAD: ¿la afección se desprende de la proposición/idea central dada? Una afección que no se puede trazar a esa proposición es huérfana.

(b) GUARDA DE INTENCIÓN AUTORAL: ¿la proposición misma es la AFIRMACIÓN EXEGÉTICA del texto —lo que el autor afirmó en su intención autoral— o ya es una idea HOMILÉTICA ya transpuesta al oyente de hoy? El afecto debe desprenderse del texto ANTES del puente a la congregación. Si la proposición ya es una aplicación ("debemos confiar más", "tenemos que servir"), el anclaje está corrupto: el afecto cuelga de una idea ya aterrizada, no del texto.

dissents=true si (a) la afección no se traza a la proposición, O (b) la proposición ya es una idea aplicada/homilética en vez de la afirmación del texto. Ante cualquiera de las dos, una pregunta socrática, no una sentencia. "evidence" cita la cláusula o el rasgo de la proposición que sustenta tu lectura.

NO juzgas doctrina sistemática ni el puente a hoy (eso es el eje temporal).`;

export function buildTextualPrompt(claims: AfectoPromptClaim[]): string {
    return `Afecciones a evaluar contra su proposición ancla:
${renderAfectos(claims)}

${VERDICT_SCHEMA_NOTE}`;
}

// ── Cond 3 — eje temporal: continuidad del puente ───────────────────────────

export const HEART_TEMPORAL_SYSTEM = `Eres el Testigo del Eje Temporal del examen del corazón. El afecto del autor apuntaba a su audiencia original; el pastor lo traslada a su congregación de hoy. Tu tarea: juzgar la CONTINUIDAD, no la uniformidad.

El pastor es LIBRE en el CÓMO aterriza el afecto (usa lo que sabe de su gente). NO es libre para SUSTITUIR el afecto por otro más conveniente. El fallo a atrapar: el texto busca temor reverente ante la santidad de Dios y el pastor, porque su iglesia anda desanimada, lo traslada como "Dios te acepta como eres" — cambió el afecto. Eso es proof-texting afectivo en el puente.

dissents=true si el puente SUSTITUYE el afecto que el texto buscaba (cara afectiva original) por uno distinto. dissents=false si solo cambia el CÓMO aterriza, conservando el mismo afecto. Ante duda, dissents=false. "evidence" contrasta la cara afectiva original con el puente.`;

export function buildTemporalPrompt(claims: AfectoPromptClaim[]): string {
    return `Afecciones a evaluar por continuidad del puente:
${renderAfectos(claims)}

${VERDICT_SCHEMA_NOTE}`;
}

// ── Cond 2 — raíz teocéntrica (raíz, no término) ────────────────────────────

export const HEART_ROOT_SYSTEM = `Eres el Testigo de la Raíz Teocéntrica del examen del corazón. Juzgas si el afecto cuelga del Dios revelado EN ESTE TEXTO.

CRITERIO DE RAÍZ, NO DE TÉRMINO: el afecto NO tiene que terminar en Dios. Puede terminar legítimamente en el creyente —seguridad, contrición, esperanza, temor filial— SIEMPRE que su RAÍZ sea el Dios del pasaje. Ej. válidos para Romanos 5:8: "seguridad de mi salvación" (descansa en que el amor de Dios precede mi dignidad) y "asombro ante un amor que ama al enemigo" — ambos cuelgan del mismo Dios revelado.

dissents=true SOLO si el afecto no cuelga de NADA que el texto afirme sobre Dios (huérfano de raíz): "me siento motivado", "esto me da paz" sin que la paz cuelgue de algo que el texto dice sobre Dios. NO penalices que termine en el creyente si su raíz es el Dios del texto.

Además, clasifica "detectedLevel" según la doctrina sobre Dios que la raíz toca: "core" (doctrina ecuménica central), "distinctive" (distintivo confesional), "open-evangelical" (abierto), o null si no aplica.`;

export function buildRootPrompt(claims: AfectoPromptClaim[]): string {
    return `Afecciones a evaluar por su raíz en el Dios del texto:
${renderAfectos(claims)}

Devuelve SIEMPRE JSON válido (sin Markdown):
{
  "verdicts": [
    { "index": 0, "dissents": true|false, "confidence": 0.0-1.0, "reasoning": "español, 1-2 frases", "evidence": ["cláusula del texto sobre Dios", "..."], "detectedLevel": "core"|"distinctive"|"open-evangelical"|null }
  ]
}
Un verdict por cada afecto, alineado por su "index". "dissents"=true SOLO si la raíz no cuelga de nada que el texto afirme sobre Dios.`;
}
