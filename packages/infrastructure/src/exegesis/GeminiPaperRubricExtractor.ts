import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    type ExtractRubricInput,
    type ExtractedRubric,
    type IPaperRubricExtractor,
    type PaperRubric,
    type SourceRequirement,
    type SourceType,
    type StructuralExpectation,
    SOURCE_TYPE_GROUPS,
} from '@dosfilos/domain';
import { withGeminiRetry } from './geminiRetry';

/**
 * Gemini implementation of `IPaperRubricExtractor`.
 *
 * Uses Pro 2.5 with `responseMimeType: 'application/json'` so the
 * model returns structured JSON we can parse. The prompt enumerates
 * the canonical SourceType vocabulary so the extractor maps the
 * rubric's natural-language type names ("comentario crítico técnico")
 * onto our catalog values ("commentary-critical").
 *
 * Design choices:
 *   - Pro 2.5 (not Flash) — extraction is one-shot and accuracy
 *     matters more than throughput. Pro's larger context window also
 *     comfortably absorbs even multi-page rubric documents.
 *   - Thinking on (default budget). Reading a rubric and mapping to
 *     a structured schema benefits from the reasoning bandwidth.
 *   - Single-shot extraction (no streaming). The setup UI shows a
 *     spinner; partial output is meaningless for structured data.
 *   - Confidence is computed deterministically from how many fields
 *     the model returned (vs. left null). Lower confidence → the
 *     UI nudges the student to double-check.
 *
 * Errors: throws on parse failure. The use case decides whether to
 * fall back to the system default rubric or surface the error.
 */
export class GeminiPaperRubricExtractor implements IPaperRubricExtractor {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async extract(input: ExtractRubricInput): Promise<ExtractedRubric> {
        const { systemInstruction, userMessage } = buildExtractionPrompt(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2, // Low — extraction is deterministic, not creative.
                topP: 0.9,
                maxOutputTokens: 8192,
            },
        });

        console.log('[GeminiPaperRubricExtractor] extracting', {
            language: input.language,
            source: input.source,
            rawTextChars: input.rawText.length,
        });

        // Pro 2.5 hits intermittent 503s ("model experiencing high demand")
        // during peak windows. Retry transparently with exponential
        // backoff before surfacing the failure to the user.
        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiPaperRubricExtractor' },
        );
        const response = result.response;
        const rawJson = response.text();

        const parsed = parseExtractorJson(rawJson);
        const rubric = mapToDomain(parsed, input);
        const confidence = inferConfidence(parsed);
        const reviewNotes = collectReviewNotes(parsed, input.language);

        const usage = response.usageMetadata;
        const totalTokens = usage?.totalTokenCount;
        const summed = (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0);
        const tokensUsed = typeof totalTokens === 'number' ? totalTokens : (summed > 0 ? summed : null);

        return {
            rubric,
            confidence,
            reviewNotes,
            tokensUsed,
            modelId: this.modelName,
        };
    }
}

// ── Prompt builder ──────────────────────────────────────────────────────

interface BuiltPrompt {
    systemInstruction: string;
    userMessage: string;
}

function buildExtractionPrompt(input: ExtractRubricInput): BuiltPrompt {
    const lang = input.language;
    const allTypes = SOURCE_TYPE_GROUPS.flatMap(g => g.types);
    const typeList = allTypes.join(', ');

    if (lang === 'en') {
        return {
            systemInstruction: [
                `You are a structured-data extractor for academic exegetical paper rubrics.`,
                ``,
                `Read a seminary's grading rubric (or assignment brief) and emit a JSON object matching the schema below. Map any source-type vocabulary to the canonical catalog. Return null for fields the rubric doesn't mention — do NOT invent values.`,
                ``,
                `Output JSON ONLY — no markdown fences, no commentary, no preamble.`,
            ].join('\n'),
            userMessage: buildUserMessageEN(input.rawText, typeList),
        };
    }

    return {
        systemInstruction: [
            `Sos un extractor de datos estructurados para rúbricas de trabajos exegéticos académicos.`,
            ``,
            `Leé la rúbrica de calificación del seminario (o brief de asignación) y devolvé un objeto JSON que cumpla el esquema más abajo. Mapeá el vocabulario de tipos de fuente al catálogo canónico. Devolvé null para los campos que la rúbrica no menciona — NO inventes valores.`,
            ``,
            `Devolvé SOLO JSON — sin fences markdown, sin comentarios, sin preámbulo.`,
        ].join('\n'),
        userMessage: buildUserMessageES(input.rawText, typeList),
    };
}

function buildUserMessageEN(rawText: string, typeList: string): string {
    return [
        `Extract the rubric from this document:`,
        '```',
        rawText.trim(),
        '```',
        ``,
        `## Output schema`,
        `Return a single JSON object with these fields (use null where the rubric is silent):`,
        ``,
        `{`,
        `  "description": string | null,`,
        `  "citationStandard": string | null,                              // e.g. "TMS / Turabian", "SBL Handbook"`,
        `  "expectedLength": { "unit": "pages" | "words", "min": number | null, "max": number | null } | null,`,
        `  "sourceRequirements": [                                          // one entry per source type the rubric requires`,
        `    {`,
        `      "sourceType": <one of: ${typeList}>,`,
        `      "minimum": number,                                            // 0 means "optional / recommended only"`,
        `      "maximum": number | null,                                     // null = no upper bound`,
        `      "justification": string                                       // localized academic rationale`,
        `    }, ...`,
        `  ],`,
        `  "structuralExpectations": [                                      // one entry per section the rubric addresses`,
        `    {`,
        `      "section": "introduction" | "verse" | "conclusion",`,
        `      "emphasizedTypes": [<source type>, ...],`,
        `      "justification": string`,
        `    }, ...`,
        `  ],`,
        `  "extractionNotes": string[]                                       // anything you were unsure about, in English`,
        `}`,
        ``,
        `## Mapping guide`,
        `- "critical commentary / technical commentary / WBC / NIGTC / Hermeneia / ICC" → commentary-critical`,
        `- "expository commentary / NICOT / NICNT / BECNT / Pillar / NIVAC / Tyndale" → commentary-expository`,
        `- "lexicon / BDAG / HALOT / LSJ" → lexicon-technical`,
        `- "theological dictionary / TDNT / NIDNTTE / EDNT" → theological-dictionary`,
        `- "grammar / syntax / Wallace / BDF / Robertson" → grammar-syntax`,
        `- "critical apparatus / textual variants / NA28 apparatus / BHS apparatus" → critical-apparatus`,
        `- "biblical text / Greek text / Hebrew text / NA28 / BHS / LXX edition" → biblical-text-edition`,
        `- "background / cultural / historical / deSilva / Keener / ABD" → historical-background`,
        `- "monograph / focused study" → theological-monograph`,
        `- "journal article / peer-reviewed / JBL / NTS / JETS" → journal-article`,
        `- "primary source / Josephus / Philo / Apostolic Fathers / OTP" → primary-source-ancient`,
        `- "model paper / sample paper / style template" → style-template-paper`,
        `- anything else that doesn't fit cleanly → other`,
        ``,
        `## Justifications`,
        `Each requirement and structural expectation MUST include a one- or two-sentence academic justification IN ENGLISH explaining WHY that requirement matters for serious exegesis. Phrase it as if teaching a student.`,
    ].join('\n');
}

function buildUserMessageES(rawText: string, typeList: string): string {
    return [
        `Extraé la rúbrica de este documento:`,
        '```',
        rawText.trim(),
        '```',
        ``,
        `## Esquema de salida`,
        `Devolvé un único objeto JSON con estos campos (usá null donde la rúbrica calle):`,
        ``,
        `{`,
        `  "description": string | null,`,
        `  "citationStandard": string | null,                              // ej. "TMS / Turabian", "SBL Handbook"`,
        `  "expectedLength": { "unit": "pages" | "words", "min": number | null, "max": number | null } | null,`,
        `  "sourceRequirements": [                                          // un entry por tipo de fuente que la rúbrica requiere`,
        `    {`,
        `      "sourceType": <uno de: ${typeList}>,`,
        `      "minimum": number,                                            // 0 = opcional / recomendado`,
        `      "maximum": number | null,                                     // null = sin límite superior`,
        `      "justification": string                                       // racional académico localizado`,
        `    }, ...`,
        `  ],`,
        `  "structuralExpectations": [                                      // un entry por sección que la rúbrica menciona`,
        `    {`,
        `      "section": "introduction" | "verse" | "conclusion",`,
        `      "emphasizedTypes": [<tipo de fuente>, ...],`,
        `      "justification": string`,
        `    }, ...`,
        `  ],`,
        `  "extractionNotes": string[]                                       // todo lo que no quedó claro, en español`,
        `}`,
        ``,
        `## Guía de mapeo`,
        `- "comentario crítico / comentario técnico / WBC / NIGTC / Hermeneia / ICC" → commentary-critical`,
        `- "comentario expositivo / NICOT / NICNT / BECNT / Pillar / NIVAC / Tyndale" → commentary-expository`,
        `- "léxico / BDAG / HALOT / LSJ" → lexicon-technical`,
        `- "diccionario teológico / TDNT / NIDNTTE / EDNT" → theological-dictionary`,
        `- "gramática / sintaxis / Wallace / BDF / Robertson" → grammar-syntax`,
        `- "aparato crítico / variantes textuales / aparato de NA28 / aparato de BHS" → critical-apparatus`,
        `- "texto bíblico / texto griego / texto hebreo / NA28 / BHS / edición LXX" → biblical-text-edition`,
        `- "trasfondo / cultural / histórico / deSilva / Keener / ABD" → historical-background`,
        `- "monografía / estudio focalizado" → theological-monograph`,
        `- "artículo de revista / peer-reviewed / JBL / NTS / JETS" → journal-article`,
        `- "fuente primaria / Josefo / Filón / Padres apostólicos / Pseudoepígrafos" → primary-source-ancient`,
        `- "trabajo modelo / paper de muestra / plantilla de estilo" → style-template-paper`,
        `- cualquier otra cosa que no encaje → other`,
        ``,
        `## Justificaciones`,
        `Cada requisito y expectativa estructural DEBE incluir una justificación académica de una o dos oraciones EN ESPAÑOL explicando POR QUÉ ese requisito importa para una exégesis seria. Frasealo como enseñándole al alumno.`,
    ].join('\n');
}

// ── JSON parsing + mapping ─────────────────────────────────────────────

interface RawExtractionResult {
    description: string | null;
    citationStandard: string | null;
    expectedLength: { unit: 'pages' | 'words'; min: number | null; max: number | null } | null;
    sourceRequirements: Array<{
        sourceType: string;
        minimum: number;
        maximum: number | null;
        justification: string;
    }>;
    structuralExpectations: Array<{
        section: string;
        emphasizedTypes: string[];
        justification: string;
    }>;
    extractionNotes: string[];
}

function parseExtractorJson(rawJson: string): RawExtractionResult {
    // Pro sometimes wraps responses in ```json fences despite the
    // mime-type contract. Strip defensively.
    const cleaned = rawJson
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

    let parsed: any;
    try {
        parsed = JSON.parse(cleaned);
    } catch (err) {
        throw new Error(`Rubric extractor produced invalid JSON: ${(err as Error).message}`);
    }

    return {
        description: typeof parsed.description === 'string' ? parsed.description : null,
        citationStandard: typeof parsed.citationStandard === 'string' ? parsed.citationStandard : null,
        expectedLength: parsed.expectedLength && typeof parsed.expectedLength === 'object'
            ? {
                unit: parsed.expectedLength.unit === 'words' ? 'words' : 'pages',
                min: typeof parsed.expectedLength.min === 'number' ? parsed.expectedLength.min : null,
                max: typeof parsed.expectedLength.max === 'number' ? parsed.expectedLength.max : null,
            }
            : null,
        sourceRequirements: Array.isArray(parsed.sourceRequirements) ? parsed.sourceRequirements : [],
        structuralExpectations: Array.isArray(parsed.structuralExpectations) ? parsed.structuralExpectations : [],
        extractionNotes: Array.isArray(parsed.extractionNotes) ? parsed.extractionNotes.filter((n: any) => typeof n === 'string') : [],
    };
}

function mapToDomain(raw: RawExtractionResult, input: ExtractRubricInput): Omit<PaperRubric, 'createdAt' | 'updatedAt'> {
    const validTypes = new Set<SourceType>(SOURCE_TYPE_GROUPS.flatMap(g => g.types) as SourceType[]);
    const isValidType = (t: any): t is SourceType => typeof t === 'string' && validTypes.has(t as SourceType);

    const sourceRequirements: SourceRequirement[] = raw.sourceRequirements
        .filter(r => isValidType(r.sourceType))
        .map(r => ({
            sourceType: r.sourceType as SourceType,
            minimum: Math.max(0, Math.floor(r.minimum ?? 0)),
            maximum: r.maximum === null || r.maximum === undefined
                ? null
                : Math.max(Math.max(0, Math.floor(r.maximum)), Math.max(0, Math.floor(r.minimum ?? 0))),
            justification: typeof r.justification === 'string' ? r.justification : '',
        }));

    const structuralExpectations: StructuralExpectation[] = raw.structuralExpectations
        .filter(e => e.section === 'introduction' || e.section === 'verse' || e.section === 'conclusion')
        .map(e => ({
            section: e.section as 'introduction' | 'verse' | 'conclusion',
            emphasizedTypes: (Array.isArray(e.emphasizedTypes) ? e.emphasizedTypes : [])
                .filter(isValidType) as SourceType[],
            justification: typeof e.justification === 'string' ? e.justification : '',
        }));

    return {
        provenance: input.source === 'document' ? 'extracted-from-document' : 'extracted-from-text',
        description: raw.description,
        expectedLength: raw.expectedLength,
        citationStandard: raw.citationStandard,
        sourceRequirements,
        structuralExpectations,
        sourceCorpusId: input.sourceCorpusId,
        sourcePastedText: input.source === 'text' ? input.rawText : null,
        // Extraction creates a fresh origin; any prior template link
        // is irrelevant. Caller (ExtractRubricFromTextUseCase) relies
        // on this being null to clear the breadcrumb.
        sourceTemplateId: null,
    };
}

function inferConfidence(raw: RawExtractionResult): 'high' | 'medium' | 'low' {
    let score = 0;
    if (raw.description) score++;
    if (raw.citationStandard) score++;
    if (raw.expectedLength) score++;
    if (raw.sourceRequirements.length >= 3) score += 2;
    else if (raw.sourceRequirements.length >= 1) score += 1;
    if (raw.structuralExpectations.length === 3) score += 2;
    else if (raw.structuralExpectations.length >= 1) score += 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
}

function collectReviewNotes(raw: RawExtractionResult, lang: 'es' | 'en'): string[] {
    const notes: string[] = [...raw.extractionNotes];
    if (raw.sourceRequirements.length === 0) {
        notes.push(lang === 'en'
            ? 'No source requirements were extracted. Verify the rubric document or add requirements manually.'
            : 'No se extrajeron requisitos de fuente. Verificá el documento de rúbrica o agregá requisitos manualmente.',
        );
    }
    if (raw.structuralExpectations.length === 0) {
        notes.push(lang === 'en'
            ? 'No structural expectations were extracted. The structural plan will fall back to no recommendations.'
            : 'No se extrajeron expectativas estructurales. El plan estructural quedará sin recomendaciones.',
        );
    }
    return notes;
}
