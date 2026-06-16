import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Grieta doxológica — Capa 1 (modo sombra).
 *
 * Callable fino, SIN LLM: persiste una corrida del gate doxológico en modo
 * sombra. El veredicto (status/escalation) ya lo computó el cliente con el
 * único motor de fidelidad (`evaluateDoxologicalGate` sobre el `WitnessResult`
 * escalado); aquí solo se valida la forma y se escribe el registro de auditoría
 * server-authoritative (timestamp + uid de confianza + TTL).
 *
 * El registro guarda el texto doxológico COMPLETO del pastor → acceso
 * restringido a super_admin (Firestore rules) + TTL nativo de Firestore sobre
 * `expiresAt`.
 *
 * Retención: la purga REAL es manual tras la DECISIÓN de flip (requisito del
 * fundador). El TTL de 90 días es solo un backstop anti-"para siempre": a
 * volumen per-usuario bajo, juntar el piso de ≥20 Insights puede tomar semanas,
 * así que 90d supera con margen la ventana de acumulación + adjudicación sin que
 * los registros del día 1 expiren antes de adjudicar.
 *
 * El shadow NO bloquea ni decide nada — solo registra para adjudicar la lógica
 * del gate + la tasa de falsos positivos antes de flipear a enforce (Capa 2).
 */

/** Backstop de retención (días) antes de la purga automática (TTL nativo).
 * La purga real es manual al decidir el flip; esto solo evita retención
 * indefinida si la decisión se demora. */
const SHADOW_TTL_DAYS = 90;

type GateStatus = 'pass' | 'soft' | 'hard';
type EscalationBand = 'pass' | 'note' | 'soft-block' | 'hard-block' | 'absolute-block';
type ShadowFlow = 'wizard' | 'guided-insight' | 'guided-socratic' | 'guided-wordstudies';
type OneShotVerdict = 'pass' | 'block' | null;

const STATUSES: ReadonlyArray<GateStatus> = ['pass', 'soft', 'hard'];
const BANDS: ReadonlyArray<EscalationBand> = [
    'pass',
    'note',
    'soft-block',
    'hard-block',
    'absolute-block',
];
const FLOWS: ReadonlyArray<ShadowFlow> = [
    'wizard',
    'guided-insight',
    'guided-socratic',
    'guided-wordstudies',
];

interface RecordShadowRequest {
    seedId?: string;
    sermonId?: string;
    flow?: string;
    /** Texto doxológico completo evaluado. */
    doxologicalText?: string;
    /** Veredicto del gate doxológico (folded). */
    status?: string;
    /** Banda de escalación cruda del único motor. */
    escalation?: string;
    /** Latencia de la llamada a los tres testigos, en ms. */
    witnessLatencyMs?: number;
    /** True si el resultado vino de caché (latencia no representa el costo LLM). */
    cacheHit?: boolean;
    /** Wizard: stance del one-shot (incluye todos los claims). Guiado: null. */
    oneShotVerdict?: string | null;
    /** Si la llamada a testigos falló (fail-open): mensaje del fallo. */
    failure?: string | null;
}

export const recordDoxologicalGateShadow = onCall(
    { ...appCheckCallableOptions() },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const userId = request.auth.uid;
        const data: RecordShadowRequest = request.data ?? {};

        const seedId = String(data.seedId ?? '').trim();
        const sermonId = String(data.sermonId ?? '').trim();
        const flow = String(data.flow ?? '').trim() as ShadowFlow;
        if (!seedId || !FLOWS.includes(flow)) {
            throw new HttpsError('invalid-argument', 'seedId y flow válido son requeridos.');
        }

        // Un fallo de testigos (fail-open) se registra SIN veredicto. Una
        // corrida normal exige status + escalation válidos del motor.
        const failure =
            data.failure != null && String(data.failure).trim()
                ? String(data.failure).trim().slice(0, 2000)
                : null;

        const status = STATUSES.includes(data.status as GateStatus)
            ? (data.status as GateStatus)
            : null;
        const escalation = BANDS.includes(data.escalation as EscalationBand)
            ? (data.escalation as EscalationBand)
            : null;
        if (!failure && (!status || !escalation)) {
            throw new HttpsError(
                'invalid-argument',
                'status y escalation válidos son requeridos salvo en registro de fallo.',
            );
        }

        const oneShotVerdict: OneShotVerdict =
            data.oneShotVerdict === 'pass' || data.oneShotVerdict === 'block'
                ? data.oneShotVerdict
                : null;

        const latency =
            typeof data.witnessLatencyMs === 'number' && Number.isFinite(data.witnessLatencyMs)
                ? Math.max(0, Math.round(data.witnessLatencyMs))
                : null;

        const expiresAt = Timestamp.fromMillis(Date.now() + SHADOW_TTL_DAYS * 24 * 60 * 60 * 1000);

        await admin
            .firestore()
            .collection('doxologicalGateShadow')
            .add({
                userId,
                seedId,
                sermonId: sermonId || null,
                flow,
                doxologicalText: String(data.doxologicalText ?? '').slice(0, 8000),
                status,
                escalation,
                oneShotVerdict,
                witnessLatencyMs: latency,
                cacheHit: data.cacheHit === true,
                failure,
                createdAt: FieldValue.serverTimestamp(),
                expiresAt,
            });

        return { recorded: true };
    },
);
