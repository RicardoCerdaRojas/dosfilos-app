import {
    IAIChatRepository,
    IAIAgentRepository,
    IAIGeneratorService,
    AIChatMessage,
    SourceReference,
    AIAgent,
    ResponseMode,
    DEFAULT_LANGUAGE,
    resolveLocalized,
} from '@dosfilos/domain';
import type { SupportedLanguage } from '@dosfilos/domain';
import { generateId } from '../../utils/generateId';
import { CoreLibraryRAGService, RetrievedChunk, getRetrievalConfigForMode } from '../../services/CoreLibraryRAGService';

// Phase 2 RAG: retrieve once per user message, pass as context to Gemini
const ragService = new CoreLibraryRAGService();

function chunksToSources(chunks: RetrievedChunk[]): SourceReference[] {
    // Dedup by (author + title) and merge page lists
    const byDoc = new Map<string, { title: string; author: string; pages: Set<number>; sections: Set<string>; snippet: string; publiclyCitable: boolean }>();
    for (const c of chunks) {
        const key = `${c.resourceAuthor}||${c.resourceTitle}`;
        const entry = byDoc.get(key) ?? {
            title: c.resourceTitle,
            author: c.resourceAuthor,
            pages: new Set<number>(),
            sections: new Set<string>(),
            snippet: c.text.substring(0, 240).trim(),
            publiclyCitable: c.publiclyCitable === true,
        };
        if (c.metadata.page !== undefined) entry.pages.add(c.metadata.page);
        if (c.sectionBreadcrumb) entry.sections.add(c.sectionBreadcrumb);
        // All chunks of the same doc share the same citable flag; keep true if any chunk says true.
        if (c.publiclyCitable === true) entry.publiclyCitable = true;
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
        ref.publiclyCitable = entry.publiclyCitable;
        return ref;
    });
}

/**
 * Defensive cleaner: strip bogus citations (chunk-IDs, self-citations,
 * leaked protected-source attributions) that escaped past the system prompt.
 *
 * The protection sentinel is a phrase the model is forbidden to cite — but
 * Gemini occasionally regurgitates it as `(Material especializado, "Capítulo
 * X", p. N; Material especializado, "Capítulo Y", p. M)`. We strip these
 * here as a hard fail-safe, including the multi-citation form with semicolon
 * separators that the client-side extractor's regex misses.
 */
function cleanCitations(text: string, agentNames: string[] = []): string {
    let out = text;
    // Strip leaked RAG context headers "[Fuente N: ...]" / "[Source N: ...]"
    out = out.replace(/\[(?:Fuente|Source)\s+\d+:[^\]]*\]\s*/g, '');
    // Also strip the "CONTEXTO RECUPERADO" / "RETRIEVED CONTEXT" preamble if echoed literally
    out = out.replace(/^\s*(?:CONTEXTO RECUPERADO|RETRIEVED CONTEXT)\s*:?\s*\n+/i, '');
    out = out.replace(/\(Basado en [a-z0-9]{8,}[^)]*\)\.?/g, '');
    out = out.replace(/Basado en [a-z0-9]{8,},\s*pág\.?\s*\d+[^.]*\./gi, '');
    out = out.replace(/\([a-z0-9]{10,}\s*,\s*p(?:á|a)g\.?\s*\d+[^)]*\)/gi, '');

    // Protected-source leaks. Cover both languages and any mix of single + multi
    // citation inside the same parens. Examples we want to remove:
    //   (Material especializado, "Capítulo 1", p. 54)
    //   (Material curado, "Capítulo 1", p. 54; Material curado, "Capítulo 7", p. 49)
    //   (Curated material, "Chapter 1", p. 54)
    out = out.replace(
        /\((?:Material\s+(?:especializado|curado)|Curated\s+material)[^)]*\)\.?/gi,
        '',
    );

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
    out = out.replace(/,?\s*citado\s+por\s+(Dr\.|Pastor)\s+[^).,]+\)?/gi, ')');
    // Preserve newlines — only collapse horizontal whitespace
    out = out.replace(/\s*\(\s*\)/g, '');
    out = out.replace(/[ \t]{2,}/g, ' ');
    out = out.replace(/[ \t]+([.,;:])/g, '$1');
    out = out.replace(/\.{2,}/g, '.');
    out = out.replace(/\n{3,}/g, '\n\n');
    return out.trim();
}

export class SendAgentMessageUseCase {
    constructor(
        private agentRepository: IAIAgentRepository,
        private chatRepository: IAIChatRepository,
        private generatorService: IAIGeneratorService
    ) { }

    async execute(
        userId: string,
        sessionId: string,
        messageContent: string,
        onChunk?: (text: string) => void,
        lengthPreference?: ResponseMode,
        onSources?: (sources: SourceReference[]) => void,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        /**
         * Super-admin only: keep the real author/title of protected sources in
         * the model context so they appear as inline citations. Default false
         * (legal masking on). See `CoreLibraryRAGService.formatContextForPrompt`.
         */
        revealProtectedCitations = false,
    ): Promise<string> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const agent = await this.agentRepository.getAgent(session.agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

        // Normalize 'auto' → 'detailed' (this direct path has no router for inference)
        const effectiveMode: ResponseMode | undefined = lengthPreference === 'auto'
            ? 'detailed'
            : lengthPreference;

        // 1. Create and save the User message

        const userMessage: AIChatMessage = {
            id: generateId(),
            role: 'user',
            content: messageContent,
            timestamp: new Date()
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, userMessage);

        // 2. Prepare the full history for the LLM
        const history = [...session.messages, userMessage];

        // 3. PHASE 2 — Retrieve relevant chunks from our vector index BEFORE generation.
        // Retrieval is tuned per response mode: concise → fewer/tighter chunks,
        // academic → wider net. Direct-agent path has no router, so we use effectiveMode
        // (which collapses 'auto' → 'detailed' as a safe default).
        // effectiveMode is already 'auto'-free (see normalization above), but we default
        // to 'detailed' when the caller didn't pass any mode at all.
        const retrievalConfig = getRetrievalConfigForMode(effectiveMode ?? 'detailed');
        let retrievedContext: string | undefined;
        let capturedSources: SourceReference[] = [];
        try {
            // Core Library retrieval — prefer agent.stores (keys), fall back to the
            // legacy agent.corpusIds (Gemini URIs; server reverse-resolves to keys).
            const hasStores = agent.stores && agent.stores.length > 0;
            const hasCorpus = agent.corpusIds && agent.corpusIds.length > 0;
            const coreChunks = (hasStores || hasCorpus)
                ? await ragService.retrieve(messageContent, {
                      stores: hasStores ? agent.stores : undefined,
                      corpusIds: hasStores ? undefined : agent.corpusIds,
                      topK: retrievalConfig.topK,
                      minSimilarity: retrievalConfig.minSimilarity,
                  })
                : [];

            // Personal library retrieval (user's own uploads, tenant-isolated).
            // Half the topK of core so personal content complements without swamping.
            const personalTopK = Math.max(3, Math.floor(retrievalConfig.topK / 2));
            const personalChunks = await ragService.retrieve(messageContent, {
                userId,
                topK: personalTopK,
                minSimilarity: retrievalConfig.minSimilarity,
            });

            const allChunks = [...coreChunks, ...personalChunks];
            console.log(`[SendAgentMessage] Retrieved ${coreChunks.length} core + ${personalChunks.length} personal chunks for "${resolveLocalized(agent.name, language)}" (mode=${effectiveMode ?? 'default'})`);
            if (allChunks.length > 0) {
                retrievedContext = CoreLibraryRAGService.formatContextForPrompt(allChunks, language, { revealProtected: revealProtectedCitations });
                capturedSources = chunksToSources(allChunks);
                // Notify UI immediately — sources are known before Gemini even replies
                onSources?.(capturedSources);
            }
        } catch (err: any) {
            console.warn('[SendAgentMessage] RAG retrieval failed, continuing without context:', err?.message ?? err);
        }

        // 4. Request generation (streaming or bulk)
        let responseContent = '';
        const handleSources = (sources: SourceReference[]) => {
            // Legacy path (Phase 1 fileSearch): only fires when retrievedContext is undefined
            capturedSources = sources;
            onSources?.(sources);
        };

        if (onChunk) {
            responseContent = await this.generatorService.sendMessageStream(
                agent,
                history,
                messageContent,
                onChunk,
                effectiveMode,
                retrievedContext ? undefined : handleSources,  // Skip legacy path if we have Phase 2 context
                retrievedContext,
                language,
            );
        } else {
            responseContent = await this.generatorService.sendMessage(
                agent,
                history,
                messageContent,
                effectiveMode,
                undefined,
                language,
            );
        }

        // 4. Defensive cleanup + save
        const cleanedResponse = cleanCitations(responseContent, [resolveLocalized(agent.name, language)]);

        const modelMessage: AIChatMessage = {
            id: generateId(),
            role: 'model',
            content: cleanedResponse,
            timestamp: new Date(),
            ...(capturedSources.length > 0 && { sources: capturedSources }),
            ...(effectiveMode && { modeUsed: effectiveMode, modeWasAuto: lengthPreference === 'auto' }),
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, modelMessage);

        // Generate contextual session title on first exchange — awaited so UI refetch sees it
        if (session.messages.length === 0) {
            try {
                const title = await this.generateSessionTitle(messageContent, language);
                if (title) {
                    await this.chatRepository.renameSession(userId, sessionId, title);
                }
            } catch (err) {
                console.warn('[SendAgentMessage] Title generation failed:', err);
            }
        }

        return cleanedResponse;
    }

    private async generateSessionTitle(
        firstMessage: string,
        language: SupportedLanguage,
    ): Promise<string | null> {
        const titleAgent: AIAgent = {
            id: '__title_gen__',
            name: { es: 'TitleGenerator', en: 'TitleGenerator' },
            role: 'title',
            systemInstruction: {
                es: 'Generas títulos breves y descriptivos en español. Responde SOLO con el título, sin comillas, sin puntuación final, sin prefijos.',
                en: 'You generate brief, descriptive titles in English. Respond ONLY with the title, no quotes, no trailing punctuation, no prefixes.',
            },
            expertiseArea: { es: 'title-generation', en: 'title-generation' },
            description: { es: 'Internal title generator', en: 'Internal title generator' },
            isActive: true,
        };
        const prompt = language === 'en'
            ? `Generate a VERY brief title (max 6 words) summarizing the topic of this theological question:

"${firstMessage}"

Respond only with the title, no quotes.`
            : `Genera un título MUY breve (máximo 6 palabras) que resuma el tema de esta pregunta teológica:

"${firstMessage}"

Responde solo con el título, sin comillas.`;
        try {
            const raw = await this.generatorService.sendMessage(
                titleAgent, [], prompt, undefined, undefined, language,
            );
            const cleaned = raw.trim().replace(/^["'«]|["'»]$/g, '').replace(/\.$/, '').trim();
            if (cleaned.length > 0 && cleaned.length <= 80) return cleaned;
        } catch {}
        return null;
    }
}
