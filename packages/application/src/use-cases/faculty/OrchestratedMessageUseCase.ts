import {
    IAIChatRepository,
    IAIAgentRepository,
    IAIGeneratorService,
    IAIProjectRepository,
    AIChatMessage,
    AIAgent,
    SourceReference
} from '@dosfilos/domain';
import { generateId } from '../../utils/generateId';
import { CoreLibraryRAGService, RetrievedChunk } from '../../services/CoreLibraryRAGService';

// Phase 2 RAG retrieval — shared instance
const ragService = new CoreLibraryRAGService();

function chunksToSourcesP2(chunks: RetrievedChunk[]): SourceReference[] {
    const byDoc = new Map<string, { title: string; author: string; pages: Set<number>; sections: Set<string>; snippet: string }>();
    for (const c of chunks) {
        const key = `${c.resourceAuthor}||${c.resourceTitle}`;
        const entry = byDoc.get(key) ?? {
            title: c.resourceTitle,
            author: c.resourceAuthor,
            pages: new Set<number>(),
            sections: new Set<string>(),
            snippet: c.text.substring(0, 240).trim(),
        };
        if (c.metadata.page !== undefined) entry.pages.add(c.metadata.page);
        if (c.sectionBreadcrumb) entry.sections.add(c.sectionBreadcrumb);
        byDoc.set(key, entry);
    }
    return Array.from(byDoc.values()).map(entry => {
        const ref: SourceReference = { title: entry.title };
        if (entry.author) ref.author = entry.author;
        const pagesArr = Array.from(entry.pages).sort((a, b) => a - b);
        if (pagesArr.length > 0) {
            ref.page = pagesArr[0];
            const sectionStr = entry.sections.size > 0
                ? Array.from(entry.sections).slice(0, 2).join(' · ')
                : '';
            const pagesStr = pagesArr.length === 1 ? `p. ${pagesArr[0]}` : `pp. ${pagesArr.join(', ')}`;
            ref.snippet = sectionStr ? `${pagesStr} — ${sectionStr}` : pagesStr;
        } else if (entry.snippet) {
            ref.snippet = entry.snippet;
        }
        return ref;
    });
}

/**
 * Defensive post-processor: strip bogus citations that slipped past the prompt.
 */
function cleanCitations(text: string, agentNames: string[] = []): string {
    let out = text;
    // 1) "Basado en <chunk-id-like-token>[, pág N][, citado por X]"
    out = out.replace(/\(Basado en [a-z0-9]{8,}[^)]*\)\.?/g, '');
    out = out.replace(/Basado en [a-z0-9]{8,},\s*pág\.?\s*\d+[^.]*\./gi, '');
    // 2) "(chunk-id, pág. N)" patterns — 10+ lowercase alphanumerics
    out = out.replace(/\([a-z0-9]{10,}\s*,\s*p(?:á|a)g\.?\s*\d+[^)]*\)/gi, '');
    // 3) Self-citations of known agents
    const defaultAgents = [
        'Dr\\. Al[eé]theia', 'Dr\\. Berith', 'Dr\\. Cris[oó]stomo',
        'Dr\\. Calvino', 'Pastor Nout[eé]tico', 'Tutor Pastoral',
    ];
    const allAgents = [
        ...defaultAgents,
        ...agentNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    ];
    for (const name of allAgents) {
        out = out.replace(new RegExp(`\\(${name}(?:,\\s*[^)]*)?\\)\\.?`, 'g'), '');
        out = out.replace(new RegExp(`Seg[uú]n\\s+${name}\\s*,?\\s*`, 'g'), '');
    }
    // 4) "citado por Dr. X" residuals
    out = out.replace(/,?\s*citado\s+por\s+(Dr\.|Pastor)\s+[^).,]+\)?/gi, ')');
    // 5) Clean up orphan punctuation — IMPORTANT: preserve newlines for markdown
    out = out.replace(/\s*\(\s*\)/g, '');
    out = out.replace(/[ \t]{2,}/g, ' ');              // only collapse horizontal whitespace
    out = out.replace(/[ \t]+([.,;:])/g, '$1');        // remove space before punctuation (not newlines)
    out = out.replace(/\.{2,}/g, '.');                  // repeated dots
    out = out.replace(/\n{3,}/g, '\n\n');              // max 2 consecutive newlines (preserves paragraphs)
    return out.trim();
}

/**
 * OrchestratedMessageUseCase — Fan-out Multi-Agent Coordinator
 *
 * Architecture:
 *
 *   User message
 *       │
 *       ▼
 *   [Step 1] Router Agent (lightweight Gemini call ~1s)
 *            Analyzes the question, returns:
 *            - strategy: 'single' | 'fanout'
 *            - agentIds: string[]
 *       │
 *       ├─ strategy: 'single' ──► Specialist responds directly (streaming)
 *       │
 *       └─ strategy: 'fanout' ──► Parallel calls to all selected specialists
 *                                 │
 *                                 ▼
 *                            [Step 3] Synthesis Agent
 *                            Consolidates all specialist responses
 *                            into a single coherent answer (streaming)
 *       │
 *       ▼
 *   Response saved to Firestore with agent attribution
 */

interface RouterDecision {
    strategy: 'single' | 'fanout';
    agentIds: string[];
    reasoning?: string;
}

export class OrchestratedMessageUseCase {
    constructor(
        private agentRepository: IAIAgentRepository,
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService,
        private projectRepository?: IAIProjectRepository
    ) { }

    async execute(
        userId: string,
        sessionId: string,
        messageContent: string,
        onChunk?: (text: string) => void,
        onAgentsSelected?: (agents: AIAgent[]) => void,
        lengthPreference?: 'concise' | 'detailed',
        onSources?: (sources: SourceReference[]) => void
    ): Promise<{ response: string; selectedAgents: AIAgent[] }> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) throw new Error('Session not found');

        const allAgents = await this.agentRepository.getAllAgents();
        const activeAgents = allAgents.filter(a => a.isActive);
        if (activeAgents.length === 0) throw new Error('No active agents available');

        // ── Step 1: Route ─────────────────────────────────────────────────────────
        const decision = await this.routeQuestion(activeAgents, session.messages, messageContent);

        const selectedAgents = decision.agentIds
            .map(id => activeAgents.find(a => a.id === id))
            .filter((a): a is AIAgent => !!a);

        const finalAgents = selectedAgents.length > 0 ? selectedAgents : [activeAgents[0]];

        onAgentsSelected?.(finalAgents);

        // ── Step 2: Save user message ─────────────────────────────────────────────

        const userMessage: AIChatMessage = {
            id: generateId(),
            role: 'user',
            content: messageContent,
            timestamp: new Date()
        };

        try {
            await this.chatRepository.addMessageToSession(userId, sessionId, userMessage);
        } catch (error) {
            console.error('[OrchestratedMessageUseCase] Failed to save user message:', error);
            throw error;
        }

        // ── Project contextNote injection ─────────────────────────────────────────
        // If the session belongs to a project with a contextNote, prepend it to the
        // message so the specialist gets enriched context without the user needing
        // to repeat it every time.
        let enrichedMessage = messageContent;
        if (session.projectId && this.projectRepository) {
            const project = await this.projectRepository.getProject(session.projectId);
            if (project?.contextNote) {
                enrichedMessage = `[Contexto del proyecto "${project.title}": ${project.contextNote}]\n\n${messageContent}`;
            }
        }

        const history = [...session.messages, userMessage];
        let finalResponse = '';
        let capturedSources: SourceReference[] = [];

        const handleSources = (sources: SourceReference[]) => {
            capturedSources = sources;
            onSources?.(sources);
        };

        // PHASE 2 — Retrieve relevant chunks for each participating specialist.
        // We aggregate by corpus so each specialist gets its own context.
        const retrievedContextByAgent = new Map<string, { context: string; chunks: RetrievedChunk[] }>();
        try {
            const uniqueCorpusSets = new Map<string, string[]>();
            for (const a of finalAgents) {
                if (a.corpusIds && a.corpusIds.length > 0) {
                    const key = [...a.corpusIds].sort().join('|');
                    if (!uniqueCorpusSets.has(key)) uniqueCorpusSets.set(key, a.corpusIds);
                }
            }
            // Retrieve once per unique corpus set (usually 1-2 calls)
            const retrievalResults = await Promise.all(
                Array.from(uniqueCorpusSets.entries()).map(async ([key, corpusIds]) => {
                    const chunks = await ragService.retrieve(enrichedMessage, {
                        corpusIds,
                        topK: 10,
                        minSimilarity: 0.3,
                    });
                    return { key, chunks };
                })
            );
            // Assign to each agent by its corpus set
            for (const a of finalAgents) {
                if (!a.corpusIds || a.corpusIds.length === 0) continue;
                const key = [...a.corpusIds].sort().join('|');
                const result = retrievalResults.find(r => r.key === key);
                if (result && result.chunks.length > 0) {
                    retrievedContextByAgent.set(a.id, {
                        context: CoreLibraryRAGService.formatContextForPrompt(result.chunks),
                        chunks: result.chunks,
                    });
                }
            }

            // Aggregate all sources for the UI
            const allChunks = retrievalResults.flatMap(r => r.chunks);
            if (allChunks.length > 0) {
                const aggregatedSources = chunksToSourcesP2(allChunks);
                capturedSources = aggregatedSources;
                onSources?.(aggregatedSources);
                console.log(`[OrchestratedMessage] Phase 2 RAG: ${allChunks.length} chunks across ${retrievedContextByAgent.size} agent(s)`);
            }
        } catch (err: any) {
            console.warn('[OrchestratedMessage] Phase 2 RAG retrieval failed:', err?.message ?? err);
        }

        if (decision.strategy === 'fanout' && finalAgents.length > 1) {
            // ── Step 3a: Fan-out — call all specialists in parallel.
            // With Phase 2 RAG, we inject retrieved context per agent (no more grounding metadata).
            const specialistResponses = await Promise.all(
                finalAgents.map(async (agent) => {
                    const agentContext = retrievedContextByAgent.get(agent.id)?.context;
                    try {
                        if (agentContext) {
                            // Phase 2 path: use sendMessageStream with no-op chunker + retrievedContext
                            // We need the full response here, so collect via stream (ignoring chunks).
                            let full = '';
                            await this.generatorService.sendMessageStream(
                                agent, history, enrichedMessage,
                                (c) => { full += c; },
                                lengthPreference,
                                undefined,
                                agentContext,
                            );
                            return { agent, response: full, sources: [] as SourceReference[] };
                        } else {
                            // Legacy path: sendMessageWithSources (Gemini fileSearch)
                            const result = await this.generatorService.sendMessageWithSources(
                                agent, history, enrichedMessage, lengthPreference
                            );
                            return { agent, response: result.response, sources: result.sources };
                        }
                    } catch {
                        return null;
                    }
                })
            );

            const validResponses = specialistResponses.filter(
                (r): r is { agent: AIAgent; response: string; sources: SourceReference[] } => !!r
            );

            if (validResponses.length === 0) throw new Error('All specialist calls failed');

            // Merge legacy-path sources (if any) with Phase 2 sources already captured
            const legacySources = this.dedupSources(validResponses.flatMap(r => r.sources));
            if (legacySources.length > 0 && capturedSources.length === 0) {
                capturedSources = legacySources;
                onSources?.(legacySources);
            }

            // ── Step 3b: Synthesis — consolidate & stream ─────────────────────────
            finalResponse = await this.synthesize(
                validResponses,
                enrichedMessage,
                onChunk,
                lengthPreference
            );
        } else {
            // ── Step 3 (single): Stream directly from the selected specialist ──────
            const soloContext = retrievedContextByAgent.get(finalAgents[0].id)?.context;
            if (onChunk) {
                finalResponse = await this.generatorService.sendMessageStream(
                    finalAgents[0],
                    history,
                    enrichedMessage,
                    onChunk,
                    lengthPreference,
                    soloContext ? undefined : handleSources,  // Skip legacy sources if Phase 2 provides context
                    soloContext,
                );
            } else {
                finalResponse = await this.generatorService.sendMessage(
                    finalAgents[0],
                    history,
                    enrichedMessage,
                    lengthPreference
                );
            }
        }

        // Defensive cleanup: strip self-citations and chunk-ID citations that leaked past the prompt
        const agentNames = finalAgents.map(a => a.name);
        const cleanedResponse = cleanCitations(finalResponse, agentNames);

        const modelMessage: AIChatMessage = {
            id: generateId(),
            role: 'model',
            content: cleanedResponse,
            timestamp: new Date(),
            ...(capturedSources.length > 0 && { sources: capturedSources }),
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, modelMessage);

        // Generate contextual session title on the FIRST exchange — awaited so UI refetch sees it
        if (session.messages.length === 0) {
            try {
                const title = await this.generateSessionTitle(messageContent);
                if (title) {
                    await this.chatRepository.renameSession(userId, sessionId, title);
                }
            } catch (err) {
                console.warn('[OrchestratedMessage] Title generation failed:', err);
            }
        }

        return { response: cleanedResponse, selectedAgents: finalAgents };
    }

    /**
     * Router: lightweight Gemini call that decides strategy and which agents to use.
     */
    private async routeQuestion(
        agents: AIAgent[],
        history: AIChatMessage[],
        message: string
    ): Promise<RouterDecision> {
        const agentManifest = agents
            .map(a =>
                `  - id: "${a.id}" | name: "${a.name}"\n` +
                `    routing: "${a.routingDescription ?? a.expertiseArea}"`
            )
            .join('\n');

        const routerPrompt = `
Eres el enrutador de un sistema multi-agente para un seminario teológico.
Analiza la pregunta y decide qué especialistas deben responderla.

ESPECIALISTAS DISPONIBLES:
${agentManifest}

PREGUNTA: "${message}"

HISTORIAL RECIENTE:
${history.slice(-2).map(m => `${m.role}: ${m.content.substring(0, 120)}`).join('\n')}

REGLAS:
1. Si la pregunta cae claramente en UNA sola especialidad → strategy: "single"
2. Si la pregunta abarca EXPLÍCITAMENTE 2+ especialidades distintas → strategy: "fanout"
3. Prefiere "single" cuando tengas dudas (menor costo y latencia)
4. Máximo 3 agentes en fanout

Responde ÚNICAMENTE con JSON válido sin texto adicional:
{"strategy":"single","agentIds":["id1"],"reasoning":"una línea"}
`.trim();

        const routerAgent: AIAgent = {
            id: '__router__',
            name: 'Router',
            role: 'orchestrator',
            systemInstruction: 'Responde SOLO con JSON válido.',
            expertiseArea: 'routing',
            description: 'Internal routing agent',
            isActive: true,
        };

        try {
            const raw = await this.generatorService.sendMessage(routerAgent, [], routerPrompt);
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as RouterDecision;
                if (parsed.strategy && Array.isArray(parsed.agentIds) && parsed.agentIds.length > 0) {
                    return parsed;
                }
            }
        } catch {
            // Fallthrough to fallback
        }

        return { strategy: 'single', agentIds: [agents[0].id] };
    }

    /**
     * Synthesis: consolidates multiple specialist responses into one
     * coherent document and streams the result to the UI.
     */
    private async synthesize(
        specialistResponses: { agent: AIAgent; response: string }[],
        originalQuestion: string,
        onChunk?: (text: string) => void,
        lengthPreference?: 'concise' | 'detailed'
    ): Promise<string> {
        const specialistSection = specialistResponses
            .map(({ agent, response }) =>
                `=== ${agent.name} (${agent.expertiseArea}) ===\n${response}`
            )
            .join('\n\n');

        const synthesisPrompt = `
Eres un sintetizador de respuestas teológicas. Tu trabajo es integrar las contribuciones de varios especialistas en UN SOLO documento cohesivo.

PREGUNTA ORIGINAL: "${originalQuestion}"

RESPUESTAS DE LOS ESPECIALISTAS:
${specialistSection}

REGLAS DE SÍNTESIS (CRÍTICAS):

1. NUNCA atribuyas ideas a los tutores/especialistas. Los tutores NO son fuentes.
   PROHIBIDO: "(Dr. Berith, Exégesis Hebrea)", "(Pastor Noutético)", "Según Dr. Crisóstomo...", "Basado en la perspectiva del Dr. X"
   Los tutores son internos; el usuario final no debe verlos citados.

2. PRESERVA las citas válidas a documentos reales que usen el formato (Autor, Título, p. N).
   Ejemplos válidos que debes mantener: "(Kidner, Psalms 1-72, p. 45)", "(Wallace, Gramática Griega, p. 213)"

3. ELIMINA cualquier cita sospechosa:
   - Secuencias alfanuméricas sin sentido como "(lkxxzy9wx7z7, pág. 184)" — bórralas.
   - Citas genéricas como "(Pastor Noutético)" o "(Dr. Berith)" — bórralas.
   - Si un especialista dijo "Basado en <algo_extraño>, citado por Dr. X" — elimina esa atribución.

4. Integra las perspectivas SIN decir de qué especialista provienen. El resultado debe leerse como UN solo autor experto.

5. Si una misma cita aparece en varios especialistas, inclúyela UNA VEZ.

6. Usa Markdown para estructurar. Comienza directamente con el contenido integrado, sin preámbulos.
`.trim();

        const synthAgent: AIAgent = {
            id: '__synthesizer__',
            name: 'Sintetizador',
            role: 'synthesizer',
            systemInstruction: 'Integras respuestas de múltiples especialistas teológicos en un documento cohesivo.',
            expertiseArea: 'synthesis',
            description: 'Internal synthesis agent',
            isActive: true,
        };

        if (onChunk) {
            return this.generatorService.sendMessageStream(
                synthAgent, [], synthesisPrompt, onChunk, lengthPreference
            );
        }
        return this.generatorService.sendMessage(synthAgent, [], synthesisPrompt, lengthPreference);
    }

    /**
     * Generate a concise contextual title from the first user message.
     * Keeps session list readable (e.g., "Salmo 1: Consejería Pastoral" instead of "Sesión con Dr. Alétheia").
     */
    private async generateSessionTitle(firstMessage: string): Promise<string | null> {
        const titleAgent: AIAgent = {
            id: '__title_gen__',
            name: 'TitleGenerator',
            role: 'title',
            systemInstruction: 'Generas títulos breves y descriptivos en español. Responde SOLO con el título, sin comillas, sin puntuación final, sin prefijos.',
            expertiseArea: 'title-generation',
            description: 'Internal title generator',
            isActive: true,
        };

        const prompt = `Genera un título MUY breve (máximo 6 palabras) que resuma el tema de esta pregunta teológica:

"${firstMessage}"

Ejemplos de buenos títulos:
- "Salmo 1: Consejería Pastoral"
- "Exégesis de Hebreos 1:1-4"
- "Griego Koiné: Aoristo"
- "Consejería Prematrimonial"
- "Teología del Pacto"

Responde solo con el título, sin comillas.`;

        try {
            const raw = await this.generatorService.sendMessage(titleAgent, [], prompt);
            const cleaned = raw
                .trim()
                .replace(/^["'«]|["'»]$/g, '')
                .replace(/\.$/, '')
                .trim();
            // Validate: non-empty, not too long
            if (cleaned.length > 0 && cleaned.length <= 80) return cleaned;
        } catch {
            // Silent fail — title generation is non-critical
        }
        return null;
    }

    /**
     * Deduplicate sources by author+title, merging page lists when applicable.
     */
    private dedupSources(sources: SourceReference[]): SourceReference[] {
        const byKey = new Map<string, SourceReference>();
        for (const src of sources) {
            const key = src.author ? `${src.author}||${src.title}` : `store||${src.title}`;
            if (!byKey.has(key)) {
                byKey.set(key, { ...src });
            }
            // If duplicate, keep the first one (pages already aggregated per specialist)
        }
        return Array.from(byKey.values());
    }
}
