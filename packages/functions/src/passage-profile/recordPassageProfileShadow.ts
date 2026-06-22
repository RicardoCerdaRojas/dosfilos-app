import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { deriveSegment } from '../config/accountSegment';

/**
 * ADR-035 — perfil del pasaje, Capa 1 (modo SHADOW).
 *
 * Callable fino, SIN LLM: persiste una corrida del perfil en modo sombra para
 * adjudicar la PRECISIÓN del detector antes de flipear `passage_profile` a
 * enforce (PR2/PR3). NO surface nada ni bloquea — solo registra.
 *
 * Mide (ver plan §5): nº de features, nº `hard`, anclas (corte 1: ≥90 % con
 * ancla válida), movimientos, hueco (cero features detectadas), latencia,
 * segmento server-side. Espeja `recordDoxologicalGateShadow`.
 *
 * Retención: TTL nativo de Firestore sobre `expiresAt` como backstop; la purga
 * real es manual al decidir el flip.
 */

const SHADOW_TTL_DAYS = 90;

// Segmentación de cuenta → util compartida `../config/accountSegment` (SSOT).

interface AnchorInput {
    reference?: unknown;
}
interface FeatureInput {
    typeKey?: unknown;
    anchor?: AnchorInput;
    correctiveAnchor?: unknown;
}

function str(v: unknown): string {
    return String(v ?? '').trim();
}

/** ¿La feature trae ancla? Espeja `isFeatureAnchored` del dominio (corte 1). */
function featureHasAnchor(f: FeatureInput): boolean {
    if (f?.typeKey === 'ot-allusion') return Boolean(str(f.anchor?.reference));
    if (f?.typeKey === 'common-misreading') {
        return Array.isArray(f.correctiveAnchor) && f.correctiveAnchor.some((a) => Boolean(str((a as AnchorInput)?.reference)));
    }
    // ADR-035 R4 — illustration: ancla = verso + imagen presentes.
    if (f?.typeKey === 'illustration') return Boolean(str((f as { verseRef?: unknown }).verseRef) && str((f as { summary?: unknown }).summary));
    return false;
}

export const recordPassageProfileShadow = onCall(
    { ...appCheckCallableOptions() },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = request.auth.uid;
        const data = request.data ?? {};

        const seedId = str(data.seedId);
        const passage = str(data.passage);
        if (!seedId) throw new HttpsError('invalid-argument', 'seedId is required');
        if (!passage) throw new HttpsError('invalid-argument', 'passage is required');

        const genres = Array.isArray(data.genres) ? data.genres.map(str).filter(Boolean).slice(0, 10) : [];
        const features: FeatureInput[] = Array.isArray(data.features) ? (data.features as FeatureInput[]).slice(0, 50) : [];
        const movementCount = Math.max(0, Math.round(Number(data.movementCount ?? 0)) || 0);
        const latencyMs = Math.max(0, Math.round(Number(data.latencyMs ?? 0)) || 0);

        const featureCount = features.length;
        const anchoredCount = features.filter(featureHasAnchor).length;
        const otAllusionCount = features.filter((f) => f?.typeKey === 'ot-allusion').length;
        const misreadingCount = features.filter((f) => f?.typeKey === 'common-misreading').length;
        const illustrationCount = features.filter((f) => f?.typeKey === 'illustration').length;
        // Hueco: el perfil corrió pero no detectó NINGUNA feature conocida →
        // candidato a catálogo (telemetría de huecos, plan §5).
        const isGap = featureCount === 0;

        const expiresAt = Timestamp.fromMillis(Date.now() + SHADOW_TTL_DAYS * 24 * 60 * 60 * 1000);
        const segment = await deriveSegment(userId);

        await admin
            .firestore()
            .collection('passageProfileShadow')
            .add({
                userId,
                segment,
                seedId,
                passage,
                genres,
                schemaVersion: Math.max(0, Math.round(Number(data.schemaVersion ?? 0)) || 0),
                movementCount,
                featureCount,
                anchoredCount,
                otAllusionCount,
                misreadingCount,
                illustrationCount,
                isGap,
                latencyMs,
                createdAt: FieldValue.serverTimestamp(),
                expiresAt,
            });

        return { recorded: true };
    },
);
