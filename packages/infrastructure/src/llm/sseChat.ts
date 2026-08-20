import { getAuth } from 'firebase/auth';
import { getToken } from 'firebase/app-check';
import { appCheck } from '../config/firebase';

/**
 * Cliente del endpoint de chat con streaming del servidor (SSE).
 *
 * Extraído de `SseMultiAgentService` para que el chat del wizard use el MISMO
 * lector: si cada superficie escribiera su parseo de SSE, el día que cambie el
 * protocolo habría que acordarse de todas.
 *
 * `onChunk` recibe cada fragmento tal como llega; la función resuelve con el
 * texto completo.
 */

export interface SseChatBody {
    systemInstruction?: string;
    history?: Array<{ role: string; text: string }>;
    message: string;
    model?: string;
    visionModel?: string;
    generationConfig?: Record<string, unknown>;
    corpusIds?: string[];
    attachments?: Array<{ mimeType: string; data: string }>;
    feature?: string;
}

export const FACULTY_STREAM_URL =
    (import.meta as any).env?.VITE_FACULTY_STREAM_URL ||
    'https://us-central1-dosfilosapp.cloudfunctions.net/facultyChatStream';

/** Identidad + App Check: el endpoint los verifica a mano y rechaza sin ellos. */
async function authHeaders(): Promise<Record<string, string>> {
    const user = getAuth().currentUser;
    if (!user) throw new Error('sseChat: usuario no autenticado');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await user.getIdToken()}`,
    };
    try {
        if (appCheck) headers['X-Firebase-AppCheck'] = (await getToken(appCheck)).token;
    } catch {
        // Sin token el endpoint responde 401 explícito; mejor eso que un header vacío.
    }
    return headers;
}

export async function streamChat(
    body: SseChatBody,
    onChunk?: (text: string) => void,
    endpoint: string = FACULTY_STREAM_URL,
): Promise<{ text: string; grounding: unknown[] }> {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
        throw new Error(`sseChat: ${res.status} ${await res.text().catch(() => '')}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    let grounding: unknown[] = [];

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Los eventos se separan por línea en blanco; un paquete de red puede
        // cortar uno por la mitad, así que solo se procesan los completos.
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
            const evt = /event: (.+)/.exec(raw)?.[1];
            const dataLine = /data: (.+)/.exec(raw)?.[1];
            if (!evt || !dataLine) continue;
            const data = JSON.parse(dataLine);
            if (evt === 'chunk' && typeof data.text === 'string') {
                full += data.text;
                onChunk?.(data.text);
            } else if (evt === 'done') {
                if (typeof data.text === 'string' && data.text.length > full.length) full = data.text;
                if (Array.isArray(data.grounding)) grounding = data.grounding;
            } else if (evt === 'error') {
                throw new Error(String(data.message ?? 'sseChat error'));
            }
        }
    }
    return { text: full, grounding };
}
