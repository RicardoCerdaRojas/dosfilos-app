import type { SermonRepurposerInput } from '@dosfilos/domain';

/**
 * Builds the prompt that turns a published sermon into a 5-entry daily
 * devotional (Lunes a Viernes). Output is a single markdown document
 * with one section per day, each section containing a verse, reflection,
 * application, and prayer. Reuses the sermon's exegetical claims +
 * applications — does NOT introduce new ones — so the devotional stays
 * faithful to what the preacher already taught.
 */
export function buildDevotionalPrompt(input: SermonRepurposerInput): string {
    const lang = input.language;
    if (lang === 'en') {
        return [
            `You are a devotional writer adapting a preacher's already-delivered sermon into a five-day daily devotional (Monday through Friday).`,
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
            `- Five entries, one per weekday (Monday → Friday).`,
            `- Each entry is grounded in the sermon — quote or restate the sermon's exegetical claims and applications. Do NOT introduce new doctrines, illustrations, or claims that aren't in the sermon.`,
            `- Each entry includes: a verse (preferably from the sermon's passage or a closely related cross-reference the sermon already cited), a brief reflection (~120-180 words), a single concrete application for that day, and a short prayer (~40-70 words).`,
            `- The reflection should be warm, accessible, and devotional — not academic. Avoid Greek/Hebrew technicalities even when the sermon uses them; translate the insight to plain pastoral language.`,
            `- Vary the application across the five days so the reader's week has different concrete asks.`,
            ``,
            `## Output format (markdown only, no JSON, no preamble)`,
            ``,
            `# [Devotional title — short, evocative, tied to the sermon's big idea]`,
            ``,
            `Brief intro paragraph (3-5 lines) that frames the week ahead.`,
            ``,
            `## Day 1 (Monday) — [Theme]`,
            `> [Verse]`,
            ``,
            `[Reflection paragraph]`,
            ``,
            `**Today's application:** [single concrete ask]`,
            ``,
            `**Prayer:** [short prayer]`,
            ``,
            `---`,
            ``,
            `## Day 2 (Tuesday) — [Theme]`,
            `... (same structure)`,
            ``,
            `[Continue through Friday]`,
            ``,
            `Write the full devotional now. Respond entirely in English.`,
        ].join('\n');
    }
    return [
        `Eres un escritor de devocionales adaptando el sermón ya predicado por un pastor a un devocional diario de cinco entradas (Lunes a Viernes).`,
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
        `- Cinco entradas, una por día hábil (Lunes → Viernes).`,
        `- Cada entrada se ancla en el sermón — cita o reformula los planteamientos exegéticos y aplicaciones que el sermón ya hizo. NO introduzcas doctrinas, ilustraciones ni afirmaciones nuevas que no estén en el sermón.`,
        `- Cada entrada incluye: un versículo (preferentemente del pasaje del sermón o de una referencia cruzada cercana que el sermón ya citó), una reflexión breve (~120-180 palabras), una aplicación concreta única para ese día, y una oración corta (~40-70 palabras).`,
        `- La reflexión debe ser cálida, accesible y devocional — no académica. Evita tecnicismos griego/hebreo aunque el sermón los use; traduce el insight a lenguaje pastoral sencillo.`,
        `- Varía la aplicación entre los cinco días para que la semana del lector tenga pedidos concretos distintos.`,
        ``,
        `## Formato de salida (solo markdown, sin JSON ni preámbulo)`,
        ``,
        `# [Título del devocional — corto, evocativo, ligado a la idea central del sermón]`,
        ``,
        `Párrafo introductorio breve (3-5 líneas) que enmarca la semana que viene.`,
        ``,
        `## Día 1 (Lunes) — [Tema]`,
        `> [Versículo]`,
        ``,
        `[Párrafo de reflexión]`,
        ``,
        `**Aplicación de hoy:** [una sola petición concreta]`,
        ``,
        `**Oración:** [oración breve]`,
        ``,
        `---`,
        ``,
        `## Día 2 (Martes) — [Tema]`,
        `... (misma estructura)`,
        ``,
        `[Continúa hasta el Viernes]`,
        ``,
        `Escribe el devocional completo ahora. Responde completamente en español.`,
    ].join('\n');
}

export function buildDevotionalDefaultTitle(input: SermonRepurposerInput): string {
    if (input.language === 'en') {
        return `Daily devotional — ${input.sermonTitle}`;
    }
    return `Devocional diario — ${input.sermonTitle}`;
}
