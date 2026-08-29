/**
 * Converting billable units into money — and refusing to when it cannot be
 * done honestly.
 *
 * The first cost table this harness produced showed `0` for all three
 * LlamaParse modes. That number was read from the right field, so it was not
 * a bug; it was simply uninterpretable. Nobody could tell whether the modes
 * are free, whether the API omits the figure, or whether the job came back
 * from cache. It was reported as a cost anyway, and a reader would have
 * concluded that premium costs nothing.
 *
 * The rules here exist so that cannot happen again:
 *
 *   1. Rates are never hardcoded. They come from `rates.json`, which the
 *      operator fills from their own invoice. A price recalled from memory
 *      produces a comparison that looks rigorous and is not.
 *   2. A missing rate yields `null`, never a guess, and the report says
 *      NO CALCULABLE.
 *   3. A cached job is money that was not spent this run. It is labelled, so
 *      a cheap-looking engine cannot be cheap merely because we measured it
 *      twice.
 */

import fs from 'node:fs';
import path from 'node:path';

export function loadRates(dir) {
    const file = path.join(dir, 'rates.json');
    if (!fs.existsSync(file)) return { present: false, rates: null, path: file };
    try {
        return { present: true, rates: JSON.parse(fs.readFileSync(file, 'utf8')), path: file };
    } catch (err) {
        return { present: false, rates: null, path: file, error: err.message };
    }
}

/**
 * Money for one engine run.
 *
 * Returns `{ usd, basis, caveat }`, where `usd` is null whenever the figure
 * would be invented. `basis` states the arithmetic so a reader can check it
 * without trusting this function.
 */
export function computeCost(result, rates) {
    const b = result.billing ?? {};

    if (b.cacheHit === true) {
        return {
            usd: 0,
            basis: 'trabajo servido desde caché',
            caveat: 'NO es el costo real: se facturó 0 por reusar un trabajo previo. '
                + 'Vuelve a medir con --fresh para forzar trabajo nuevo.',
        };
    }

    if (result.id === 'pdftotext') return { usd: 0, basis: 'local, sin servicio externo', caveat: null };

    if (result.id?.startsWith('llamaparse')) {
        // El contador de la CUENTA es la fuente fiable, no el del trabajo.
        // Medido: `job_credits_usage` devolvió 0 en las tres modalidades
        // mientras el panel mostraba 1.670 créditos consumidos. El campo por
        // trabajo no refleja el gasto; el delta del contador de cuenta entre
        // dos trabajos consecutivos sí, porque es el mismo número que factura.
        const credits = b.creditsDelta ?? null;
        const rate = rates?.llamaparse?.usdPorCredito;

        if (credits === null) {
            return {
                usd: null,
                basis: b.credits === 0 ? 'la API reportó 0 en job_credits_usage' : null,
                caveat: 'sin delta del contador de cuenta. `job_credits_usage` no es fiable: '
                    + 'devolvió 0 mientras el panel sí acumulaba consumo. Corre con --fresh y '
                    + 'al menos dos motores de LlamaParse para obtener deltas.',
            };
        }
        if (rate == null) {
            return { usd: null, basis: `${credits} créditos (delta de cuenta)`, caveat: 'falta usdPorCredito en rates.json' };
        }
        return {
            usd: credits * rate,
            basis: `${credits} créditos (delta de cuenta) × ${rate} USD`,
            caveat: credits === 0 ? 'delta cero: puede ser caché o granularidad del contador' : null,
        };
    }

    if (result.id === 'mistral-ocr') {
        const pages = b.pagesBilled;
        const rate = rates?.mistral?.usdPorPagina;
        if (pages == null) return { usd: null, basis: null, caveat: 'la API no reportó páginas' };
        if (rate == null) return { usd: null, basis: `${pages} páginas`, caveat: 'falta usdPorPagina en rates.json' };
        return { usd: pages * rate, basis: `${pages} páginas × ${rate} USD`, caveat: null };
    }

    if (result.id === 'gemini') {
        const { inputTokens: i, outputTokens: o } = b;
        const ri = rates?.gemini?.usdPorMillonTokensEntrada;
        const ro = rates?.gemini?.usdPorMillonTokensSalida;
        if (i == null || o == null) return { usd: null, basis: null, caveat: 'la API no desglosó entrada/salida' };
        if (ri == null || ro == null) {
            return { usd: null, basis: `${i} entrada + ${o} salida`, caveat: 'faltan tarifas de Gemini en rates.json' };
        }
        const usd = (i / 1e6) * ri + (o / 1e6) * ro;
        return { usd, basis: `${i} entrada × ${ri}/M + ${o} salida × ${ro}/M`, caveat: null };
    }

    return { usd: null, basis: null, caveat: 'motor sin modelo de costo' };
}

/**
 * Extrapolates a slice's cost to a whole book.
 *
 * Stated separately from the measured figure, and always with the page counts
 * visible, because it is the number a decision gets made on and it is the
 * easiest one to quote without its assumptions. Linear in pages — which holds
 * for per-page billing and roughly for tokens, and is worth distrusting for
 * anything with a fixed overhead.
 */
export function extrapolate(usd, slicePages, bookPages) {
    if (usd == null || !slicePages || !bookPages) return null;
    return { usd: (usd / slicePages) * bookPages, basis: `${usd.toFixed(4)} USD / ${slicePages} págs × ${bookPages} págs` };
}
