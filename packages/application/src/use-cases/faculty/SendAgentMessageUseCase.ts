import {
    IAIChatRepository,
    IAIAgentRepository,
    IAIGeneratorService,
    AIChatMessage,
    SourceReference,
    AIAgent,
} from '@dosfilos/domain';
import { generateId } from '../../utils/generateId';
import { CoreLibraryRAGService, RetrievedChunk } from '../../services/CoreLibraryRAGService';

// Phase 2 RAG: retrieve once per user message, pass as context to Gemini
const ragService = new CoreLibraryRAGService();

function chunksToSources(chunks: RetrievedChunk[]): SourceReference[] {
    // Dedup by (author + title) and merge page lists
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
 * Defensive cleaner: strip bogus citations (chunk-IDs, self-citations) that leaked past the prompt.
 */
function cleanCitations(text: string, agentNames: string[] = []): string {
    let out = text;
    out = out.replace(/\(Basado en [a-z0-9]{8,}[^)]*\)\.?/g, '');
    out = out.replace(/Basado en [a-z0-9]{8,},\s*pág\.?\s*\d+[^.]*\./gi, '');
    out = out.replace(/\([a-z0-9]{10,}\s*,\s*p(?:á|a)g\.?\s*\d+[^)]*\)/gi, '');
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
        lengthPreference?: 'concise' | 'detailed',
        onSources?: (sources: SourceReference[]) => void
    ): Promise<string> {
        const session = await this.chatRepository.getSession(userId, sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const agent = await this.agentRepository.getAgent(session.agentId);
        if (!agent) {
            throw new Error('Agent not found');
        }

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

        // 3. PHASE 2 — Retrieve relevant chunks from our vector index BEFORE generation
        let retrievedContext: string | undefined;
        let capturedSources: SourceReference[] = [];
        if (agent.corpusIds && agent.corpusIds.length > 0) {
            try {
                const chunks = await ragService.retrieve(messageContent, {
                    corpusIds: agent.corpusIds,
                    topK: 10,
                    minSimilarity: 0.3,
                });
                console.log(`[SendAgentMessage] Retrieved ${chunks.length} chunks for agent "${agent.name}"`);
                if (chunks.length > 0) {
                    retrievedContext = CoreLibraryRAGService.formatContextForPrompt(chunks);
                    capturedSources = chunksToSources(chunks);
                    // Notify UI immediately — sources are known before Gemini even replies
                    onSources?.(capturedSources);
                }
            } catch (err: any) {
                console.warn('[SendAgentMessage] RAG retrieval failed, continuing without context:', err?.message ?? err);
            }
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
                lengthPreference,
                retrievedContext ? undefined : handleSources,  // Skip legacy path if we have Phase 2 context
                retrievedContext,
            );
        } else {
            responseContent = await this.generatorService.sendMessage(
                agent,
                history,
                messageContent,
                lengthPreference
            );
        }

        // 4. Defensive cleanup + save
        const cleanedResponse = cleanCitations(responseContent, [agent.name]);

        const modelMessage: AIChatMessage = {
            id: generateId(),
            role: 'model',
            content: cleanedResponse,
            timestamp: new Date(),
            ...(capturedSources.length > 0 && { sources: capturedSources }),
        };
        await this.chatRepository.addMessageToSession(userId, sessionId, modelMessage);

        // Generate contextual session title on first exchange — awaited so UI refetch sees it
        if (session.messages.length === 0) {
            try {
                const title = await this.generateSessionTitle(messageContent);
                if (title) {
                    await this.chatRepository.renameSession(userId, sessionId, title);
                }
            } catch (err) {
                console.warn('[SendAgentMessage] Title generation failed:', err);
            }
        }

        return cleanedResponse;
    }

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

Responde solo con el título, sin comillas.`;
        try {
            const raw = await this.generatorService.sendMessage(titleAgent, [], prompt);
            const cleaned = raw.trim().replace(/^["'«]|["'»]$/g, '').replace(/\.$/, '').trim();
            if (cleaned.length > 0 && cleaned.length <= 80) return cleaned;
        } catch {}
        return null;
    }
}
