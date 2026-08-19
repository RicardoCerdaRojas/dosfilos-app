import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import { resend } from '../emails/resendClient';
import { readBudgetConfig, readMonthUsd } from './llmBudget';
import { usageMonthKey } from './llmUsageRecorder';

/**
 * Alerta de presupuesto LLM.
 *
 * Corre CADA HORA, no una vez al día: con un presupuesto de decenas de dólares,
 * una fuga puede consumirlo entero en una tarde, y una alerta diaria llegaría
 * cuando ya no queda nada que decidir.
 *
 * IDEMPOTENTE POR UMBRAL Y POR MES: el aviso de cada umbral se marca en el propio
 * documento del mes (`alertsSent`), así que cruzar el 50% manda UN correo, no uno
 * por hora hasta fin de mes. Un mes nuevo empieza con la pizarra limpia.
 *
 * NO BLOQUEA NADA. Solo avisa. Quien frena el gasto es el guardia de sombra
 * (`llmBudget.shadowLlmAllowed`) y, por encima de todo, el presupuesto de la nube.
 */

const SENDER = 'Preach <onboarding@dosfilos.com>';

export const checkLlmBudget = onSchedule(
    { schedule: 'every 60 minutes', secrets: ['RESEND_API_KEY'] },
    async () => {
        const db = admin.firestore();
        const now = new Date();
        const monthKey = usageMonthKey(now);

        const [cfg, monthUsd] = await Promise.all([readBudgetConfig(), readMonthUsd(now)]);
        if (cfg.monthlyUsd <= 0) return;

        const pct = (monthUsd / cfg.monthlyUsd) * 100;
        const monthRef = db.collection('llmUsageMonthly').doc(monthKey);
        const sent = ((await monthRef.get()).data()?.alertsSent ?? {}) as Record<string, boolean>;

        // El umbral MÁS ALTO ya cruzado y aún no avisado. Si el gasto salta de 0 a
        // 120% entre dos corridas, se manda un solo correo (el del 100%), no tres.
        const pendiente = [...cfg.alertPcts]
            .sort((a, b) => a - b)
            .filter((p) => pct >= p && !sent[String(p)])
            .pop();
        if (pendiente === undefined) return;

        const admins = await db.collection('users').where('role', '==', 'super_admin').get();
        const destinatarios = admins.docs.map((d) => d.data()?.email).filter(Boolean) as string[];
        if (destinatarios.length === 0) {
            console.warn('[checkLlmBudget] no hay super_admin con email; no se envía aviso');
            return;
        }

        const asunto = pct >= 100
            ? `⚠️ Presupuesto de modelos excedido: $${monthUsd.toFixed(2)} de $${cfg.monthlyUsd}`
            : `Consumo de modelos al ${Math.round(pct)}%: $${monthUsd.toFixed(2)} de $${cfg.monthlyUsd}`;

        try {
            await resend.emails.send({
                from: SENDER,
                to: destinatarios,
                subject: asunto,
                html: buildHtml({ monthKey, monthUsd, budget: cfg.monthlyUsd, pct, cap: cfg.shadowDailyUsdCap }),
            });
            await monthRef.set(
                { alertsSent: { ...sent, [String(pendiente)]: true }, month: monthKey },
                { merge: true },
            );
            console.log(`[checkLlmBudget] aviso ${pendiente}% enviado a ${destinatarios.length} admin(s)`);
        } catch (err) {
            // No se marca como enviado: la próxima corrida reintenta.
            console.error('[checkLlmBudget] no se pudo enviar el aviso', err);
        }
    },
);

function buildHtml(a: {
    monthKey: string;
    monthUsd: number;
    budget: number;
    pct: number;
    cap: number;
}): string {
    const excedido = a.pct >= 100;
    return `
    <div style="font-family:system-ui,sans-serif;max-width:520px;line-height:1.5">
      <h2 style="margin:0 0 4px">Consumo de modelos — ${a.monthKey}</h2>
      <p style="font-size:28px;margin:8px 0"><strong>$${a.monthUsd.toFixed(2)}</strong>
        <span style="font-size:15px;color:#666">de $${a.budget} (${Math.round(a.pct)}%)</span></p>
      ${excedido
        ? `<p><strong>El presupuesto del mes está excedido.</strong> El gasto no se detiene solo:
             lo único que frena automáticamente es la sombra, cuando el día supera
             $${a.cap}. El resto sigue corriendo.</p>`
        : `<p>Aviso temprano para que decidas con margen, no cuando ya no queda ninguno.</p>`}
      <p style="color:#666;font-size:13px">Este número cubre solo las llamadas que pasan por el
        servidor. Las que salen del navegador con la clave del cliente no están incluidas:
        el gasto real es mayor.</p>
      <p><a href="https://app.preach.dosfilos.com/dashboard/admin/llm-cost">Ver el desglose por feature y usuario</a></p>
    </div>`;
}
