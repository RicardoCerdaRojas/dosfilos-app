import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    formatPassageReference,
    type IStepCorpusPlanner,
    type ProposeStepCorpusInput,
    type ProposeStepCorpusResult,
    type ProposedAllocation,
} from '@dosfilos/domain';
import { withGeminiRetry } from './geminiRetry';

/**
 * v1.7 — Gemini implementation of `IStepCorpusPlanner`.
 *
 * Given the paper's passage + brief + corpus + steps, asks Gemini to
 * propose `pinnedSources` per step. Returns a structured allocation
 * map the use case folds into `paper.stepPlan.perStep`.
 *
 * Why Pro 2.5 over Flash here:
 *   - The reasoning is "what belongs where" — quality of allocation
 *     matters more than throughput. A bad plan invites manual rework.
 *   - The corpus + steps fit comfortably in Pro's context (max ~50
 *     sources × ~30 steps = a tiny prompt).
 *   - Single-shot, low temperature (0.2) for deterministic output the
 *     user can compare across regenerations.
 *
 * Errors: parse failures throw with the raw response logged. The use
 * case is responsible for sanitizing hallucinated source ids — this
 * planner just returns whatever Gemini produced (after JSON parsing).
 */
export class GeminiStepCorpusPlanner implements IStepCorpusPlanner {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName || 'gemini-2.5-pro';
    }

    async propose(input: ProposeStepCorpusInput): Promise<ProposeStepCorpusResult> {
        const { systemInstruction, userMessage } = buildPlannerPrompt(input);

        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            systemInstruction,
            generationConfig: {
                responseMimeType: 'application/json',
                // Bumped from 0.2 → 0.4 so the model commits to assignments
                // instead of hedging when a verse is between two plausible
                // sources. Still well below the "creative" range, so output
                // stays comparable across regenerations.
                temperature: 0.4,
                topP: 0.9,
                // Bumped 8k → 32k after observing truncation on a paper
                // with 16 sources × 15 steps. The full coverage rules
                // (every step gets ≥1 source + every source appears ≥1
                // time) push the response into the 4-8k range easily,
                // and rationales add another 1-2k. 32k gives 4× headroom
                // even for ~30 sources × ~30 steps. Pro 2.5 supports up
                // to 65k so we're nowhere near the model ceiling.
                maxOutputTokens: 32768,
            },
        });

        console.log('[GeminiStepCorpusPlanner] proposing', {
            sourceCount: input.sources.length,
            stepCount: input.steps.length,
            language: input.language,
        });

        const result = await withGeminiRetry(
            () => model.generateContent(userMessage),
            { contextLabel: 'GeminiStepCorpusPlanner' },
        );
        const rawJson = result.response.text();

        const parsed = parsePlannerJson(rawJson);
        const allocations = mapToAllocations(parsed);

        return {
            allocations,
            promptUsed: userMessage,
        };
    }
}

// ── Prompt construction ─────────────────────────────────────────────────

function buildPlannerPrompt(input: ProposeStepCorpusInput): {
    systemInstruction: string;
    userMessage: string;
} {
    const isSpanish = input.language === 'es';
    const passageLabel = formatPassageReference(input.passage, input.language);

    const systemInstruction = isSpanish
        ? `Eres un profesor experto en exégesis bíblica que asesora a un estudiante de seminario en cómo distribuir su bibliografía a lo largo de un paper exegético.

Tu tarea: dada la lista de fuentes que el estudiante ya tiene en su corpus y la lista de pasos del paper (introducción, versículos individuales, conclusión), proponer qué fuentes "pinear" (priorizar) para cada paso.

REGLAS DE COBERTURA (críticas):
1. CADA paso DEBE tener al menos 1 fuente asignada. Sin excepciones. Un comentario expositivo siempre cubre cada versículo del libro — si dudas, asígnalo como mínima cobertura.
2. CADA fuente del corpus DEBE aparecer al menos UNA VEZ en alguna asignación, salvo que sea genuinamente irrelevante para el pasaje completo (caso raro — el estudiante ya curó su corpus para este paper). Si una fuente queda sin un lugar obvio, asígnala al paso de Conclusión o al versículo más temáticamente cercano.

Criterios académicos para repartir:
- Comentarios críticos (WBC, NIGTC, Hermeneia) van bien en versículos densos donde la exégesis técnica importa.
- Comentarios expositivos (NICNT, BECNT, Pillar) son útiles transversalmente — úsalos para garantizar la cobertura mínima de cada versículo.
- Léxicos y gramáticas se pinean a versículos donde una decisión léxico-sintáctica concreta carga el argumento.
- Trasfondo histórico es útil en introducción y versículos donde se referencia contexto.
- Monografías teológicas suelen ir en conclusión (síntesis) o en versículos clave.
- Fuentes primarias antiguas (Filón, Josefo) se pinean cuando el versículo dialoga con esa tradición.

LÍMITE: no pineess más de 4 fuentes por paso (saturas el contexto). Prefiere 2-3.

Justifica cada asignación con UNA oración breve en español, concreta y académica (no "es útil", sino "establece la conexión sintáctica con Hebreos 7:25").`
        : `You are an expert biblical exegesis professor advising a seminary student on how to distribute their bibliography across an exegetical paper.

Task: given the list of sources the student already has in their corpus and the list of paper steps (introduction, individual verses, conclusion), propose which sources to "pin" (prioritize) for each step.

COVERAGE RULES (critical):
1. EVERY step MUST have at least 1 source assigned. No exceptions. An expository commentary always covers every verse of the book — if unsure, assign it as minimal coverage.
2. EVERY source in the corpus MUST appear at least ONCE somewhere, unless it's genuinely irrelevant to the entire passage (rare — the student already curated their corpus for this paper). If a source has no obvious home, assign it to the Conclusion step or the verse it's most thematically related to.

Academic criteria for distribution:
- Critical commentaries (WBC, NIGTC, Hermeneia) belong on dense verses where technical exegesis matters.
- Expository commentaries (NICNT, BECNT, Pillar) are useful across the board — use them to guarantee minimum coverage on every verse.
- Lexicons and grammars get pinned to verses where a concrete lexical-syntactic decision carries the argument.
- Historical background fits introduction and verses that reference context.
- Theological monographs usually go in conclusion (synthesis) or key verses.
- Primary ancient sources (Philo, Josephus) get pinned when the verse engages that tradition.

LIMIT: do NOT pin more than 4 sources per step (context bloat). Prefer 2-3.

Justify each allocation in ONE short sentence — concrete and academic (not "useful here," but "establishes the syntactic link to Hebrews 7:25").`;

    const passageLine = isSpanish
        ? `**Pasaje del paper:** ${passageLabel}`
        : `**Paper passage:** ${passageLabel}`;
    const briefLine = input.assignmentBrief
        ? (isSpanish
            ? `**Brief del estudiante:** ${input.assignmentBrief.trim().slice(0, 1000)}`
            : `**Student brief:** ${input.assignmentBrief.trim().slice(0, 1000)}`)
        : null;

    const sourcesSection = isSpanish ? '**Fuentes en el corpus:**' : '**Sources in the corpus:**';
    const sourcesList = input.sources
        .map(s => `- id="${s.id}" · type=${s.sourceType} · ${s.displayLabel}${s.citationKey ? ` (${s.citationKey})` : ''}`)
        .join('\n');

    const stepsSection = isSpanish ? '**Pasos del paper:**' : '**Paper steps:**';
    const stepsList = input.steps
        .map(s => `- id="${s.id}" · kind=${s.kind} · ${s.label}`)
        .join('\n');

    const schemaSection = isSpanish
        ? `**Devuelve JSON con esta estructura exacta:**`
        : `**Return JSON with this exact structure:**`;
    const schemaExample = `{
  "allocations": {
    "<step-id>": {
      "pinnedSources": ["<source-id>", "<source-id>"],
      "rationale": "${isSpanish ? 'Una oración breve.' : 'One short sentence.'}"
    }
  }
}`;

    const constraints = isSpanish
        ? `Restricciones:
- Usa SOLO los ids exactos listados arriba (no inventes nuevos).
- Usa SOLO ids de pasos listados arriba.
- TODOS los pasos deben aparecer en "allocations" con al menos 1 fuente. No omitas pasos.
- TODAS las fuentes deben aparecer al menos una vez en algún paso, salvo que sean claramente irrelevantes para el pasaje completo.
- Máximo 4 fuentes por paso.`
        : `Constraints:
- Use ONLY the exact ids listed above (don't invent new ones).
- Use ONLY step ids listed above.
- ALL steps must appear in "allocations" with at least 1 source. Do not omit steps.
- ALL sources must appear at least once in some step, unless clearly irrelevant to the whole passage.
- Max 4 sources per step.`;

    const userMessage = [
        passageLine,
        briefLine,
        '',
        sourcesSection,
        sourcesList,
        '',
        stepsSection,
        stepsList,
        '',
        schemaSection,
        '```json',
        schemaExample,
        '```',
        '',
        constraints,
    ].filter(Boolean).join('\n');

    return { systemInstruction, userMessage };
}

// ── Response parsing ────────────────────────────────────────────────────

interface ParsedPlannerResponse {
    allocations?: Record<string, { pinnedSources?: unknown; rationale?: unknown }>;
}

function parsePlannerJson(rawJson: string): ParsedPlannerResponse {
    try {
        const parsed = JSON.parse(rawJson);
        if (typeof parsed !== 'object' || parsed === null) {
            throw new Error('Top-level value is not an object');
        }
        return parsed as ParsedPlannerResponse;
    } catch (err) {
        console.error('[GeminiStepCorpusPlanner] failed to parse response', { sample: rawJson.slice(0, 500) });
        throw new Error(`GeminiStepCorpusPlanner: invalid JSON: ${(err as Error).message}`);
    }
}

function mapToAllocations(parsed: ParsedPlannerResponse): Record<string, ProposedAllocation> {
    const out: Record<string, ProposedAllocation> = {};
    if (!parsed.allocations || typeof parsed.allocations !== 'object') return out;
    for (const [stepId, raw] of Object.entries(parsed.allocations)) {
        if (typeof stepId !== 'string' || stepId.length === 0) continue;
        const pinned = Array.isArray(raw?.pinnedSources)
            ? raw.pinnedSources.filter((id): id is string => typeof id === 'string' && id.length > 0)
            : [];
        const rationale = typeof raw?.rationale === 'string' ? raw.rationale.trim() : '';
        out[stepId] = { pinnedSources: pinned, rationale };
    }
    return out;
}
