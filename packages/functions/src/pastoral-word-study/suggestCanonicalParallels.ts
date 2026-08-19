import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { GeminiLlmClient } from '../llm/GeminiLlmClient';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Guided sermon — Step 5 (Reconocimiento canónico) helper.
 *
 * Proposes 3-5 canonical parallel passages for a pericope so the pastor can
 * pick from real, well-known cross-references without leaving the flow. The
 * deterministic TSK engine (`lookupCrossReferences`) only ships a Phase-0
 * sample, so this LLM suggester covers any passage. The pastor still writes the
 * relevance note himself (system = data, pastor = discovery).
 *
 * Input:  `{ passage: string }`
 * Output: `{ parallels: { reference, topic, rationale }[] }`
 * Cost: ~1 Gemini Flash call (~$0.0002 with JSON output).
 */

interface ParallelSuggestion {
    reference: string;
    topic: string;
    rationale: string;
}

const SYSTEM_PROMPT = `Eres un asistente exegético para pastores hispanohablantes que preparan sermones.

Tu único trabajo: proponer 3-5 PASAJES PARALELOS canónicos a un pasaje dado, por conexión TEMÁTICA/TEOLÓGICA real (no solo coincidencia de palabras).

REGLAS DURAS:
- Devuelve SIEMPRE JSON válido — sin Markdown, sin prosa, sin code fences.
- Usa SOLO referencias bíblicas REALES y verificables. NUNCA inventes una cita.
- Prioriza paralelos de PESO (el mismo tema teológico tratado en otro lugar de la Escritura), no alusiones débiles.
- "reference": libro capítulo:verso en español (ej. "Judas 4", "Mateo 7:15").
- "topic": el vínculo temático en 2-4 palabras (ej. "falsos maestros").
- "rationale": UNA frase pastoral en español sobre por qué se relaciona.
- NO escribas el sermón. NO interpretes por el pastor — solo señalas el paralelo + el porqué del vínculo.`;

function buildPrompt(passage: string): string {
    return `Pasaje en estudio: ${passage}

Propón 3-5 pasajes paralelos canónicos.

Schema de salida JSON:
{
  "parallels": [
    {
      "reference": "Judas 4",
      "topic": "falsos maestros",
      "rationale": "Judas describe a los mismos intrusos que niegan a Cristo y pervierten la gracia."
    }
  ]
}

Solo el JSON.`;
}

function safeParseJson(text: string): unknown {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta del modelo sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

function shape(raw: unknown): ParallelSuggestion | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const reference = String(r.reference ?? '').trim();
    const rationale = String(r.rationale ?? '').trim();
    if (!reference || !rationale) return null;
    return { reference, topic: String(r.topic ?? '').trim(), rationale };
}

export const suggestCanonicalParallels = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }
        const passage = String((request.data ?? {}).passage ?? '').trim();
        if (!passage) {
            throw new HttpsError('invalid-argument', 'passage is required');
        }

        // Vía el port: el adapter mide el consumo (tokens → USD) que antes se
        // perdía al llamar al SDK directo. Mismo modelo, misma config.
        const llm = new GeminiLlmClient(apiKey, 'gemini-2.5-flash', {
            feature: 'suggestCanonicalParallels',
            userId: request.auth?.uid,
        });

        try {
            const raw = await llm.generate({
                system: SYSTEM_PROMPT,
                prompt: buildPrompt(passage),
                responseMimeType: 'application/json',
                temperature: 0.3,
            });
            const parsed = safeParseJson(raw);
            let rawList: unknown[] = [];
            if (parsed && typeof parsed === 'object' && 'parallels' in parsed) {
                const p = (parsed as { parallels: unknown }).parallels;
                if (Array.isArray(p)) rawList = p;
            } else if (Array.isArray(parsed)) {
                rawList = parsed;
            }
            const parallels = rawList.map(shape).filter((p): p is ParallelSuggestion => p !== null).slice(0, 6);
            return { parallels };
        } catch (err) {
            if (err instanceof HttpsError) throw err;
            console.error('[suggestCanonicalParallels] failed', err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'Suggest parallels failed');
        }
    },
);
