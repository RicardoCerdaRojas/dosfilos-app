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

/**
 * Segmento de la cuenta, derivado SERVER-SIDE (no client-passed) para que sea
 * confiable. A 12 usuarios usamos allowlist de uids en vez de un campo en el
 * doc del usuario (sobre-ingeniería a esta escala — migrar a campo real cuando
 * crezca a cientos). Segmentar el DATO permite leer el delta oneShotVerdict solo
 * sobre `real` (el input de superadmin/embajador no representa la población).
 *
 * Precedencia: super_admin (role) → ambassador (allowlist) → team (allowlist) → real.
 */
type AccountSegment = 'super_admin' | 'ambassador' | 'team' | 'real';

// TODO(fundador): poblar con los uids reales antes de encender la sombra.
const AMBASSADOR_UIDS: ReadonlySet<string> = new Set<string>([
    // '<uid embajador 1>', '<uid embajador 2>', '<uid embajador 3>',
]);
const TEAM_UIDS: ReadonlySet<string> = new Set<string>([
    // '<uid equipo>',
]);

async function deriveSegment(uid: string): Promise<AccountSegment> {
    try {
        const snap = await admin.firestore().collection('users').doc(uid).get();
        if (snap.exists && snap.data()?.role === 'super_admin') return 'super_admin';
    } catch {
        // Si la lectura falla, caemos a la clasificación por allowlist / real.
    }
    if (AMBASSADOR_UIDS.has(uid)) return 'ambassador';
    if (TEAM_UIDS.has(uid)) return 'team';
    return 'real';
}

type GateStatus = 'pass' | 'soft' | 'hard';
type EscalationBand = 'pass' | 'note' | 'soft-block' | 'hard-block' | 'absolute-block';
type ShadowFlow = 'wizard' | 'guided-insight' | 'guided-socratic' | 'guided-wordstudies';
type OneShotVerdict = 'pass' | 'block' | null;
/** Causa del fallo del gate (fail-open en sombra). Informa si fail-closed es
 * vivible en enforce o si hay una falla concreta del callable que arreglar. */
type FailureCause = 'timeout' | 'error-callable' | 'app-check' | 'otro';

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
    /** Causa clasificada del fallo (enum, no boolean). */
    failureCause?: string | null;
}

const FAILURE_CAUSES: ReadonlyArray<FailureCause> = [
    'timeout',
    'error-callable',
    'app-check',
    'otro',
];

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
        const failureCause: FailureCause | null = failure
            ? FAILURE_CAUSES.includes(data.failureCause as FailureCause)
                ? (data.failureCause as FailureCause)
                : 'otro'
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
        const segment = await deriveSegment(userId);

        await admin
            .firestore()
            .collection('doxologicalGateShadow')
            .add({
                userId,
                segment,
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
                failureCause,
                createdAt: FieldValue.serverTimestamp(),
                expiresAt,
            });

        return { recorded: true };
    },
);
