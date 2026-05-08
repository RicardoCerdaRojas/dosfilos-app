import {
    formatPassageReference,
    type AnalyzeVerseInput,
    type CanonicalVerseAnalysis,
} from '@dosfilos/domain';

/**
 * Prompt construction for the canonical verse analyzer.
 *
 * Two-pronged approach:
 *   1. The `responseSchema` (in `responseSchema.ts`) constrains the
 *      output SHAPE — Gemini guarantees JSON conforming to the schema.
 *   2. This prompt enforces SUBSTANCE — the methodological rigor each
 *      field must reflect, citation discipline, hedge calibration,
 *      and the "no recap, no distant verses" rules for the verse
 *      thesis.
 *
 * Both layers matter. Schema without rigor produces structured
 * mediocrity; rigor without schema produces unparseable prose.
 */

interface BuiltAnalyzerPrompt {
    systemInstruction: string;
    userMessage: string;
}

const SOURCE_BUDGET_CHARS_TOTAL = 220_000;
const STYLE_GUIDE_BUDGET_CHARS = 20_000;
const PRIOR_ANALYSES_BUDGET_CHARS = 40_000;

export function buildAnalyzerPrompt(input: AnalyzeVerseInput): BuiltAnalyzerPrompt {
    return {
        systemInstruction: buildSystemInstruction(input),
        userMessage: buildUserMessage(input),
    };
}

function buildSystemInstruction(input: AnalyzeVerseInput): string {
    const lang = input.language;
    const verse = formatPassageReference(input.verseRef, lang);
    const passage = formatPassageReference(input.paperPassage, lang);
    const briefBlock = formatAssignmentBrief(input.assignmentBrief, lang);
    const styleGuideBlock = formatStyleGuide(input.styleGuideContent, lang);
    const corpusGapsBlock = formatCorpusGaps(input.missingSourceTypes, lang);

    if (lang === 'en') {
        return [
            `You are an expert exegete in New Testament biblical Greek, trained in the historical-grammatical-literal method as taught at evangelical seminaries (TMS, DTS, Westminster, Southern). Your task is to produce a CANONICAL STRUCTURED ANALYSIS of one verse, populating every field of the response schema with rigorous, source-grounded content.`,
            ``,
            `## Verse and paper`,
            `Verse: **${verse}**`,
            `Within paper passage: ${passage}`,
            briefBlock,
            ``,
            `## Methodological foundation`,
            `Apply the historical-grammatical-literal method documented in the platform's METODOLOGIA.md. Anchor your analysis in canonical authorities:`,
            `- Greek grammar/syntax: Wallace, BDF, Robertson`,
            `- Lexicon: BDAG, LSJ, Louw-Nida, TDNT, NIDNTTE`,
            `- Discourse: Levinsohn, Runge`,
            `- Textual criticism: Metzger, Comfort & Barrett, NA28 apparatus`,
            `- Background: deSilva, Keener, ABD`,
            `- OT intertextuality: Beale & Carson, Hays`,
            ``,
            `## Five non-negotiable commitments`,
            `1. Author's intent (inspired by the Holy Spirit) is the locus of meaning.`,
            `2. Grammar/syntax/lexis grounds interpretation. Devotional intuition is not exegesis.`,
            `3. Historical-cultural context informs the original sense — without imposing modernity.`,
            `4. Theology emerges from the text. Do not impose systematic conclusions on the verse.`,
            `5. Scripture interprets Scripture, but only after exhausting the immediate text.`,
            ``,
            `## Citation discipline (NON-NEGOTIABLE)`,
            `- Every source citation in the structured output must reference a sourceKey that matches a configured source listed below in the user message.`,
            `- NEVER invent source keys, page numbers, or quotes. If you cannot back a claim with a configured source, mark it tentative in confidenceFlags or omit the claim entirely.`,
            `- For ideas drawn from your own general knowledge (not from the configured corpus), set the relevant confidenceFlag to "tentative" — do not fabricate citations.`,
            corpusGapsBlock,
            ``,
            `## Style guide constraints`,
            styleGuideBlock,
            ``,
            `## Output format`,
            `Output MUST be a JSON object conforming exactly to the schema you have been given via responseSchema. Every required field must be present. Optional fields can be empty strings or empty arrays when not applicable.`,
            ``,
            `Tone: sober academic. Avoid devotional language. Match the analytical register of a seminary research paper.`,
        ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
    }

    return [
        `Sos un exégeta experto en griego del Nuevo Testamento, formado en el método histórico-gramatical-literal según se enseña en seminarios evangélicos rigurosos (TMS, DTS, Westminster, Southern). Tu tarea es producir un ANÁLISIS CANÓNICO ESTRUCTURADO de un solo versículo, poblando cada campo del response schema con contenido riguroso anclado en fuentes.`,
        ``,
        `## Versículo y paper`,
        `Versículo: **${verse}**`,
        `Dentro del pasaje del paper: ${passage}`,
        briefBlock,
        ``,
        `## Fundamento metodológico`,
        `Aplicá el método histórico-gramatical-literal documentado en METODOLOGIA.md de la plataforma. Anclá tu análisis en autoridades canónicas:`,
        `- Gramática/sintaxis griega: Wallace, BDF, Robertson`,
        `- Léxico: BDAG, LSJ, Louw-Nida, TDNT, NIDNTTE`,
        `- Discurso: Levinsohn, Runge`,
        `- Crítica textual: Metzger, Comfort & Barrett, aparato NA28`,
        `- Trasfondo: deSilva, Keener, ABD`,
        `- Intertextualidad AT: Beale & Carson, Hays`,
        ``,
        `## Cinco compromisos no-negociables`,
        `1. La intención del autor (inspirado por el Espíritu Santo) es el locus del significado.`,
        `2. La gramática/sintaxis/léxico fundamenta la interpretación. La intuición devocional no es exégesis.`,
        `3. El contexto histórico-cultural informa el sentido original — sin imponer modernidad.`,
        `4. La teología emerge del texto. No impongas conclusiones sistemáticas sobre el verso.`,
        `5. Scripture interprets Scripture, pero solo después de agotar el texto inmediato.`,
        ``,
        `## Disciplina de citación (NO NEGOCIABLE)`,
        `- Toda cita de fuente en el output estructurado debe referenciar un sourceKey que coincida con una fuente configurada listada abajo en el mensaje del usuario.`,
        `- NUNCA inventes claves de fuente, números de página o citas verbatim. Si no podés respaldar una afirmación con una fuente configurada, marcala como tentative en confidenceFlags u omitila completamente.`,
        `- Para ideas que provengan de tu conocimiento general (no del corpus configurado), poné el confidenceFlag relevante en "tentative" — NO fabriques citas.`,
        corpusGapsBlock,
        ``,
        `## Restricciones de la guía de estilo`,
        styleGuideBlock,
        ``,
        `## Formato de salida`,
        `La salida DEBE ser un objeto JSON que se conforma exactamente al schema que recibiste vía responseSchema. Todos los campos requeridos deben estar presentes. Los campos opcionales pueden ser strings vacíos o arrays vacíos cuando no apliquen.`,
        ``,
        `Tono: académico sobrio. Evitá lenguaje devocional. Igualá el registro analítico de un trabajo de investigación de seminario.`,
    ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');
}

function buildUserMessage(input: AnalyzeVerseInput): string {
    const lang = input.language;
    const verse = formatPassageReference(input.verseRef, lang);
    const sourcesBlock = formatSources(input.sources, lang);
    const priorAnalysesBlock = formatPriorAnalyses(input.priorAcceptedAnalyses, lang);
    const emphasisBlock = formatStepEmphasis(input.stepEmphasis, lang);
    const hint = input.regenerationHint
        ? (lang === 'en'
            ? `\n\n### Regeneration hint from the user\n${input.regenerationHint}\n`
            : `\n\n### Hint de regeneración del usuario\n${input.regenerationHint}\n`)
        : '';

    if (lang === 'en') {
        return [
            `Analyze ${verse} according to the methodology in the system instruction. Populate every field of the response schema.`,
            ``,
            `## Field-by-field methodological reminders`,
            ``,
            `**textualCriticism** — ALWAYS populate. When no significant variants exist in the apparatus, set "note" to confirm review explicitly (e.g., "No significant variants in the NA28 apparatus for this verse.") and leave "variants" empty. When variants exist, document witnesses (𝔓⁴⁶, ℵ, A, B, C, D as appropriate), the adopted reading, and rationale grounded in textual-critical canons.`,
            ``,
            `**syntacticAnalysis.mainVerb** — Identify the main verb of the sentence containing this verse. Set to null when the verse is part of a longer sentence whose main verb lives elsewhere (participial chains, μέν…δέ pairs, periodic sentences); when null, populate "mainVerbNote" to explain.`,
            ``,
            `**syntacticAnalysis.keyConstructions** — Each participle, relative clause, prepositional phrase, genitive construction. Each entry: text + morphology (in natural language: "aorist active participle, masculine singular nominative") + syntactic function (Wallace's categories) + interpretive significance.`,
            ``,
            `**syntacticAnalysis.discourseParticles** — δέ, γάρ, οὖν, μέν, καί, ἀλλά, ὅτι and others when their argumentative function is notable. Use Levinsohn / Runge categories.`,
            ``,
            `**lexicalAnalyses** — One entry per key term. CRITICAL: separate "generalSemanticRange" (full lexicographic range with sources) from "verseSpecificLoading" (how this verse's context selects from the range). This is Differentiator 1 — guards against Carson's "transferred totality" fallacy.`,
            ``,
            `**argumentativeRole** — 1-2 sentences. What does THIS verse DO in the pericope's argument? (establishes thesis / develops / contrasts / exemplifies / transitions / concludes). Differentiator 2.`,
            ``,
            `**historicalContext** — Empty array unless the verse genuinely requires extra-textual background. NOT decorative.`,
            ``,
            `**oldTestamentLinks** — Use Hays' taxonomy: 'quotation' (with formula like γέγραπται), 'allusion', 'echo'. Empty when the verse has no canonical resonance.`,
            ``,
            `**commentatorEngagement** — NOT a citation list. POSITIONS. What each commentator argues about THIS verse, paraphrased in your voice. Use the 'role' field to classify per the dialectical strategy: 'anchor' / 'contrast' / 'technical'.`,
            ``,
            `**translationCruxes** — One entry per genuinely contested translation decision. Each: phrase + description + options + commentator positions (with 'supports' index pointing to the chosen option) + commitment with rationale derived from the analysis above.`,
            ``,
            `**initialTranslation** — Working translation BEFORE crux resolution.`,
            ``,
            `**finalTranslation** — Translation AFTER crux resolution. Equal to initialTranslation when no cruxes.`,
            ``,
            `**verseThesis** — 1-3 sentences. What THIS verse establishes. May reference the IMMEDIATELY adjacent verse only when the grammar of ${verse} demands it (μέν…δέ, participial chains, comparative pairs). NEVER mention verses more than one step away. NEVER recap the pericope.`,
            ``,
            `**theologicalHooks** — Loci touched (cristologia, soteriologia, etc.). Used by sermon/devotional composers, NOT by the academic composer. Empty if no clear loci.`,
            ``,
            `**confidenceFlags** — Calibrate hedge language. Mark each non-trivial claim with high/medium/tentative + preferred hedge phrases. Required when corpus gaps force tentative claims.`,
            ``,
            `**footnoteExtensions** — Anchor extensions (1-3 sentences) to phrases in your prose-bearing fields. Compose-time fuzzy-match places markers. 2-5 footnotes typical.`,
            ``,
            emphasisBlock,
            `### Sources at your disposal`,
            sourcesBlock,
            ``,
            priorAnalysesBlock,
            hint,
        ].filter(Boolean).join('\n');
    }

    return [
        `Analizá ${verse} según la metodología del system instruction. Poblá cada campo del response schema.`,
        ``,
        `## Recordatorios metodológicos por campo`,
        ``,
        `**textualCriticism** — SIEMPRE poblar. Cuando no hay variantes significativas en el aparato, poné "note" confirmando la revisión explícitamente (ej. "Sin variantes significativas en el aparato NA28 para este verso.") y dejá "variants" vacío. Cuando hay variantes, documentá testigos (𝔓⁴⁶, ℵ, A, B, C, D según corresponda), la lectura adoptada y la justificación anclada en cánones de crítica textual.`,
        ``,
        `**syntacticAnalysis.mainVerb** — Identificá el verbo principal de la oración que contiene este verso. Poné null cuando el verso es parte de una oración cuyo verbo principal vive en otro lado (cadenas participiales, pares μέν…δέ, oraciones periódicas); cuando es null, poblá "mainVerbNote" para explicar.`,
        ``,
        `**syntacticAnalysis.keyConstructions** — Cada participio, cláusula relativa, frase preposicional, construcción de genitivo. Cada entrada: text + morphology (en lenguaje natural: "participio aoristo activo, nominativo masculino singular") + syntacticFunction (categorías de Wallace) + interpretiveSignificance.`,
        ``,
        `**syntacticAnalysis.discourseParticles** — δέ, γάρ, οὖν, μέν, καί, ἀλλά, ὅτι y otras cuando su función argumentativa es notable. Usá categorías de Levinsohn / Runge.`,
        ``,
        `**lexicalAnalyses** — Una entrada por término clave. CRÍTICO: separá "generalSemanticRange" (rango lexicográfico completo con fuentes) de "verseSpecificLoading" (cómo el contexto del verso selecciona del rango). Este es el Diferenciador 1 — salvaguarda contra la falacia de "totalidad transferida" de Carson.`,
        ``,
        `**argumentativeRole** — 1-2 oraciones. ¿Qué HACE ESTE verso en el argumento de la pericopa? (establece tesis / desarrolla / contrasta / ejemplifica / transiciona / concluye). Diferenciador 2.`,
        ``,
        `**historicalContext** — Array vacío salvo que el verso genuinamente requiera trasfondo extra-textual. NO decorativo.`,
        ``,
        `**oldTestamentLinks** — Usá la taxonomía de Hays: 'quotation' (con fórmula tipo γέγραπται), 'allusion', 'echo'. Vacío cuando el verso no tiene resonancia canónica.`,
        ``,
        `**commentatorEngagement** — NO es lista de citas. POSICIONES. Qué argumenta cada comentarista sobre ESTE verso, parafraseado en tu voz. Usá el campo 'role' para clasificar según la estrategia dialéctica: 'anchor' / 'contrast' / 'technical'.`,
        ``,
        `**translationCruxes** — Una entrada por decisión de traducción genuinamente contestada. Cada uno: phrase + description + options + commentatorPositions (con índice 'supports' apuntando a la opción elegida) + commitment con justificación derivada del análisis previo.`,
        ``,
        `**initialTranslation** — Traducción de trabajo ANTES de resolver los cruces.`,
        ``,
        `**finalTranslation** — Traducción DESPUÉS de resolver los cruces. Igual a initialTranslation cuando no hay cruces.`,
        ``,
        `**verseThesis** — 1-3 oraciones. Qué establece ESTE verso. Puede referenciar el verso INMEDIATAMENTE adyacente solo cuando la gramática de ${verse} lo exige (μέν…δέ, cadenas participiales, pares comparativos). NUNCA menciones versos a más de un paso. NUNCA recapitules la pericopa.`,
        ``,
        `**theologicalHooks** — Loci tocados (cristologia, soteriologia, etc.). Usado por composers sermón/devocional, NO por el composer académico. Vacío si no hay loci claros.`,
        ``,
        `**confidenceFlags** — Calibrá el lenguaje hedge. Marcá cada afirmación no-trivial con high/medium/tentative + frases hedge preferidas. Obligatorio cuando huecos del corpus fuerzan afirmaciones tentativas.`,
        ``,
        `**footnoteExtensions** — Extensiones ancladas (1-3 oraciones) a frases en tus campos prosaicos. Compose-time fuzzy-match coloca los marcadores. 2-5 notas típicas.`,
        ``,
        emphasisBlock,
        `### Fuentes a tu disposición`,
        sourcesBlock,
        ``,
        priorAnalysesBlock,
        hint,
    ].filter(Boolean).join('\n');
}

// ── Formatters ──────────────────────────────────────────────────────────

function formatAssignmentBrief(brief: string | null, lang: 'es' | 'en'): string {
    if (!brief || !brief.trim()) return '';
    const heading = lang === 'en' ? '## Paper framing' : '## Encuadre del paper';
    return [``, heading, brief.trim()].join('\n');
}

function formatStyleGuide(content: string, lang: 'es' | 'en'): string {
    if (!content || !content.trim()) {
        return lang === 'en'
            ? '(No style guide attached. Default to TMS conventions for citations and footnotes.)'
            : '(No hay guía de estilo adjunta. Aplicá por defecto convenciones TMS para citas y notas al pie.)';
    }
    const truncated = truncate(content, STYLE_GUIDE_BUDGET_CHARS);
    return ['```', truncated, '```'].join('\n');
}

function formatSources(
    sources: ReadonlyArray<AnalyzeVerseInput['sources'][number]>,
    lang: 'es' | 'en',
): string {
    if (sources.length === 0) {
        return lang === 'en'
            ? '(No sources configured. Lean on general knowledge but mark every claim as tentative in confidenceFlags.)'
            : '(Sin fuentes configuradas. Apoyate en conocimiento general pero marcá toda afirmación como tentative en confidenceFlags.)';
    }
    const totalBudget = SOURCE_BUDGET_CHARS_TOTAL;
    const perSourceBudget = Math.floor(totalBudget / sources.length);

    // v1.7+: lead the source block with a directive that names the
    // pinned sourceKeys so the model treats them as a contract, not a
    // suggestion. The structured analysis has explicit slots for
    // commentator engagement (commentatorEngagement) and lexis
    // sources — pinned sources MUST appear in at least one of those
    // slots when their content bears on this verse.
    const pinnedKeys = sources
        .filter(s => s.priority === 'primary' && s.citationKey)
        .map(s => s.citationKey!);
    let directive = '';
    if (pinnedKeys.length > 0) {
        directive = lang === 'en'
            ? [
                '## Pinned-source contract for THIS verse',
                '',
                `The student's corpus plan pins the following \`sourceKey\`s to this verse. You MUST reference each one at least once in your structured analysis — typically inside \`commentatorEngagement\` (with \`role\` set to anchor / contrast / technical) or \`lexicalAnalyses[*].generalSemanticRange.sources\` / \`loadingSources\` for lexicons / grammars:`,
                '',
                ...pinnedKeys.map(k => `- \`${k}\``),
                '',
                'Skipping a pinned source is a critical failure of the plan. Non-pinned sources may also appear when they strengthen the analysis — but never as a SUBSTITUTE for a pinned one.',
                '',
            ].join('\n') + '\n'
            : [
                '## Contrato de fuentes asignadas para ESTE verso',
                '',
                `El plan de corpus del alumno asigna los siguientes \`sourceKey\` a este verso. DEBES referenciar cada uno al menos una vez en tu análisis estructurado — típicamente dentro de \`commentatorEngagement\` (con \`role\` en anchor / contrast / technical) o \`lexicalAnalyses[*].generalSemanticRange.sources\` / \`loadingSources\` para léxicos / gramáticas:`,
                '',
                ...pinnedKeys.map(k => `- \`${k}\``),
                '',
                'Saltarse una fuente asignada es una falla crítica del plan. Las no-asignadas pueden aparecer cuando refuercen el análisis — pero nunca como SUSTITUTO de una asignada.',
                '',
            ].join('\n') + '\n';
    }

    const blocks = sources
        .map(s => {
            const truncated = truncate(s.textContent, perSourceBudget);
            const keyLine = s.citationKey ? `sourceKey: \`${s.citationKey}\`` : `(no citation key)`;
            const typeLine = s.sourceType;
            const pinnedBadge = s.priority === 'primary'
                ? (lang === 'en' ? '⭐ PINNED — MUST cite. ' : '⭐ ASIGNADA — DEBES citarla. ')
                : '';
            return [
                `### ${pinnedBadge}${s.displayLabel}`,
                `_${keyLine} · type: ${typeLine}_`,
                '```',
                truncated || (lang === 'en' ? '(content not yet extracted)' : '(contenido aún no extraído)'),
                '```',
            ].join('\n');
        })
        .join('\n\n');

    return directive + blocks;
}

function formatPriorAnalyses(
    priorAnalyses: ReadonlyArray<CanonicalVerseAnalysis>,
    lang: 'es' | 'en',
): string {
    if (priorAnalyses.length === 0) return '';
    // Compact representation — we want the model to know what was
    // already established without re-feeding full structured data.
    const heading = lang === 'en'
        ? '### Prior accepted verse analyses (for continuity)'
        : '### Análisis verso a verso aceptados previamente (para continuidad)';
    const items = priorAnalyses.map(a => {
        const ref = formatPassageReference(a.reference, lang);
        const tx = a.finalTranslation || a.initialTranslation;
        const thesis = a.verseThesis;
        const commitments = a.translationCruxes
            .map(c => `  · "${c.phrase}" → "${c.commitment.chosen}"`)
            .join('\n');
        return [
            `**${ref}**`,
            `Translation: ${tx}`,
            `Thesis: ${thesis}`,
            commitments ? (lang === 'en' ? `Translation commitments:\n${commitments}` : `Compromisos de traducción:\n${commitments}`) : '',
        ].filter(Boolean).join('\n');
    });
    const joined = items.join('\n\n');
    return [heading, '', truncate(joined, PRIOR_ANALYSES_BUDGET_CHARS)].join('\n');
}

function formatStepEmphasis(
    emphasis: AnalyzeVerseInput['stepEmphasis'],
    lang: 'es' | 'en',
): string {
    if (!emphasis) return '';
    const e = emphasis.emphasizedTypes.join(', ');
    const d = emphasis.deemphasizedTypes.join(', ');
    if (!e && !d) return '';
    if (lang === 'en') {
        const lines = [`### Per-step emphasis (from rubric/strategy)`];
        if (e) lines.push(`- Prioritize types: ${e}.`);
        if (d) lines.push(`- De-emphasize types: ${d}.`);
        lines.push(``);
        return lines.join('\n');
    }
    const lines = [`### Énfasis para este paso (de la rúbrica/estrategia)`];
    if (e) lines.push(`- Priorizá tipos: ${e}.`);
    if (d) lines.push(`- Desénfasis en tipos: ${d}.`);
    lines.push(``);
    return lines.join('\n');
}

function formatCorpusGaps(
    missing: ReadonlyArray<{ sourceType: string; minimum: number; have: number }>,
    lang: 'es' | 'en',
): string {
    if (missing.length === 0) return '';
    const heading = lang === 'en'
        ? '## Corpus limitations (calibrate confidence flags accordingly)'
        : '## Limitaciones del corpus (calibrá confidence flags acordemente)';
    const intro = lang === 'en'
        ? 'The following source types the rubric expects are missing or insufficient. ANY claim in your output that would normally rest on a missing type MUST be flagged in confidenceFlags as "tentative" with appropriate hedge phrases. NEVER fabricate citations to replace missing sources.'
        : 'Los siguientes tipos de fuente esperados por la rúbrica faltan o son insuficientes. CUALQUIER afirmación en tu output que normalmente descansaría en un tipo faltante DEBE flagearse en confidenceFlags como "tentative" con frases hedge apropiadas. NUNCA fabriqués citas para reemplazar fuentes faltantes.';
    const items = missing.map(m => `- ${m.sourceType} (${m.have}/${m.minimum})`);
    return ['', heading, intro, ...items].join('\n');
}

function truncate(text: string, maxChars: number): string {
    if (!text) return '';
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + '\n\n[…contenido truncado para encajar en el contexto…]';
}
