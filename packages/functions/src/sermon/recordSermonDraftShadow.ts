import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { deriveShadowContext } from '../config/accountSegment';

/**
 * Instrumentación de sombra del draft — RECORDER (persistencia común).
 *
 * Recibe las señales de CUALQUIER colector (determinista o juez) bajo el contrato
 * común `DraftShadowSignal[]` + metadata, y las persiste en `sermonDraftShadow/`.
 * Espeja `recordPassageProfileShadow`: callable fino, SIN LLM, non-blocking, no
 * gatea nada. La emisión del juez es independiente de la determinista (aislamiento
 * en el llamador); acá solo se persiste lo que llegue.
 */

const SHADOW_TTL_DAYS = 90;

interface SignalInput {
    key?: unknown;
    kind?: unknown;
    value?: unknown;
    proxy?: unknown;
    verdict?: unknown;
}

function str(v: unknown): string {
    return String(v ?? '').trim();
}

function normalizeSignal(s: SignalInput): Record<string, unknown> | null {
    const key = str(s?.key);
    const kind = s?.kind === 'judged' ? 'judged' : s?.kind === 'deterministic' ? 'deterministic' : '';
    if (!key || !kind) return null;
    const out: Record<string, unknown> = { key, kind };
    const v = s?.value;
    out.value = typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? v : null;
    if (s?.proxy === true) out.proxy = true;
    const verdict = str(s?.verdict);
    if (verdict === 'yes' || verdict === 'unclear' || verdict === 'no') out.verdict = verdict;
    return out;
}

export const recordSermonDraftShadow = onCall(
    { ...appCheckCallableOptions() },
    async (request) => {
        if (!request.auth) throw new HttpsError('unauthenticated', 'User must be authenticated');
        const userId = request.auth.uid;
        const data = request.data ?? {};

        const sermonId = str(data.sermonId);
        const passage = str(data.passage);
        if (!sermonId) throw new HttpsError('invalid-argument', 'sermonId is required');

        const rawSignals = Array.isArray(data.signals) ? (data.signals as SignalInput[]).slice(0, 50) : [];
        const signals = rawSignals.map(normalizeSignal).filter((s): s is Record<string, unknown> => s !== null);
        if (signals.length === 0) throw new HttpsError('invalid-argument', 'signals is required');

        // Metadata para segmentar (approachType es la vara del validador de profundidad).
        const approachType = str(data.approachType);
        const principlePresent = data.principlePresent === true;
        const collector = data.collector === 'judged' ? 'judged' : 'deterministic';

        const expiresAt = Timestamp.fromMillis(Date.now() + SHADOW_TTL_DAYS * 24 * 60 * 60 * 1000);
        // Mismo contexto que la sombra de la fase de estudio: el borrador sale
        // de un estudio que corrió con enforcement o sin él, y sin registrarlo
        // las dos poblaciones quedan mezcladas también acá.
        const { segment, behaviorFlags } = await deriveShadowContext(userId);

        await admin
            .firestore()
            .collection('sermonDraftShadow')
            .add({
                userId,
                segment,
                behaviorFlags,
                sermonId,
                passage,
                approachType,
                principlePresent,
                collector,
                signals,
                createdAt: FieldValue.serverTimestamp(),
                expiresAt,
            });

        return { recorded: true };
    },
);
