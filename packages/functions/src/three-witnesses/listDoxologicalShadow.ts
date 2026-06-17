import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { appCheckCallableOptions } from '../config/appCheckOptions';

/**
 * Lectura super_admin de la telemetría de sombra del gate doxológico para la
 * vista de monitoreo del admin. Callable FINO: devuelve las filas crudas
 * (serializadas), la AGREGACIÓN (reloj + cortes) corre client-side en una
 * función pura testeable. Read-only, no muta nada.
 *
 * Gateado a super_admin server-side (no confiamos en el cliente). Tope de filas
 * generoso para la escala de sombra (decenas-cientos en semanas); si el volumen
 * creciera, paginar.
 */

const MAX_ROWS = 5000;

export const listDoxologicalShadow = onCall({ ...appCheckCallableOptions() }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Super admin only');
    }

    const snap = await admin
        .firestore()
        .collection('doxologicalGateShadow')
        .orderBy('createdAt', 'asc')
        .limit(MAX_ROWS)
        .get();

    const rows = snap.docs.map((d) => {
        const x = d.data();
        const createdAt = x.createdAt;
        return {
            id: d.id,
            flow: x.flow ?? null,
            status: x.status ?? null,
            escalation: x.escalation ?? null,
            oneShotVerdict: x.oneShotVerdict ?? null,
            witnessLatencyMs: typeof x.witnessLatencyMs === 'number' ? x.witnessLatencyMs : null,
            cacheHit: x.cacheHit === true,
            failure: x.failure ?? null,
            failureCause: x.failureCause ?? null,
            segment: x.segment ?? null,
            seedId: x.seedId ?? null,
            sermonId: x.sermonId ?? null,
            userId: x.userId ?? null,
            doxologicalText: x.doxologicalText ?? '',
            // Serializar el Timestamp a millis para el cliente.
            createdAtMs:
                createdAt && typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : null,
        };
    });

    return { rows, truncated: snap.size >= MAX_ROWS };
});
