import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { usageDayKey } from './llmUsageRecorder';
import { readBudgetConfig, shadowExhausted } from './llmBudget';

/**
 * Lectura super_admin del consumo LLM del servidor para el panel de costos.
 *
 * Callable FINO: devuelve los documentos diarios crudos; la agregación (mes en
 * curso, % del presupuesto, ranking por feature/usuario) corre client-side en
 * funciones puras testeables — mismo patrón que `listDoxologicalShadow`.
 *
 * El presupuesto vive en `config/llmBudget` como DATO EDITABLE: cambiarlo no
 * requiere deploy. Si el doc no existe se usa el default y se dice cuál es.
 */

const DEFAULT_MONTHLY_BUDGET_USD = 25;
const MAX_DAYS = 90;

export const getLlmUsageSummary = onCall({ ...appCheckCallableOptions() }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    const db = admin.firestore();
    const callerDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Super admin only');
    }

    const days = Math.min(Number((request.data as { days?: number })?.days ?? 30) || 30, MAX_DAYS);
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const snap = await db
        .collection('llmUsageDaily')
        .where(admin.firestore.FieldPath.documentId(), '>=', usageDayKey(since))
        .orderBy(admin.firestore.FieldPath.documentId(), 'asc')
        .limit(MAX_DAYS)
        .get();

    const budgetDoc = await db.collection('config').doc('llmBudget').get();
    const monthlyBudgetUsd = Number(budgetDoc.data()?.monthlyUsd ?? DEFAULT_MONTHLY_BUDGET_USD);
    // Estado del cortacircuito: una sombra en pausa NO puede ser invisible, o el
    // día que falten datos nadie sabrá que fue por presupuesto y no por un bug.
    const cfg = await readBudgetConfig();
    const todayDoc = await db.collection('llmUsageDaily').doc(usageDayKey()).get();
    const todayUsd = Number(todayDoc.data()?.usd ?? 0);
    const shadow = {
        dailyCapUsd: cfg.shadowDailyUsdCap,
        todayUsd,
        paused: shadowExhausted(todayUsd, cfg.shadowDailyUsdCap),
    };

    // Resolver uid → email para que el panel muestre personas, no identificadores.
    const uids = new Set<string>();
    snap.docs.forEach((d) => Object.keys(d.data()?.byUser ?? {}).forEach((u) => uids.add(u)));
    const emails: Record<string, string> = {};
    await Promise.all(
        [...uids].slice(0, 50).map(async (uid) => {
            const u = await db.collection('users').doc(uid).get();
            emails[uid] = (u.data()?.email as string) ?? uid;
        }),
    );

    return {
        monthlyBudgetUsd,
        budgetIsDefault: !budgetDoc.exists,
        shadow,
        emails,
        days: snap.docs.map((d) => {
            const x = d.data() ?? {};
            return {
                day: d.id,
                usd: Number(x.usd ?? 0),
                calls: Number(x.calls ?? 0),
                inputTokens: Number(x.inputTokens ?? 0),
                outputTokens: Number(x.outputTokens ?? 0),
                usdFromFallbackPricing: Number(x.usdFromFallbackPricing ?? 0),
                byFeature: x.byFeature ?? {},
                byUser: x.byUser ?? {},
                byModel: x.byModel ?? {},
            };
        }),
    };
});
