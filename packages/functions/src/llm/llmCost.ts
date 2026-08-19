/**
 * Tabla de precios y estimación de costo por llamada LLM.
 *
 * Es DATO EDITABLE, no lógica: cuando cambian los precios de lista se edita esta
 * tabla y nada más. Vive en `functions` porque es ahí donde corre el medidor
 * (`packages/functions` no puede importar `@dosfilos/domain` sin reventar el
 * build con ~180 TS6059).
 *
 * Precios en USD por 1M de tokens, según lista pública de cada proveedor. La
 * estimación es eso — una ESTIMACIÓN: no reemplaza la factura, sirve para ver
 * tendencias y para que una fuga se note el mismo día en vez de a fin de mes.
 */

export interface ModelPricing {
    /** USD por 1M tokens de entrada. */
    inputPer1M: number;
    /** USD por 1M tokens de salida. */
    outputPer1M: number;
}

export const LLM_PRICING: Record<string, ModelPricing> = {
    'gemini-2.5-flash': { inputPer1M: 0.3, outputPer1M: 2.5 },
    'gemini-2.5-pro': { inputPer1M: 1.25, outputPer1M: 10 },
    'gemini-2.0-flash': { inputPer1M: 0.1, outputPer1M: 0.4 },
    'claude-sonnet-4-6': { inputPer1M: 3, outputPer1M: 15 },
    'claude-haiku-4-5': { inputPer1M: 1, outputPer1M: 5 },
};

/**
 * Precio de respaldo para un modelo que no está en la tabla. Se elige el de un
 * modelo CARO a propósito: si aparece un modelo nuevo sin precio, preferimos
 * sobreestimar y que alguien lo note, antes que subestimar en silencio.
 */
export const FALLBACK_PRICING: ModelPricing = { inputPer1M: 3, outputPer1M: 15 };

export function pricingFor(model: string): ModelPricing {
    return LLM_PRICING[model] ?? FALLBACK_PRICING;
}

/** ¿El modelo tiene precio propio, o se está usando el respaldo? */
export function hasKnownPricing(model: string): boolean {
    return model in LLM_PRICING;
}

/** Costo estimado en USD de una llamada. Nunca negativo; tokens inválidos → 0. */
export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number {
    const p = pricingFor(model);
    const inTok = Number.isFinite(inputTokens) && inputTokens > 0 ? inputTokens : 0;
    const outTok = Number.isFinite(outputTokens) && outputTokens > 0 ? outputTokens : 0;
    return (inTok / 1_000_000) * p.inputPer1M + (outTok / 1_000_000) * p.outputPer1M;
}
