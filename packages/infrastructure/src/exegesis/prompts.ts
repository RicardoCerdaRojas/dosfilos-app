import {
    formatPassageReference,
    type ExegesisGenerationInput,
    type ExegesisPriorStep,
    type ExegesisSourceContext,
    type SourceType,
} from '@dosfilos/domain';

/**
 * Prompt templates for exegetical step generation.
 *
 * Distilled from the user's TMS-style template prompt for Hebrews 1:1-4
 * but generalized so a single set of templates serves any single-chapter
 * passage. Per-step-kind variants emphasize different exegetical work:
 *
 *   verse        — translation + decisions + morphology + syntax + source
 *                  interaction + own position + verse-level conclusion
 *   conclusion   — synthesizes accepted verses; introduces NO new arguments
 *   introduction — written last; presents thesis derived from the body,
 *                  brief methodology, and direction of argument
 *
 * Citation discipline is encoded throughout: every assertion that comes
 * from a source must include `(Author, "Title", p. N)`; verbatim quotes
 * use exact strings; paraphrases never use quotes; 'model-paper' role
 * sources are consumed for STYLE only and explicitly NOT cited inline.
 *
 * Output language is enforced both via the system prompt and the user
 * message preamble (defense-in-depth) — the model emits Spanish or
 * English regardless of which language the corpus chunks are in.
 */

const STYLE_GUIDE_BUDGET_CHARS = 30_000;
const SOURCE_BUDGET_CHARS_TOTAL = 250_000;

interface BuiltPrompt {
    systemInstruction: string;
    userMessage: string;
}

export function buildPrompt(input: ExegesisGenerationInput): BuiltPrompt {
    return {
        systemInstruction: buildSystemInstruction(input),
        userMessage: buildUserMessage(input),
    };
}

// ── System instruction ──────────────────────────────────────────────────

function buildSystemInstruction(input: ExegesisGenerationInput): string {
    const lang = input.language;
    const passage = formatPassageReference(input.paperPassage, lang);
    const styleGuideBlock = formatStyleGuide(input.styleGuideContent, lang);

    if (lang === 'en') {
        return [
            `You are an academic assistant in New Testament exegesis, biblical Greek, morphological/syntactic analysis, textual criticism, biblical theology, and academic writing in The Master's Seminary style.`,
            ``,
            `## Your task`,
            `Produce an integrated translation and exegetical analysis on **${passage}**, working ${stepKindDescription(input.kind, lang)}.`,
            ``,
            `## Hermeneutic stance`,
            `Historical-grammatical-literal. Prioritize: authorial sense, Greek grammar, clause syntax, argumentative flow of the book, immediate literary context, OT intertextuality, biblical theology that emerges from the passage. NO allegorizing. NO doctrinal conclusions not supported by the text.`,
            ``,
            `## Citation discipline (NON-NEGOTIABLE)`,
            `- Every claim drawn from a source MUST include an inline citation in the format: \`(Author, "Title", p. N)\`. If page is unavailable: \`(Author, "Title")\`.`,
            `- Verbatim quotes are only allowed when wrapped in double quotes AND the exact wording appears in the cited source. If you are paraphrasing, do NOT use quotes.`,
            `- NEVER attribute to an author a conclusion they don't explicitly state. If a source merely *suggests*, write "X suggests" — not "X demonstrates".`,
            `- NEVER cite yourself as a source. You are a tutor, not a bibliography entry.`,
            `- 'Model paper' sources (when present) are STYLE templates only. NEVER produce inline citations from them.`,
            `- For ideas drawn from your own general knowledge (not from the configured corpus), use language like "according to theological tradition…" or "classical commentators hold…".`,
            ``,
            `## Style guide (MUST follow strictly)`,
            styleGuideBlock,
            ``,
            `## Tone and register`,
            `A diligent seminary student doing rigorous exegesis. Sober academic prose. Avoid devotional language as a substitute for analysis.`,
        ].join('\n');
    }

    return [
        `Sos un asistente académico experto en exégesis del Nuevo Testamento, griego bíblico, análisis morfológico/sintáctico, crítica textual, teología bíblica y redacción académica en estilo The Master's Seminary.`,
        ``,
        `## Tu tarea`,
        `Producir traducción y análisis exegético integrado sobre **${passage}**, trabajando ${stepKindDescription(input.kind, lang)}.`,
        ``,
        `## Postura hermenéutica`,
        `Histórico-gramatical-literal. Priorizá: sentido autoral, gramática griega, sintaxis de cláusulas, flujo argumentativo del libro, contexto literario inmediato, intertextualidad con el AT, teología bíblica que emerge del pasaje. NO alegorices. NO fuerces conclusiones doctrinales que no estén sustentadas por el texto.`,
        ``,
        `## Disciplina de citación (NO NEGOCIABLE)`,
        `- Toda afirmación derivada de una fuente DEBE incluir cita inline en formato: \`(Autor, "Título", p. N)\`. Si no hay página disponible: \`(Autor, "Título")\`.`,
        `- Las citas verbatim solo van entre comillas dobles Y cuando la frase exacta aparece en la fuente citada. Si parafraseás, NO uses comillas.`,
        `- NUNCA atribuyas a un autor una conclusión que no afirma explícitamente. Si una fuente solo *sugiere*, escribí "X sugiere" — no "X demuestra".`,
        `- NUNCA te cites a ti mismo como fuente. Sos un tutor, no una entrada bibliográfica.`,
        `- Las fuentes con rol 'trabajo modelo' (cuando estén presentes) son plantillas de ESTILO únicamente. NUNCA produzcas citas inline desde ellas.`,
        `- Para ideas que provengan de tu conocimiento general (no del corpus configurado), usá frases como "según la tradición teológica…" o "los comentaristas clásicos sostienen…".`,
        ``,
        `## Guía de estilo (debe seguirse estrictamente)`,
        styleGuideBlock,
        ``,
        `## Tono y registro`,
        `Un estudiante de seminario diligente haciendo exégesis rigurosa. Prosa académica sobria. Evitá el lenguaje devocional como sustituto del análisis.`,
    ].join('\n');
}

// ── User message ────────────────────────────────────────────────────────

function buildUserMessage(input: ExegesisGenerationInput): string {
    const lang = input.language;
    const sources = formatSources(input.sources, lang);
    const priorBlock = formatPriorSteps(input.priorAcceptedSteps, lang);
    const hint = input.regenerationHint
        ? (lang === 'en'
            ? `\n\n### Regeneration hint from the user\n${input.regenerationHint}\n`
            : `\n\n### Hint de regeneración del usuario\n${input.regenerationHint}\n`)
        : '';

    if (input.kind === 'verse' && input.verseRef) {
        const verse = formatPassageReference(input.verseRef, lang);
        const expected = lang === 'en'
            ? [
                `1. Present the Greek text of ${verse}.`,
                `2. Present your own translation.`,
                `3. Explain the main translation decisions.`,
                `4. Morphological analysis of relevant forms.`,
                `5. Syntactic analysis of clauses, participles, genitives, prepositional phrases, modifiers, and internal relations.`,
                `6. Interact with the configured sources by name and page.`,
                `7. Take an explicit position on the main translation decisions.`,
                `8. Close with a brief exegetical conclusion explaining how this verse contributes to the argument of ${formatPassageReference(input.paperPassage, lang)}.`,
            ].join('\n')
            : [
                `1. Presentá el texto griego de ${verse}.`,
                `2. Presentá tu traducción propia.`,
                `3. Explicá las decisiones principales de traducción.`,
                `4. Análisis morfológico de las formas relevantes.`,
                `5. Análisis sintáctico de cláusulas, participios, genitivos, frases preposicionales, modificadores y relaciones internas.`,
                `6. Interactuá con las fuentes configuradas por nombre y página.`,
                `7. Tomá posición explícita sobre las principales decisiones de traducción.`,
                `8. Cerrá con una conclusión exegética breve sobre cómo este verso contribuye al argumento de ${formatPassageReference(input.paperPassage, lang)}.`,
            ].join('\n');
        return [
            lang === 'en'
                ? `Generate the section for **${verse}**, in the integrated style described in the system prompt.`
                : `Generá la sección para **${verse}**, en el estilo integrado descripto en el system prompt.`,
            '',
            lang === 'en' ? '### Sources at your disposal' : '### Fuentes disponibles',
            sources,
            '',
            lang === 'en' ? '### Expected structure' : '### Estructura esperada',
            expected,
            hint,
        ].join('\n');
    }

    if (input.kind === 'conclusion') {
        return [
            lang === 'en'
                ? `Write the **Conclusion** for the paper on ${formatPassageReference(input.paperPassage, lang)}.`
                : `Escribí la **Conclusión** del trabajo sobre ${formatPassageReference(input.paperPassage, lang)}.`,
            '',
            lang === 'en'
                ? `**Hard rules for the conclusion:**\n- Summarize the actual results of the verse-by-verse analyses below.\n- Do NOT introduce new arguments.\n- Show how the passage develops its main themes (identity, work, theological emphasis).\n- Respond to the working thesis the body's analyses have built.`
                : `**Reglas duras para la conclusión:**\n- Resumí los resultados reales de los análisis verso a verso de abajo.\n- NO introduzcas argumentos nuevos.\n- Mostrá cómo el pasaje desarrolla sus temas principales (identidad, obra, énfasis teológico).\n- Respondé a la tesis de trabajo que los análisis del cuerpo construyeron.`,
            '',
            lang === 'en' ? '### Accepted verse-level analyses' : '### Análisis verso a verso aceptados',
            priorBlock,
            '',
            lang === 'en' ? '### Sources at your disposal (use sparingly here)' : '### Fuentes disponibles (usalas con moderación acá)',
            sources,
            hint,
        ].join('\n');
    }

    // introduction
    return [
        lang === 'en'
            ? `Write the **Introduction** for the paper on ${formatPassageReference(input.paperPassage, lang)}.`
            : `Escribí la **Introducción** del trabajo sobre ${formatPassageReference(input.paperPassage, lang)}.`,
        '',
        lang === 'en'
            ? `**Hard rules for the introduction:**\n- Written LAST so it reflects what the paper actually demonstrated.\n- Present the passage and its importance within its book.\n- State a precise thesis derived from the body's analyses.\n- Briefly state methodology (morphological, syntactic, lexical, intertextual, theological).\n- Sketch the direction of the argument.\n- Do NOT promise topics that the body did not develop.`
            : `**Reglas duras para la introducción:**\n- Se redacta AL FINAL para reflejar lo que el trabajo efectivamente demostró.\n- Presentá el pasaje y su importancia dentro del libro.\n- Enunciá una tesis precisa derivada de los análisis del cuerpo.\n- Declará brevemente la metodología (morfológica, sintáctica, léxica, intertextual, teológica).\n- Esbozá la dirección del argumento.\n- NO prometas temas que el cuerpo no desarrolló.`,
        '',
        lang === 'en' ? '### Accepted body (verses + conclusion)' : '### Cuerpo aceptado (versos + conclusión)',
        priorBlock,
        '',
        lang === 'en' ? '### Sources at your disposal (background context only)' : '### Fuentes disponibles (solo como contexto de fondo)',
        sources,
        hint,
    ].join('\n');
}

// ── Formatters ──────────────────────────────────────────────────────────

function stepKindDescription(kind: ExegesisGenerationInput['kind'], lang: 'es' | 'en'): string {
    if (lang === 'en') {
        if (kind === 'verse') return `at the granularity of a single verse`;
        if (kind === 'conclusion') return `the conclusion of the paper, synthesizing the accepted verse-level analyses without introducing new arguments`;
        return `the introduction of the paper, written LAST so it reflects what the analysis actually demonstrated`;
    }
    if (kind === 'verse') return `a nivel de un solo verso`;
    if (kind === 'conclusion') return `la conclusión del trabajo, sintetizando los análisis verso a verso aceptados sin introducir argumentos nuevos`;
    return `la introducción del trabajo, escrita AL FINAL para reflejar lo que el análisis efectivamente demostró`;
}

function formatStyleGuide(content: string, lang: 'es' | 'en'): string {
    if (!content || !content.trim()) {
        return lang === 'en'
            ? `(No style guide attached. Default to The Master's Seminary conventions for footnotes, bibliography, and citation format.)`
            : `(No hay guía de estilo adjunta. Aplicá por defecto las convenciones de The Master's Seminary para notas al pie, bibliografía y formato de citas.)`;
    }
    const truncated = truncate(content, STYLE_GUIDE_BUDGET_CHARS);
    return ['```', truncated, '```'].join('\n');
}

function formatSources(sources: ExegesisSourceContext[], lang: 'es' | 'en'): string {
    if (sources.length === 0) {
        return lang === 'en'
            ? `(No sources configured for this paper. Lean on your general knowledge and signal it with "according to theological tradition…" / "classical commentators hold…".)`
            : `(Sin fuentes configuradas para este trabajo. Apoyate en tu conocimiento general y señalalo con "según la tradición teológica…" / "los comentaristas clásicos sostienen…".)`;
    }

    // Allocate budget per source proportionally — critical commentaries and
    // technical lexicons get more room than supportive material. Style-only
    // sources (`style-template-paper`) get a small slice since the model
    // only needs to absorb the SHAPE.
    const totalBudget = SOURCE_BUDGET_CHARS_TOTAL;
    const weights = sources.map(s => sourceTypeWeight(s.sourceType));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
    const budgets = weights.map(w => Math.floor(totalBudget * (w / totalWeight)));

    const blocks = sources.map((s, i) => {
        const truncated = truncate(s.textContent, budgets[i]!);
        const typeLabel = lang === 'en' ? englishTypeLabel(s.sourceType) : spanishTypeLabel(s.sourceType);
        const citationKey = s.citationKey ? ` · key: ${s.citationKey}` : '';
        const usageNote = s.sourceType === 'style-template-paper'
            ? (lang === 'en' ? ' · STYLE TEMPLATE ONLY — do NOT cite inline' : ' · SOLO PLANTILLA DE ESTILO — NO citar inline')
            : '';
        return [
            `### ${s.displayLabel}`,
            `_${typeLabel}${citationKey}${usageNote}_`,
            '```',
            truncated || (lang === 'en' ? '(extraction not yet available)' : '(extracción aún no disponible)'),
            '```',
        ].join('\n');
    });

    return blocks.join('\n\n');
}

function formatPriorSteps(steps: ExegesisPriorStep[], lang: 'es' | 'en'): string {
    if (steps.length === 0) {
        return lang === 'en'
            ? `(No accepted prior steps yet — this should not happen for conclusion/introduction. Surface this as an error.)`
            : `(Aún no hay pasos previos aceptados — esto no debería pasar en conclusión/introducción. Reportalo como error.)`;
    }
    return steps.map(s => {
        const heading = s.kind === 'verse' && s.verseRef
            ? formatPassageReference(s.verseRef, lang)
            : (lang === 'en' ? capitalize(s.kind) : spanishKindHeading(s.kind));
        return `### ${heading}\n\n${s.markdown}`;
    }).join('\n\n---\n\n');
}

/**
 * Per-source-type budget weights for the inline-context allocation.
 * High-rigor academic types (critical commentaries, technical lexicons,
 * grammars) get the largest slice; supportive material gets less; the
 * style template gets the minimum just enough to communicate shape.
 *
 * Numbers are relative — only the ratios matter — and align with the
 * `rigorTier` field on `SOURCE_TYPE_CATALOG` but with finer
 * differentiation for the prompt's needs (e.g. `commentary-critical`
 * outranks `lexicon-technical` because critical commentaries carry
 * the exegetical argument; the lexicon supports it).
 */
function sourceTypeWeight(type: SourceType): number {
    switch (type) {
        case 'commentary-critical': return 4;
        case 'lexicon-technical': return 3;
        case 'theological-dictionary': return 3;
        case 'grammar-syntax': return 3;
        case 'critical-apparatus': return 3;
        case 'commentary-expository': return 2;
        case 'historical-background': return 2;
        case 'theological-monograph': return 2;
        case 'journal-article': return 2;
        case 'primary-source-ancient': return 2;
        case 'biblical-text-edition': return 2;
        case 'other': return 1;
        case 'style-template-paper': return 1;
    }
}

function englishTypeLabel(type: SourceType): string {
    switch (type) {
        case 'biblical-text-edition': return 'Biblical text edition';
        case 'critical-apparatus': return 'Critical apparatus';
        case 'lexicon-technical': return 'Technical lexicon';
        case 'theological-dictionary': return 'Theological dictionary';
        case 'grammar-syntax': return 'Grammar / syntax';
        case 'commentary-critical': return 'Critical commentary';
        case 'commentary-expository': return 'Expository commentary';
        case 'historical-background': return 'Historical/cultural background';
        case 'theological-monograph': return 'Theological monograph';
        case 'journal-article': return 'Journal article';
        case 'primary-source-ancient': return 'Ancient primary source';
        case 'style-template-paper': return 'Style template (model paper)';
        case 'other': return 'Other';
    }
}

function spanishTypeLabel(type: SourceType): string {
    switch (type) {
        case 'biblical-text-edition': return 'Edición del texto bíblico';
        case 'critical-apparatus': return 'Aparato crítico';
        case 'lexicon-technical': return 'Léxico técnico';
        case 'theological-dictionary': return 'Diccionario teológico';
        case 'grammar-syntax': return 'Gramática / sintaxis';
        case 'commentary-critical': return 'Comentario crítico-técnico';
        case 'commentary-expository': return 'Comentario expositivo';
        case 'historical-background': return 'Contexto histórico/cultural';
        case 'theological-monograph': return 'Monografía teológica';
        case 'journal-article': return 'Artículo de revista';
        case 'primary-source-ancient': return 'Fuente primaria antigua';
        case 'style-template-paper': return 'Plantilla de estilo (trabajo modelo)';
        case 'other': return 'Otro';
    }
}

function spanishKindHeading(kind: ExegesisPriorStep['kind']): string {
    switch (kind) {
        case 'verse': return 'Verso';
        case 'conclusion': return 'Conclusión';
        case 'introduction': return 'Introducción';
        case 'assembly': return 'Ensamble';
    }
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function truncate(text: string, maxChars: number): string {
    if (!text) return '';
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n\n[…content truncated to fit context window…]';
}
