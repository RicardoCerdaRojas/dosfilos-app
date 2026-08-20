import { getAuth } from 'firebase/auth';
import { getToken } from 'firebase/app-check';
import type {
    AIAgent,
    AIChatMessage,
    IAIGeneratorService,
    InlineAttachment,
    ResponseMode,
    SourceReference,
    SupportedLanguage,
} from '@dosfilos/domain';
import { DEFAULT_LANGUAGE } from '@dosfilos/domain';
import { buildSystemInstruction } from './prompts/geminiMultiAgentPrompts';
import { appCheck } from '../config/firebase';

/**
 * Chat de Faculty contra el SERVIDOR, por SSE.
 *
 * Implementa el mismo puerto `IAIGeneratorService`, así que los siete casos de
 * uso que dependen de él no cambian ni una línea: se sustituye la
 * implementación en el único punto de inyección.
 *
 * POR QUÉ SSE Y NO UN CALLABLE: los callables ya soportan streaming en el
 * servidor, pero el SDK cliente (`firebase@10.14`) no expone `.stream()` — llegó
 * en la 11, y ese upgrade toca auth, firestore y storage de toda la app. `fetch`
 * no depende del SDK, así que el chat conserva el streaming sin ese riesgo.
 *
 * REUSA el armado del prompt en vez de duplicarlo: si se copiara, las dos rutas
 * divergirían en silencio y el chat respondería distinto según por dónde saliera.
 * `buildSystemInstruction` es una función pura del módulo de prompts — antes era
 * un método de la clase que hablaba directo con Gemini, y reusarlo obligaba a
 * instanciarla con una clave vacía, lo que arrastraba el SDK al bundle.
 */
export class SseMultiAgentService implements IAIGeneratorService {
    constructor(
        private readonly endpoint: string,
        private readonly modelName = 'gemini-2.5-flash',
        private readonly visionModelName = 'gemini-2.5-pro',
    ) {}

    async sendMessageStream(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        onChunk: (text: string) => void,
        lengthPreference?: ResponseMode,
        onSources?: (sources: SourceReference[]) => void,
        retrievedContext?: string,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
        attachments?: InlineAttachment[],
    ): Promise<string> {
        const usingRag = !!retrievedContext;
        const finalMessage = usingRag
            ? (language === 'en'
                ? `RETRIEVED CONTEXT (use as primary material and cite per the [Source N: ...] headers):\n\n${retrievedContext}\n\n---\n\nUSER QUESTION: ${message}`
                : `CONTEXTO RECUPERADO (usa esto como material primario y cita según indican los encabezados [Fuente N: ...]):\n\n${retrievedContext}\n\n---\n\nPREGUNTA DEL USUARIO: ${message}`)
            : message;

        const body = {
            systemInstruction: buildSystemInstruction(agent, lengthPreference, language),
            history: history.map((h) => ({ role: h.role, text: h.content })),
            message: finalMessage,
            model: this.modelName,
            visionModel: this.visionModelName,
            generationConfig: buildGenerationConfig(!!attachments?.length, this.visionModelName),
            // El fileSearch del agente solo aplica en el camino legacy: con RAG
            // explícito el contexto ya viaja en el mensaje.
            ...(!usingRag && agent.corpusIds?.length ? { corpusIds: agent.corpusIds } : {}),
            ...(attachments?.length
                ? { attachments: attachments.map((a) => ({ mimeType: a.mimeType, data: a.data })) }
                : {}),
            feature: 'facultyChat',
        };

        const res = await fetch(this.endpoint, {
            method: 'POST',
            headers: await this.authHeaders(),
            body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
            throw new Error(`facultyChatStream: ${res.status} ${await res.text().catch(() => '')}`);
        }

        return this.readSse(res.body, onChunk, onSources);
    }

    /** Sin streaming: se consume el mismo endpoint y se acumula. */
    async sendMessage(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: ResponseMode,
        _enableThinking?: boolean,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<string> {
        return this.sendMessageStream(agent, history, message, () => {}, lengthPreference, undefined, undefined, language);
    }

    async sendMessageWithSources(
        agent: AIAgent,
        history: AIChatMessage[],
        message: string,
        lengthPreference?: ResponseMode,
        language: SupportedLanguage = DEFAULT_LANGUAGE,
    ): Promise<{ response: string; sources: SourceReference[] }> {
        let sources: SourceReference[] = [];
        const response = await this.sendMessageStream(
            agent, history, message, () => {}, lengthPreference,
            (s) => { sources = s; }, undefined, language,
        );
        return { response, sources };
    }

    /** Identidad + App Check: el endpoint los exige y los verifica a mano. */
    private async authHeaders(): Promise<Record<string, string>> {
        const user = getAuth().currentUser;
        if (!user) throw new Error('facultyChatStream: usuario no autenticado');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await user.getIdToken()}`,
        };
        try {
            if (appCheck) {
                headers['X-Firebase-AppCheck'] = (await getToken(appCheck)).token;
            }
        } catch {
            // Sin token de App Check el endpoint rechaza; se deja fallar ahí con
            // un 401 explícito en vez de inventar un header vacío.
        }
        return headers;
    }

    /** Lee el stream SSE: `chunk` → callback, `done` → fuentes + texto final. */
    private async readSse(
        stream: ReadableStream<Uint8Array>,
        onChunk: (text: string) => void,
        onSources?: (sources: SourceReference[]) => void,
    ): Promise<string> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';

        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Los eventos SSE se separan por línea en blanco; un chunk de red
            // puede cortar uno por la mitad, así que solo se procesan completos.
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';
            for (const raw of events) {
                const evt = /event: (.+)/.exec(raw)?.[1];
                const dataLine = /data: (.+)/.exec(raw)?.[1];
                if (!evt || !dataLine) continue;
                const data = JSON.parse(dataLine);
                if (evt === 'chunk' && typeof data.text === 'string') {
                    full += data.text;
                    onChunk(data.text);
                } else if (evt === 'done') {
                    if (typeof data.text === 'string' && data.text.length > full.length) {
                        full = data.text;
                    }
                    if (onSources && Array.isArray(data.grounding) && data.grounding.length > 0) {
                        onSources(mapGrounding(data.grounding));
                    }
                } else if (evt === 'error') {
                    throw new Error(String(data.message ?? 'facultyChatStream error'));
                }
            }
        }
        return full;
    }
}

/**
 * Mismos parámetros que la ruta directa: techo duro de salida y temperatura
 * moderada — sin cap, Flash degeneraba en bucles de repetición.
 */
function buildGenerationConfig(hasAttachments: boolean, visionModel: string): Record<string, unknown> {
    const model = hasAttachments ? visionModel : '';
    const isPro = /\bpro\b/i.test(model);
    const cfg: Record<string, unknown> = { maxOutputTokens: 8192, temperature: 0.6, topP: 0.9 };
    // Pro rechaza `thinkingBudget: 0`; en Flash se desactiva para latencia/costo.
    if (!isPro) cfg.thinkingConfig = { thinkingBudget: 0 };
    return cfg;
}

function mapGrounding(chunks: unknown[]): SourceReference[] {
    return chunks
        .map((c) => {
            const r = (c as { retrievedContext?: { title?: string; text?: string } }).retrievedContext;
            if (!r) return null;
            return { title: r.title ?? '', snippet: r.text ?? '' } as SourceReference;
        })
        .filter((s): s is SourceReference => s !== null);
}
