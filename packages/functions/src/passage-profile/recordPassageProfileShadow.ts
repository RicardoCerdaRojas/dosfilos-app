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

type GenreProvenance = 'aiProposed' | 'userConfirmed' | 'userOverride';
type GenreVerdict = 'confirmed' | 'discrepancy' | 'unclear';

/**
 * Redacción v2 Fase 1 (§4.4) A3 — sanitiza la señal del override de género.
 * FAIL-CLOSED: provenance/verdict desconocidos caen a los valores seguros
 * (aiProposed / unclear) para no inflar confirmaciones ni discrepancias.
 */
function sanitizeGenreOverride(raw: unknown): {
    proposedGenre: string;
    provenance: GenreProvenance;
    verdict: GenreVerdict;
    sustained: boolean;
} {
    const o = (raw ?? {}) as Record<string, unknown>;
    const provenanceIn = str(o.provenance);
    const verdictIn = str(o.verdict);
    const provenance: GenreProvenance =
        provenanceIn === 'userConfirmed' || provenanceIn === 'userOverride' ? provenanceIn : 'aiProposed';
    const verdict: GenreVerdict =
        verdictIn === 'confirmed' || verdictIn === 'discrepancy' ? verdictIn : 'unclear';
    return { proposedGenre: str(o.proposedGenre), provenance, verdict, sustained: o.sustained === true };
}

type StructuralVerdict = 'suficiente' | 'insuficiente' | 'unclear';

/**
 * Redacción v2 Fase 1 (§4.5) B5 — sanitiza la señal de suficiencia estructural.
 * FAIL-CLOSED: provenance/verdict desconocidos → valores seguros (aiProposed /
 * unclear). Lleva el género CALIFICADO + provenance (036) + el género destino del
 * override si el pastor corrigió (re-runnable offline).
 */
function sanitizeStructuralSufficiency(raw: unknown): {
    qualifiedGenre: string;
    provenance: GenreProvenance;
    verdict: StructuralVerdict;
    overrideTargetGenre: string | null;
} {
    const o = (raw ?? {}) as Record<string, unknown>;
    const provenanceIn = str(o.provenance);
    const verdictIn = str(o.verdict);
    const provenance: GenreProvenance =
        provenanceIn === 'userConfirmed' || provenanceIn === 'userOverride' ? provenanceIn : 'aiProposed';
    const verdict: StructuralVerdict =
        verdictIn === 'suficiente' || verdictIn === 'insuficiente' ? verdictIn : 'unclear';
    const target = str(o.overrideTargetGenre);
    return { qualifiedGenre: str(o.qualifiedGenre), provenance, verdict, overrideTargetGenre: target || null };
}

/** ¿La feature trae ancla? Espeja `isFeatureAnchored` del dominio (corte 1). */
function featureHasAnchor(f: FeatureInput): boolean {
    if (f?.typeKey === 'ot-allusion') return Boolean(str(f.anchor?.reference));
    if (f?.typeKey === 'common-misreading') {
        return Array.isArray(f.correctiveAnchor) && f.correctiveAnchor.some((a) => Boolean(str((a as AnchorInput)?.reference)));
    }
    // ADR-035 R4/R7 — illustration/parallelism/textual-crux: ancla = verso+texto;
    // named-entity: verso+nombre.
    const g = f as { verseRef?: unknown; summary?: unknown; name?: unknown };
    if (f?.typeKey === 'illustration' || f?.typeKey === 'parallelism' || f?.typeKey === 'textual-crux') {
        return Boolean(str(g.verseRef) && str(g.summary));
    }
    if (f?.typeKey === 'named-entity') return Boolean(str(g.verseRef) && str(g.name));
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

        const segmentEarly = await deriveSegment(userId);
        const ttlExpiresAt = Timestamp.fromMillis(Date.now() + SHADOW_TTL_DAYS * 24 * 60 * 60 * 1000);

        // Redacción v2 Fase 1 (§4.4) A3 — señal del override de género. Es un
        // evento SEPARADO (paso 2), no la corrida del perfil (inicio del estudio):
        // se registra en un doc propio con signalType 'genreOverride' para NO
        // contaminar las métricas de features/hueco del perfil.
        if (data.genreOverride) {
            await admin
                .firestore()
                .collection('passageProfileShadow')
                .add({
                    userId,
                    segment: segmentEarly,
                    seedId,
                    passage,
                    signalType: 'genreOverride' as const,
                    genreOverride: sanitizeGenreOverride(data.genreOverride),
                    createdAt: FieldValue.serverTimestamp(),
                    expiresAt: ttlExpiresAt,
                });
            return { recorded: true };
        }

        // Redacción v2 Fase 1 (§4.5) B5 — señal de suficiencia estructural del
        // paso 3, sibling de 'genreOverride' en la MISMA colección (fase-estudio),
        // signalType propio → no contamina las métricas del perfil ni del override.
        if (data.structuralSufficiency) {
            await admin
                .firestore()
                .collection('passageProfileShadow')
                .add({
                    userId,
                    segment: segmentEarly,
                    seedId,
                    passage,
                    signalType: 'structuralSufficiency' as const,
                    structuralSufficiency: sanitizeStructuralSufficiency(data.structuralSufficiency),
                    createdAt: FieldValue.serverTimestamp(),
                    expiresAt: ttlExpiresAt,
                });
            return { recorded: true };
        }

        const genres = Array.isArray(data.genres) ? data.genres.map(str).filter(Boolean).slice(0, 10) : [];
        const features: FeatureInput[] = Array.isArray(data.features) ? (data.features as FeatureInput[]).slice(0, 50) : [];
        const movementCount = Math.max(0, Math.round(Number(data.movementCount ?? 0)) || 0);
        const latencyMs = Math.max(0, Math.round(Number(data.latencyMs ?? 0)) || 0);

        const featureCount = features.length;
        const anchoredCount = features.filter(featureHasAnchor).length;
        const otAllusionCount = features.filter((f) => f?.typeKey === 'ot-allusion').length;
        const misreadingCount = features.filter((f) => f?.typeKey === 'common-misreading').length;
        const illustrationCount = features.filter((f) => f?.typeKey === 'illustration').length;
        const parallelismCount = features.filter((f) => f?.typeKey === 'parallelism').length;
        const namedEntityCount = features.filter((f) => f?.typeKey === 'named-entity').length;
        const textualCruxCount = features.filter((f) => f?.typeKey === 'textual-crux').length;
        // Hueco: el perfil corrió pero no detectó NINGUNA feature conocida →
        // candidato a catálogo (telemetría de huecos, plan §5).
        const isGap = featureCount === 0;

        const expiresAt = ttlExpiresAt;
        const segment = segmentEarly;

        await admin
            .firestore()
            .collection('passageProfileShadow')
            .add({
                userId,
                segment,
                seedId,
                passage,
                signalType: 'profile' as const,
                genres,
                schemaVersion: Math.max(0, Math.round(Number(data.schemaVersion ?? 0)) || 0),
                movementCount,
                featureCount,
                anchoredCount,
                otAllusionCount,
                misreadingCount,
                illustrationCount,
                parallelismCount,
                namedEntityCount,
                textualCruxCount,
                isGap,
                latencyMs,
                // ADR-036 PR6 corte 1 — verificación de anclas del detector (verso real).
                misreadingsTotal: Math.max(0, Math.round(Number(data.misreadingsTotal ?? 0)) || 0),
                misreadingsWithVerifiedAnchor: Math.max(0, Math.round(Number(data.misreadingsWithVerifiedAnchor ?? 0)) || 0),
                misreadingAnchorsTotal: Math.max(0, Math.round(Number(data.misreadingAnchorsTotal ?? 0)) || 0),
                misreadingAnchorsVerified: Math.max(0, Math.round(Number(data.misreadingAnchorsVerified ?? 0)) || 0),
                anchorFidelityEnforced: data.anchorFidelityEnforced === true,
                createdAt: FieldValue.serverTimestamp(),
                expiresAt,
            });

        return { recorded: true };
    },
);
