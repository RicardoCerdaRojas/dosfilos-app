import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    formatPassageReference,
    type ComposeIntroductionInput,
    type ComposeIntroductionOutput,
    type ComposerSourceMetadata,
    type IIntroductionComposer,
    type StyleGuideManifest,
} from '@dosfilos/domain';
import { withGeminiRetry } from '../geminiRetry';
import { serializeAnalysis } from '../composer/serializeAnalysis';

/**
 * Gemini implementation of `IIntroductionComposer`.
 *
 * Composes the introduction section LAST in the academic flow —
 * after both verse analyses AND the conclusion are accepted. This
 * lets the introduction state a thesis that the body actually
 * demonstrated, not the thesis the author originally hoped for.
 *
 * Output: 2-3 paragraphs presenting the passage's importance, the
 * paper's thesis (as derived from the body + conclusion), brief
 * methodology statement, and direction-of-argument outline.
 *
 * Configuration mirrors the conclusion composer (Pro 2.5, temp 0.4,
 * 8k output cap).
 */
export class GeminiIntroductionComposer implements IIntroductionComposer {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async composeIntroduction(input: ComposeIntroductionInput): Promise<ComposeIntroductionOutput> {
        const { systemInstruction, userMessage } = buildIntroductionPrompt(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                temperature: 0.4,
                topP: 0.9,
                maxOutputTokens: 8192,
            },
        });

        console.log('[GeminiIntroductionComposer] composing', {
            verseCount: input.verseAnalyses.length,
            sourceCount: input.sources.length,
            hasConclusion: Boolean(input.acceptedConclusionMarkdown),
            hasStyleGuide: Boolean(input.styleGuideContent || input.styleGuideManifest),
            language: input.language,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiIntroductionComposer' },
        );
        const markdown = result.response.text();
        const tokensUsed = result.response.usageMetadata?.totalTokenCount ?? null;

        return {
            markdown,
            modelId: this.modelName,
            tokensUsed,
            formatterStatus: 'skipped',
        };
    }
}

// ── Prompt construction ─────────────────────────────────────────────────

function buildIntroductionPrompt(input: ComposeIntroductionInput): { systemInstruction: string; userMessage: string } {
    const lang = input.language;
    const passage = formatPassageReference(input.paperPassage, lang);
    const styleGuideBlock = formatStyleGuide(input.styleGuideContent, input.styleGuideManifest, lang);
    const briefBlock = formatAssignmentBrief(input.assignmentBrief, lang);
    const fallback = !input.styleGuideContent && !input.styleGuideManifest;

    const system = lang === 'en'
        ? [
            `You are an academic writer composing the INTRODUCTION section of a TMS-style exegetical research paper. The introduction is written LAST so it reflects what the paper actually demonstrated.`,
            ``,
            `## Paper`,
            `Passage: **${passage}**`,
            briefBlock,
            ``,
            `## Mandatory style guide`,
            fallback
                ? `(NO style guide attached. Apply The Master's Seminary / Turabian conventions.)`
                : styleGuideBlock,
            ``,
            `## Hard rules for the introduction`,
            `- Present the passage and its importance within its book (1 paragraph).`,
            `- State a precise thesis DERIVED FROM what the body and conclusion actually demonstrated. NOT the thesis the original assignment brief hoped for — the thesis the analysis established.`,
            `- Briefly state methodology: morphological, syntactic, lexical, intertextual, theological — only those actually used in the body.`,
            `- Sketch the direction of the argument: what the paper builds toward.`,
            `- 2-3 paragraphs. Continuous academic prose. No bullets.`,
            `- DO NOT promise topics the body did not develop. The introduction must be HONEST about what the paper delivers.`,
            ``,
            `## Hallucination guardrail`,
            `- Only refer to methodology actually used and themes actually developed in the body's verse analyses + accepted conclusion.`,
            `- Citations sparingly (or none): the introduction usually relies on its own framing, not on commentator engagement.`,
            ``,
            `## Output`,
            `Single markdown block, 2-3 paragraphs. Start with "## Introduction" (English) or "## Introducción" (Spanish), then the prose. No "##" sub-headings within.`,
        ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n')
        : [
            `Sos un redactor académico componiendo la sección de INTRODUCCIÓN de un trabajo exegético TMS-style. La introducción se escribe AL FINAL para que refleje lo que el paper efectivamente demostró.`,
            ``,
            `## Paper`,
            `Pasaje: **${passage}**`,
            briefBlock,
            ``,
            `## Guía de estilo obligatoria`,
            fallback
                ? `(SIN guía de estilo adjunta. Aplicá convenciones The Master's Seminary / Turabian.)`
                : styleGuideBlock,
            ``,
            `## Reglas duras para la introducción`,
            `- Presentá el pasaje y su importancia dentro del libro (1 párrafo).`,
            `- Enunciá una tesis precisa DERIVADA de lo que el cuerpo y la conclusión efectivamente demostraron. NO la tesis que el encuadre original del paper esperaba — la tesis que el análisis estableció.`,
            `- Declará brevemente la metodología: morfológica, sintáctica, léxica, intertextual, teológica — solo las efectivamente usadas en el cuerpo.`,
            `- Esbozá la dirección del argumento: hacia dónde construye el paper.`,
            `- 2-3 párrafos. Prosa académica continua. Sin viñetas.`,
            `- NO prometas temas que el cuerpo no desarrolló. La introducción debe ser HONESTA sobre lo que el paper entrega.`,
            ``,
            `## Salvaguarda contra alucinación`,
            `- Solo referenciá metodología efectivamente usada y temas efectivamente desarrollados en los análisis del cuerpo + conclusión aceptada.`,
            `- Citas con moderación (o ninguna): la introducción usualmente descansa en su propio encuadre, no en engagement con comentaristas.`,
            ``,
            `## Salida`,
            `Un único bloque markdown, 2-3 párrafos. Comenzá con "## Introducción", después la prosa. Sin sub-headings "##" adentro.`,
        ].filter(Boolean).join('\n').replace(/\n{3,}/g, '\n\n');

    const briefings = input.verseAnalyses.map(a => serializeAnalysis(a, lang)).join('\n\n');
    const sourcesBlock = formatSourceRegistry(input.sources, lang);
    const pinnedBlock = formatPinnedContract(input.pinnedSourceKeys, lang);
    const hint = input.regenerationHint
        ? (lang === 'en'
            ? `\n\n### Regeneration hint\n${input.regenerationHint}\n`
            : `\n\n### Hint de regeneración\n${input.regenerationHint}\n`)
        : '';

    const userPrefix = lang === 'en'
        ? `Compose the introduction section for the paper on **${passage}**.`
        : `Componé la sección de introducción del paper sobre **${passage}**.`;
    const briefingsHeading = lang === 'en'
        ? '### Body — accepted verse analyses'
        : '### Cuerpo — análisis verso por verso aceptados';
    const conclusionHeading = lang === 'en'
        ? '### Accepted conclusion (already composed — read this to know the thesis)'
        : '### Conclusión aceptada (ya compuesta — leela para conocer la tesis)';
    const sourcesHeading = lang === 'en'
        ? '### Source registry (sparingly used in the introduction)'
        : '### Registro de fuentes (uso moderado en la introducción)';

    const user = [
        userPrefix,
        ``,
        pinnedBlock,
        briefingsHeading,
        ``,
        briefings,
        ``,
        conclusionHeading,
        ``,
        input.acceptedConclusionMarkdown,
        ``,
        sourcesHeading,
        ``,
        sourcesBlock,
        hint,
        ``,
        lang === 'en'
            ? `Now produce the introduction. 2-3 paragraphs of continuous academic prose, opening with "## Introduction". State the thesis the body and conclusion actually demonstrated, not the original aspiration.`
            : `Ahora producí la introducción. 2-3 párrafos de prosa académica continua, abriendo con "## Introducción". Enunciá la tesis que el cuerpo y la conclusión efectivamente demostraron, no la aspiración original.`,
    ].filter(Boolean).join('\n');

    return { systemInstruction: system, userMessage: user };
}

function formatAssignmentBrief(brief: string | null, lang: 'es' | 'en'): string {
    if (!brief || !brief.trim()) return '';
    const heading = lang === 'en' ? '## Paper framing' : '## Encuadre del paper';
    return [``, heading, brief.trim()].join('\n');
}

function formatStyleGuide(content: string, manifest: StyleGuideManifest | null, lang: 'es' | 'en'): string {
    const parts: string[] = [];
    if (content && content.trim()) {
        const truncated = content.length > 15_000 ? content.slice(0, 15_000) + '\n\n[…]' : content;
        parts.push(lang === 'en' ? '**Style guide (verbatim)**' : '**Guía de estilo (verbatim)**');
        parts.push('```');
        parts.push(truncated);
        parts.push('```');
    }
    if (manifest) {
        parts.push('');
        parts.push(lang === 'en' ? '**Structured manifest rules**' : '**Reglas estructuradas del manifest**');
        parts.push('```json');
        parts.push(JSON.stringify(manifest, null, 2));
        parts.push('```');
    }
    return parts.length === 0
        ? (lang === 'en'
            ? '(Style guide present but content empty. Apply TMS / Turabian defaults.)'
            : '(Guía de estilo presente pero contenido vacío. Aplicá defaults TMS / Turabian.)')
        : parts.join('\n');
}

function formatSourceRegistry(sources: ReadonlyArray<ComposerSourceMetadata>, lang: 'es' | 'en'): string {
    if (sources.length === 0) {
        return lang === 'en' ? '(No sources configured.)' : '(Sin fuentes configuradas.)';
    }
    const lines: string[] = [];
    for (const s of sources) {
        const badge = s.isPinned
            ? (lang === 'en' ? ' ⭐ PINNED' : ' ⭐ ASIGNADA')
            : '';
        lines.push(`- **${s.citationKey}**${badge}: ${s.author}, *${s.title}*`);
        if (s.isPinned && s.textContent && s.textContent.trim()) {
            // 80k char cap (~20k tokens) per pinned source. See
            // matching note in GeminiConclusionComposer.
            const truncated = s.textContent.length > 80000
                ? s.textContent.slice(0, 80000) + '\n[…content truncated to fit context window…]'
                : s.textContent;
            const heading = lang === 'en'
                ? `\n  _Source content for grounding the pinned citation. Find the passage most relevant to ${s.citationKey}'s commentary on this paper's pericope and paraphrase or quote from there:_\n`
                : `\n  _Contenido de la fuente para anclar la cita asignada. Encontrá el pasaje más relevante del comentario de ${s.citationKey} sobre la perícopa de este paper y parafraseá o citá desde ahí:_\n`;
            lines.push(heading + '  ```\n  ' + truncated.replace(/\n/g, '\n  ') + '\n  ```');
        }
    }
    return lines.join('\n');
}

/**
 * Pinned-source contract block for the introduction step. Same shape
 * as the conclusion composer's. Asymmetry rules (default 1, hard cap
 * 2, never technical) hold per METODOLOGIA.md.
 */
function formatPinnedContract(keys: ReadonlyArray<string>, lang: 'es' | 'en'): string {
    if (keys.length === 0) return '';
    if (lang === 'en') {
        return [
            '### Pinned-source contract for THIS introduction (CRITICAL)',
            '',
            'The student\'s corpus plan pins the following sourceKeys to this introduction step. You MUST cite each one at least once in the introduction (paraphrase or verbatim). Skipping a pinned source is a critical failure of the plan; cross-pollinating with sources pinned for other steps does NOT count.',
            '',
            ...keys.map(k => `- \`${k}\``),
            '',
            'Asymmetry rules from the methodology still apply: default 1 source, hard cap 2, never technical (lexicons / grammars / apparatus).',
            '',
        ].join('\n');
    }
    return [
        '### Contrato de fuentes asignadas para ESTA introducción (CRÍTICO)',
        '',
        'El plan de corpus del alumno asigna los siguientes sourceKeys a este paso de introducción. DEBES citar cada uno al menos una vez en la introducción (parafraseo o verbatim). Saltarse una fuente asignada es una falla crítica del plan; cross-poll-inizar con fuentes asignadas a otros pasos NO cuenta.',
        '',
        ...keys.map(k => `- \`${k}\``),
        '',
        'Las reglas de asimetría de la metodología siguen aplicando: default 1 fuente, hard cap 2, nunca técnica (léxicos / gramáticas / aparato).',
        '',
    ].join('\n');
}
