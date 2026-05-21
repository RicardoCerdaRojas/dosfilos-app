import type { SermonRepurposerInput } from '@dosfilos/domain';

/**
 * Builds the prompt that turns a published sermon into a small-group
 * Bible study guide. Output is a single markdown document with: a
 * one-paragraph passage summary anchored in the sermon, 8-12 discussion
 * questions (observation → interpretation → application progression),
 * a closing prayer prompt, and optional homework. Reuses the sermon's
 * exegetical work; does not introduce new claims.
 */
export function buildStudyGuidePrompt(input: SermonRepurposerInput): string {
    const lang = input.language;
    if (lang === 'en') {
        return [
            `You are a small-group facilitator adapting a preacher's already-delivered sermon into a Bible study guide for a mid-week group of 6-12 adults.`,
            ``,
            `**Parent sermon**`,
            `- Title: ${input.sermonTitle}`,
            `- Passage: ${input.passage}`,
            ``,
            `--- SERMON BEGIN ---`,
            input.sermonMarkdown,
            `--- SERMON END ---`,
            ``,
            `## Rules`,
            `- Anchor every question in the sermon's actual content. Do NOT introduce new doctrines or claims; the guide deepens what the preacher already said.`,
            `- 8-12 discussion questions total, ordered as: observation (what does the text say?) → interpretation (what does it mean?) → application (what do we do with it?). At least 3 of each, with one bridging question between observation and interpretation.`,
            `- Questions are open-ended (not yes/no), encourage Scripture use ("turn to verse X"), and assume a mixed group (some new believers, some mature) — calibrate so a new believer can engage but a mature believer isn't bored.`,
            `- Include verse references inline so the facilitator can prompt readings.`,
            ``,
            `## Output format (markdown only, no JSON, no preamble)`,
            ``,
            `# [Study guide title — clear, ties to the sermon]`,
            ``,
            `**Passage:** ${input.passage}`,
            `**Suggested duration:** 60-75 minutes`,
            ``,
            `## Opening (5 min)`,
            `One sentence the facilitator reads to set context, plus a brief "icebreaker" question that warms the group toward the passage's theme.`,
            ``,
            `## Read the passage (10 min)`,
            `Brief facilitator note: how to read together (one voice, round-robin, paraphrase, etc.) + a one-paragraph summary anchored in the sermon (what's at stake in this text).`,
            ``,
            `## Observation questions (~15 min)`,
            `1. [Question]`,
            `2. [Question]`,
            `3. [Question]`,
            ``,
            `## Interpretation questions (~20 min)`,
            `4. [Question]`,
            `... (continue)`,
            ``,
            `## Application questions (~20 min)`,
            `... (continue)`,
            ``,
            `## Closing prayer prompt (5 min)`,
            `Two or three concrete prayer prompts tied to the application questions.`,
            ``,
            `## Optional homework for next week`,
            `One actionable item the group commits to before the next meeting.`,
            ``,
            `Write the full study guide now. Respond entirely in English.`,
        ].join('\n');
    }
    return [
        `Eres un facilitador de grupo pequeño adaptando el sermón ya predicado por un pastor a una guía de estudio bíblico para un grupo de 6-12 adultos a mitad de semana.`,
        ``,
        `**Sermón fuente**`,
        `- Título: ${input.sermonTitle}`,
        `- Pasaje: ${input.passage}`,
        ``,
        `--- SERMÓN INICIO ---`,
        input.sermonMarkdown,
        `--- SERMÓN FIN ---`,
        ``,
        `## Reglas`,
        `- Ancla cada pregunta en el contenido real del sermón. NO introduzcas doctrinas ni planteamientos nuevos; la guía profundiza lo que el predicador ya dijo.`,
        `- 8-12 preguntas de discusión en total, ordenadas como: observación (¿qué dice el texto?) → interpretación (¿qué significa?) → aplicación (¿qué hacemos con ello?). Al menos 3 de cada, con una pregunta puente entre observación e interpretación.`,
        `- Las preguntas son abiertas (no sí/no), invitan a leer la Escritura ("vayan al versículo X"), y asumen un grupo mixto (algunos creyentes nuevos, otros maduros) — calíbralas para que un creyente nuevo participe pero uno maduro no se aburra.`,
        `- Incluye referencias bíblicas en línea para que el facilitador invite lecturas.`,
        ``,
        `## Formato de salida (solo markdown, sin JSON ni preámbulo)`,
        ``,
        `# [Título de la guía — claro, ligado al sermón]`,
        ``,
        `**Pasaje:** ${input.passage}`,
        `**Duración sugerida:** 60-75 minutos`,
        ``,
        `## Apertura (5 min)`,
        `Una oración que el facilitador lea para enmarcar el contexto, más una pregunta breve de "rompehielo" que acerque al grupo al tema del pasaje.`,
        ``,
        `## Lectura del pasaje (10 min)`,
        `Nota breve al facilitador: cómo leer juntos (una voz, ronda, paráfrasis, etc.) + un párrafo de resumen anclado en el sermón (qué está en juego en este texto).`,
        ``,
        `## Preguntas de observación (~15 min)`,
        `1. [Pregunta]`,
        `2. [Pregunta]`,
        `3. [Pregunta]`,
        ``,
        `## Preguntas de interpretación (~20 min)`,
        `4. [Pregunta]`,
        `... (continúa)`,
        ``,
        `## Preguntas de aplicación (~20 min)`,
        `... (continúa)`,
        ``,
        `## Cierre con oración (5 min)`,
        `Dos o tres peticiones concretas de oración ligadas a las preguntas de aplicación.`,
        ``,
        `## Tarea opcional para la próxima semana`,
        `Un compromiso accionable que el grupo asume antes de la próxima reunión.`,
        ``,
        `Escribe la guía completa ahora. Responde completamente en español.`,
    ].join('\n');
}

export function buildStudyGuideDefaultTitle(input: SermonRepurposerInput): string {
    if (input.language === 'en') {
        return `Study guide — ${input.sermonTitle}`;
    }
    return `Guía de estudio — ${input.sermonTitle}`;
}
