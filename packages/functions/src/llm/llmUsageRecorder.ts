import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { estimateUsd, hasKnownPricing } from './llmCost';

/**
 * Medidor de consumo LLM del servidor.
 *
 * Antes de esto el gasto era INVISIBLE: los SDK devuelven el consumo en cada
 * respuesta (`usageMetadata` en Gemini, `usage` en Anthropic) y los adapters lo
 * tiraban a la basura. No había forma de saber que el gasto subió hasta ver la
 * factura — y con el flag `passage_profile` encendido para toda la base, cada
 * estudio dispara llamadas que antes no ocurrían.
 *
 * FORMA DEL DATO: un documento por día (`llmUsageDaily/{YYYY-MM-DD}`) con
 * contadores atómicos. Un doc por llamada sería más fino y mucho más caro de
 * leer; los cortes que importan (por feature, por usuario, por modelo) caben
 * como mapas dentro del doc del día.
 *
 * FIRE-AND-FORGET: el medidor JAMÁS puede romper la llamada que mide. Un fallo
 * de escritura se registra y se traga. Perder una medición es aceptable;
 * romperle el estudio a un pastor por un contador, no.
 */

export interface LlmUsageContext {
    /** Qué feature gastó — el callable o el uso concreto. */
    feature: string;
    /** Quién gastó. Permite distinguir "creció el uso" de "alguien está abusando". */
    userId?: string;
}

export interface LlmUsageRecord extends LlmUsageContext {
    model: string;
    inputTokens: number;
    outputTokens: number;
}

/** Clave del documento del día, en UTC (mismo huso que los jobs programados). */
export function usageDayKey(now: Date = new Date()): string {
    return now.toISOString().slice(0, 10);
}

/**
 * Clave del documento del mes. Existe para que el guardia de presupuesto y la
 * alerta lean UN documento en vez de sumar 31: se consultan en caliente (por
 * llamada / cada hora) y sumar el mes cada vez sería más caro que lo que miden.
 */
export function usageMonthKey(now: Date = new Date()): string {
    return now.toISOString().slice(0, 7);
}

/**
 * Las claves de un mapa de Firestore no pueden llevar `.` `/` `~` `*` `[` `]`.
 * Los ids de modelo y los uid son seguros, pero el nombre de feature lo escribe
 * quien llama: se sanea acá y no en cada caller.
 */
export function safeMapKey(raw: string): string {
    const cleaned = (raw ?? '').replace(/[.$/~*[\]#]/g, '_').trim();
    return cleaned.length > 0 ? cleaned.slice(0, 100) : 'unknown';
}

export async function recordLlmUsage(record: LlmUsageRecord, now: Date = new Date()): Promise<void> {
    try {
        const { model, feature, userId, inputTokens, outputTokens } = record;
        const usd = estimateUsd(model, inputTokens, outputTokens);
        const inc = FieldValue.increment;
        const f = safeMapKey(feature);
        const m = safeMapKey(model);

        const patch: Record<string, unknown> = {
            day: usageDayKey(now),
            calls: inc(1),
            inputTokens: inc(inputTokens || 0),
            outputTokens: inc(outputTokens || 0),
            usd: inc(usd),
            [`byFeature.${f}.calls`]: inc(1),
            [`byFeature.${f}.usd`]: inc(usd),
            [`byFeature.${f}.inputTokens`]: inc(inputTokens || 0),
            [`byFeature.${f}.outputTokens`]: inc(outputTokens || 0),
            [`byModel.${m}.calls`]: inc(1),
            [`byModel.${m}.usd`]: inc(usd),
            // Un modelo sin precio propio se cuenta aparte: el total lleva una
            // estimación de respaldo y hay que saber cuánto del total es eso.
            ...(hasKnownPricing(model) ? {} : { usdFromFallbackPricing: inc(usd) }),
            updatedAt: FieldValue.serverTimestamp(),
        };
        if (userId) {
            patch[`byUser.${safeMapKey(userId)}.calls`] = inc(1);
            patch[`byUser.${safeMapKey(userId)}.usd`] = inc(usd);
        }

        const db = admin.firestore();
        await Promise.all([
            db.collection('llmUsageDaily').doc(usageDayKey(now)).set(patch, { merge: true }),
            // El acumulado del mes: solo los totales, sin los cortes (esos se leen
            // del día). Es lo que consultan el guardia y la alerta.
            db.collection('llmUsageMonthly').doc(usageMonthKey(now)).set(
                {
                    month: usageMonthKey(now),
                    calls: inc(1),
                    usd: inc(usd),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
            ),
        ]);
    } catch (err) {
        console.warn('[llmUsage] no se pudo registrar el consumo (no bloqueante)', err);
    }
}
