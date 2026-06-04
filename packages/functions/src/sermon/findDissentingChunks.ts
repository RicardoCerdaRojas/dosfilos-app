import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import type { ILlmClient } from '../llm/LlmClient';
import { GeminiLlmClient } from '../llm/GeminiLlmClient';
import { embedQuery } from '../library/retrieveChunks';

/**
 * Pastoral Fidelity — Phase 4 PR 1 (ADR-033) — contra-scan retrieval +
 * dissent classification.
 *
 * Implements P3 (Acts 20:27): before a sermon publishes, surface chunks from
 * the pastor's library that DISSENT from his central idea so he must engage
 * the opposing position rather than preach in an echo chamber.
 *
 * Two stages, both server-side:
 *   1. RETRIEVE — semantic search over `document_chunks` for the central idea,
 *      PERSONAL library first (priority), CORE homiletics as fill (ADR-031
 *      retrieval reused: same embedding model, same collection). We retrieve
 *      topically-related chunks; agreement vs. dissent is decided in stage 2.
 *   2. CLASSIFY — a single LLM pass (`ILlmClient`, NOT the SDK directly —
 *      tech_debt_llm_provider_abstraction) labels each candidate's stance
 *      toward the central idea and returns ONLY the dissenting ones, each with
 *      a one-line `tension`. The model classifies PROVIDED chunks — it never
 *      fabricates a position (07-citation-policy / ADR-031: never invent).
 *
 * Returns `{ dissenting: [] }` when the library is small/homogeneous or no
 * candidate genuinely dissents. The caller (`useContraScanGate`) treats an
 * empty result as `no-dissent` → publish proceeds with an "add sources" invite.
 */

const EMBEDDING_DIM_DISTANCE_MAX = 2; // cosine distance range [0,2]
const CHUNK_COLLECTION = 'document_chunks';
const HOMILETICS_STORE = 'homiletics';
/** Candidate pool size per scope before classification. */
const RETRIEVE_TOP_K = 8;
/** Hard cap on chunks sent to the classifier (cost/latency). */
const MAX_CANDIDATES = 12;

interface FindDissentingRequest {
    /** The pastor's central idea — the thesis the scan looks to challenge. */
    centralIdea: string;
}

interface DissentingChunkPayload {
    chunkId: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor: string;
    page?: number;
    excerpt: string;
    tension: string;
    score: number;
    fromPersonalLibrary: boolean;
}

interface Candidate {
    chunkId: string;
    resourceId: string;
    resourceTitle: string;
    resourceAuthor: string;
    page?: number;
    text: string;
    score: number;
    fromPersonalLibrary: boolean;
}

const SYSTEM = `Eres un revisor teológico riguroso y honesto. Tu tarea: dada una IDEA CENTRAL de un sermón y una lista de fragmentos de la biblioteca del pastor, identificar cuáles fragmentos presentan una POSICIÓN CONTRARIA, una OBJECIÓN, una MATIZACIÓN seria o una TENSIÓN real frente a esa idea central.

Reglas inviolables:
- Clasificas SOLO los fragmentos provistos. NUNCA inventas una posición contraria que no esté en el texto del fragmento.
- Un fragmento que simplemente repite o apoya la idea central NO es disenso: descártalo.
- Disenso real = el fragmento empujaría al pastor a defender mejor, reformular o reconocer un límite de su idea.
- Para cada fragmento disidente, redacta UNA frase ("tension") en español neutral, "tú", que nombre con justicia en qué disiente del pastor. No exageres ni fabriques.
- Si NINGÚN fragmento disiente de verdad, devuelve lista vacía. Es legítimo y preferible a inventar.`;

function buildClassifyPrompt(centralIdea: string, candidates: Candidate[]): string {
    const list = candidates
        .map(
            (c, i) =>
                `[${i}] (${c.resourceAuthor} — «${c.resourceTitle}»)\n"""${c.text.slice(0, 900)}"""`,
        )
        .join('\n\n');
    return `IDEA CENTRAL DEL SERMÓN:
"""${centralIdea}"""

FRAGMENTOS DE LA BIBLIOTECA (cada uno con su índice):
${list}

Devuelve SIEMPRE JSON válido (sin Markdown), con SOLO los fragmentos que disienten de verdad:
{
  "dissenting": [
    { "index": <número del fragmento>, "tension": "<una frase: en qué disiente de la idea central>" }
  ]
}
Si ninguno disiente, devuelve {"dissenting": []}.`;
}

function safeParseJson(text: string): Record<string, unknown> {
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const first = cleaned.search(/[{[]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first === -1 || last === -1) throw new Error('Respuesta sin JSON detectable.');
    return JSON.parse(cleaned.substring(first, last + 1));
}

/** One semantic query over document_chunks, scoped to personal OR a store. */
async function retrieveScope(
    db: FirebaseFirestore.Firestore,
    queryEmbedding: number[],
    scope: { userId?: string; store?: string },
    fromPersonalLibrary: boolean,
): Promise<Candidate[]> {
    let q: FirebaseFirestore.Query = db.collection(CHUNK_COLLECTION);
    if (scope.store) q = q.where('stores', 'array-contains-any', [scope.store]);
    if (scope.userId) q = q.where('userId', '==', scope.userId);

    const snap = await q
        .findNearest({
            vectorField: 'embedding',
            queryVector: queryEmbedding,
            limit: RETRIEVE_TOP_K,
            distanceMeasure: 'COSINE',
            distanceResultField: '_distance',
        })
        .get();

    return snap.docs.map((doc) => {
        const data = doc.data();
        const distance = (data._distance as number) ?? 0;
        return {
            chunkId: doc.id,
            resourceId: data.resourceId ?? '',
            resourceTitle: data.resourceTitle ?? 'Documento sin título',
            resourceAuthor: data.resourceAuthor ?? 'Autor desconocido',
            page: data.metadata?.page,
            text: data.text ?? '',
            score: Math.max(0, 1 - distance / EMBEDDING_DIM_DISTANCE_MAX),
            fromPersonalLibrary,
        };
    });
}

export const findDissentingChunks = onCall<FindDissentingRequest>(
    {
        ...appCheckCallableOptions(),
        region: 'us-central1',
        memory: '1GiB',
        timeoutSeconds: 60,
        secrets: ['GEMINI_API_KEY'],
    },
    async (request): Promise<{ dissenting: DissentingChunkPayload[] }> => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'Sign-in required');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY not configured');

        const centralIdea = (request.data?.centralIdea ?? '').trim();
        if (!centralIdea) return { dissenting: [] };

        const db = getFirestore();
        const uid = request.auth.uid;

        // 1. RETRIEVE — personal first (priority), CORE homiletics as fill.
        let candidates: Candidate[];
        try {
            const queryEmbedding = await embedQuery(centralIdea, apiKey);
            const [personal, core] = await Promise.all([
                retrieveScope(db, queryEmbedding, { userId: uid }, true),
                retrieveScope(db, queryEmbedding, { store: HOMILETICS_STORE }, false),
            ]);

            // Personal priority: dedupe by chunkId, personal wins; cap the pool.
            const seen = new Set<string>();
            candidates = [];
            for (const c of [...personal, ...core]) {
                if (!c.text.trim() || seen.has(c.chunkId)) continue;
                seen.add(c.chunkId);
                candidates.push(c);
                if (candidates.length >= MAX_CANDIDATES) break;
            }
        } catch (err: any) {
            const msg = err?.message ?? 'Unknown error';
            console.error('[findDissentingChunks] retrieval failed:', msg);
            // Retrieval failure is non-fatal to the publish flow: no dissent surfaced.
            return { dissenting: [] };
        }

        if (candidates.length === 0) return { dissenting: [] };

        // 2. CLASSIFY — LLM labels stance; returns only genuine dissenters.
        try {
            const llm: ILlmClient = new GeminiLlmClient(apiKey);
            const raw = await llm.generate({
                system: SYSTEM,
                prompt: buildClassifyPrompt(centralIdea, candidates),
                temperature: 0.2,
                responseMimeType: 'application/json',
            });
            const parsed = safeParseJson(raw);
            const rows = Array.isArray(parsed.dissenting) ? parsed.dissenting : [];

            const dissenting: DissentingChunkPayload[] = [];
            for (const row of rows) {
                const idx = Number((row as any)?.index);
                const tension = String((row as any)?.tension ?? '').trim();
                if (!Number.isInteger(idx) || idx < 0 || idx >= candidates.length) continue;
                if (!tension) continue;
                const c = candidates[idx];
                dissenting.push({
                    chunkId: c.chunkId,
                    resourceId: c.resourceId,
                    resourceTitle: c.resourceTitle,
                    resourceAuthor: c.resourceAuthor,
                    page: c.page,
                    excerpt: c.text.slice(0, 280),
                    tension,
                    score: c.score,
                    fromPersonalLibrary: c.fromPersonalLibrary,
                });
            }
            return { dissenting };
        } catch (err: any) {
            console.error('[findDissentingChunks] classification failed:', err?.message ?? err);
            // Classifier failure → no dissent surfaced; publish proceeds (soft).
            return { dissenting: [] };
        }
    },
);
