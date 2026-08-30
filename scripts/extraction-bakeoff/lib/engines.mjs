/**
 * Engine adapters.
 *
 * Every engine returns the SAME shape so the metrics can compare them:
 *
 *   { markdown, pageCount, costUnits, costNote, elapsedMs, raw }
 *
 * `markdown` MUST use the production page contract — `<!-- page: N -->`
 * separated by `\n\n---\n\n` — because the whole point is to measure what
 * the real chunker would receive. See `pagesToMarkdown` in
 * `packages/functions/src/library/llamaParseClient.ts`.
 *
 * An engine that cannot run (missing key, missing binary) returns
 * `{ skipped: true, reason }` rather than throwing. A bake-off that dies
 * because one of five engines lacks a key is a bake-off nobody runs.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

const execFileAsync = promisify(execFile);

const PARSING_INSTRUCTION =
    'Preserva con precisión los caracteres griegos politónicos (espíritus, acentos, '
    + 'iota suscrita) y hebreos (niqqud y acentos de cantilación). Mantén la estructura '
    + 'de capítulos, secciones, tablas y notas al pie. No traduzcas ni normalices '
    + 'términos teológicos, lemas ni citas bíblicas.';

function joinPages(pages) {
    return pages
        .map(p => `<!-- page: ${p.page} -->\n${(p.content ?? '').trim()}`)
        .join('\n\n---\n\n');
}

// ── Baseline: poppler pdftotext ────────────────────────────────────────────

/**
 * Neutral reference. Not an LLM, no reconstruction, no opinions — it reports
 * the text actually embedded in the PDF.
 *
 * Two jobs in this harness:
 *   1. tells us whether the document HAS embedded text at all, which decides
 *      whether the novelty metric means anything (on a scan it does not);
 *   2. gives a floor for script fidelity — if poppler recovers polytonic
 *      Greek and a paid engine does not, that engine is destroying data that
 *      was sitting right there.
 */
export async function runPdfToText(pdfPath) {
    const started = Date.now();
    try {
        // -layout keeps columns from interleaving; -enc UTF-8 is essential or
        // the Greek and Hebrew come back mangled and we would blame the PDF.
        const { stdout } = await execFileAsync(
            'pdftotext',
            ['-layout', '-enc', 'UTF-8', pdfPath, '-'],
            { maxBuffer: 200 * 1024 * 1024 },
        );
        // pdftotext separates pages with form feed (U+000C).
        const pages = stdout.split('\f').map((content, i) => ({ page: i + 1, content }));
        while (pages.length && !pages[pages.length - 1].content.trim()) pages.pop();
        return {
            markdown: joinPages(pages),
            pageCount: pages.length,
            costUnits: 0,
            costUnit: '—',
            costNote: 'gratis (local)',
            billing: { cacheHit: false },
            elapsedMs: Date.now() - started,
        };
    } catch (err) {
        return { skipped: true, reason: `pdftotext falló: ${err.message}` };
    }
}

// ── LlamaParse ─────────────────────────────────────────────────────────────

const LLAMAPARSE_BASE = 'https://api.cloud.llamaindex.ai/api/v1/parsing';

/**
 * @param mode 'fast' | 'balanced' | 'premium'
 *
 * `fast` is what production uses today for the tier sold as Premium. It is
 * included here precisely so the report can put a number on that decision
 * instead of an argument.
 */
export async function runLlamaParse(pdfPath, { mode, apiKey, maxPollSeconds = 900, invalidateCache = false }) {
    if (!apiKey) return { skipped: true, reason: 'falta LLAMAPARSE_API_KEY' };
    const started = Date.now();

    try {
        const buffer = await fs.readFile(pdfPath);
        const form = new FormData();
        form.append('file', new Blob([buffer], { type: 'application/pdf' }), 'bakeoff.pdf');
        form.append('language', 'es');
        form.append('parsing_instruction', PARSING_INSTRUCTION);
        if (mode === 'fast') form.append('fast_mode', 'true');
        else if (mode === 'premium') form.append('premium_mode', 'true');
        // 'balanced' = neither flag: the default LLM-based parse.
        // LlamaParse cachea por hash de archivo. Re-medir el mismo recorte
        // devuelve el resultado guardado y factura 0 créditos, lo que hace
        // que una comparación de costos mienta sin avisar. Con esto se fuerza
        // trabajo real; `job_is_cache_hit` en la respuesta confirma si surtió
        // efecto, así que la instrumentación se verifica a sí misma.
        if (invalidateCache) form.append('invalidate_cache', 'true');

        const upRes = await fetch(`${LLAMAPARSE_BASE}/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
            body: form,
        });
        if (!upRes.ok) {
            return { skipped: true, reason: `upload ${upRes.status}: ${(await upRes.text()).slice(0, 200)}` };
        }
        const { id: jobId } = await upRes.json();

        const deadline = Date.now() + maxPollSeconds * 1000;
        let status = 'PENDING';
        while (Date.now() < deadline) {
            await sleep(3000);
            const st = await fetch(`${LLAMAPARSE_BASE}/job/${jobId}`, {
                headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
            });
            if (!st.ok) continue;
            const body = await st.json();
            status = body.status;
            if (status === 'SUCCESS') break;
            if (status === 'ERROR' || status === 'CANCELED') {
                return { skipped: true, reason: `job ${status}: ${body.error ?? ''}` };
            }
        }
        if (status !== 'SUCCESS') return { skipped: true, reason: `timeout tras ${maxPollSeconds}s` };

        const resRes = await fetch(`${LLAMAPARSE_BASE}/job/${jobId}/result/json`, {
            headers: { Authorization: `Bearer ${apiKey}`, accept: 'application/json' },
        });
        if (!resRes.ok) {
            return { skipped: true, reason: `result ${resRes.status}` };
        }
        const result = await resRes.json();
        const rawPages = result.pages ?? [];
        const pages = rawPages.map(p => ({
            page: p.page,
            // Same `||` fallback as production: fast mode can return md = ''.
            content: (p.md && p.md.trim()) || (p.text && p.text.trim()) || '',
        }));

        // Metadata de facturación COMPLETA. Antes sólo se guardaba el número
        // de créditos, y una lectura de 0 no se podía distinguir de un cache
        // hit — se reportó 0 como si fuera el costo real. Guardar la bandera
        // hace que el informe pueda decir "0 porque vino de caché" en vez de
        // "0 porque es gratis".
        const meta = result.job_metadata ?? {};
        return {
            markdown: joinPages(pages),
            pageCount: pages.length,
            costUnits: meta.job_credits_usage ?? null,
            costUnit: 'créditos',
            costNote: 'créditos LlamaParse (reportados por la API)',
            billing: {
                credits: meta.job_credits_usage ?? null,
                pagesBilled: meta.job_pages ?? null,
                cacheHit: meta.job_is_cache_hit ?? null,
                creditsUsedAccount: meta.credits_used ?? null,
            },
            elapsedMs: Date.now() - started,
        };
    } catch (err) {
        return { skipped: true, reason: `excepción: ${err.message}` };
    }
}

// ── Mistral OCR ────────────────────────────────────────────────────────────

/**
 * ⚠️ ADAPTADOR NO EJECUTADO. Escrito contra la forma documentada de la API
 * pero nunca corrido contra el servicio real — no había clave disponible al
 * construir el banco. Si la respuesta no trae `pages`, este adaptador
 * imprime las claves de nivel superior que SÍ vinieron, para que ajustar el
 * mapeo tome un minuto en vez de una tarde de adivinanzas.
 *
 * Mistral OCR devuelve markdown por página de forma nativa, que encaja
 * mejor con nuestro contrato `<!-- page: N -->` que el array de páginas de
 * LlamaParse. `index` viene basado en 0; lo pasamos a 1 para que las páginas
 * coincidan con las del PDF y con las citas.
 */
export async function runMistralOcr(pdfPath, { apiKey, model = 'mistral-ocr-latest' }) {
    if (!apiKey) return { skipped: true, reason: 'falta MISTRAL_API_KEY' };
    const started = Date.now();

    try {
        const buffer = await fs.readFile(pdfPath);
        const dataUri = `data:application/pdf;base64,${buffer.toString('base64')}`;

        const res = await fetch('https://api.mistral.ai/v1/ocr', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                document: { type: 'document_url', document_url: dataUri },
                include_image_base64: false,
            }),
        });

        if (!res.ok) {
            return { skipped: true, reason: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
        }

        const body = await res.json();
        if (!Array.isArray(body.pages)) {
            return {
                skipped: true,
                reason: `respuesta sin campo "pages". Claves recibidas: ${Object.keys(body).join(', ')}. `
                    + 'Ajusta el mapeo en runMistralOcr().',
            };
        }

        const pages = body.pages.map((p, i) => ({
            page: typeof p.index === 'number' ? p.index + 1 : i + 1,
            content: p.markdown ?? p.text ?? '',
        }));

        const pagesProcessed = body.usage_info?.pages_processed ?? pages.length;
        return {
            markdown: joinPages(pages),
            pageCount: pages.length,
            costUnits: pagesProcessed,
            costUnit: 'páginas',
            costNote: 'páginas procesadas',
            billing: { pagesBilled: pagesProcessed, cacheHit: false },
            elapsedMs: Date.now() - started,
        };
    } catch (err) {
        return { skipped: true, reason: `excepción: ${err.message}` };
    }
}

// ── Gemini ─────────────────────────────────────────────────────────────────

/**
 * The current Standard tier. Included so the report answers a question the
 * founder will ask immediately: is the cheap tier already good enough for
 * Greek, making the premium tier's price hard to justify?
 *
 * El id del modelo se retira cada tanto y la API responde 404 con el nombre
 * del reemplazo. `BAKEOFF_GEMINI_MODEL` permite fijarlo sin editar código
 * cuando eso vuelva a pasar; el mensaje de error del 404 dice cuál poner.
 *
 * Asks for the same page-marker contract in the prompt. An LLM asked to
 * transcribe will sometimes renumber or merge pages — the page-integrity
 * metric is what catches that, and it is the reason that metric exists.
 */
export async function runGemini(pdfPath, {
    apiKey,
    model = process.env.BAKEOFF_GEMINI_MODEL || 'gemini-3.6-flash',
    // Número de la primera página del recorte DENTRO del documento completo.
    // En un fan-out cada worker ve sólo su trozo y numeraría desde 1, así que
    // al coser todas las páginas se llamarían igual. Decirle el desplazamiento
    // es lo que hace que los números sean globales — y si obedece, es lo que
    // hace viable trocear. Medido antes: sin esto, Gemini numeró 615-625
    // leyendo los números IMPRESOS del libro, que es otra convención más y no
    // sirve en un libro sin foliar.
    pageOffset = null,
} = {}) {
    if (!apiKey) return { skipped: true, reason: 'falta GEMINI_API_KEY' };
    const started = Date.now();

    try {
        const buffer = await fs.readFile(pdfPath);
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            {
                                text: `Transcribe este PDF a Markdown, íntegro y sin resumir.\n\n`
                                    + `REGLAS ESTRICTAS:\n`
                                    + (pageOffset
                                        ? `1. Antes de cada página emite exactamente: <!-- page: N -->\n`
                                          + `   Este archivo es un FRAGMENTO de un documento mayor: su primera\n`
                                          + `   página es la número ${pageOffset} del documento completo. Numera\n`
                                          + `   desde ${pageOffset} en adelante, consecutivamente, IGNORANDO\n`
                                          + `   cualquier número impreso en la página.\n`
                                        : `1. Antes de cada página emite exactamente: <!-- page: N -->\n`
                                          + `   donde N es la posición de la página en este archivo, empezando en 1.\n`
                                          + `   IGNORA cualquier número impreso en la página.\n`)
                                    + `2. ${PARSING_INSTRUCTION}\n`
                                    + `3. No agregues comentarios, encabezados ni notas propias.\n`
                                    + `4. Si una página está en blanco, emite igualmente su marcador.`,
                            },
                            { inline_data: { mime_type: 'application/pdf', data: buffer.toString('base64') } },
                        ],
                    }],
                    generationConfig: { temperature: 0, maxOutputTokens: 65536 },
                }),
            },
        );

        if (!res.ok) {
            return { skipped: true, reason: `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}` };
        }

        const body = await res.json();
        const markdown = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
        if (!markdown.trim()) {
            const finish = body.candidates?.[0]?.finishReason ?? 'desconocido';
            return { skipped: true, reason: `respuesta vacía (finishReason=${finish})` };
        }

        const usage = body.usageMetadata ?? {};
        return {
            markdown,
            pageCount: new Set([...markdown.matchAll(/<!--\s*page:\s*(\d+)\s*-->/g)].map(m => m[1])).size,
            costUnits: usage.totalTokenCount ?? null,
            costUnit: 'tokens',
            costNote: 'tokens totales',
            // Entrada y salida se tarifan distinto —la salida cuesta bastante
            // más—, así que sumarlas y multiplicar por una sola tarifa da un
            // número equivocado. Se guardan separadas.
            billing: {
                inputTokens: usage.promptTokenCount ?? null,
                outputTokens: usage.candidatesTokenCount ?? null,
                totalTokens: usage.totalTokenCount ?? null,
                cacheHit: false,
            },
            elapsedMs: Date.now() - started,
            truncated: body.candidates?.[0]?.finishReason === 'MAX_TOKENS',
        };
    } catch (err) {
        return { skipped: true, reason: `excepción: ${err.message}` };
    }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Registry consumed by run.mjs. Order here is the order in the report. */
export const ENGINES = [
    { id: 'pdftotext', label: 'pdftotext (referencia)', run: (p, env) => runPdfToText(p, env) },
    { id: 'llamaparse-fast', label: 'LlamaParse fast (PRODUCCIÓN HOY)', run: (p, env, o) => runLlamaParse(p, { mode: 'fast', apiKey: env.LLAMAPARSE_API_KEY, invalidateCache: o?.invalidateCache }) },
    { id: 'llamaparse-balanced', label: 'LlamaParse balanced', run: (p, env, o) => runLlamaParse(p, { mode: 'balanced', apiKey: env.LLAMAPARSE_API_KEY, invalidateCache: o?.invalidateCache }) },
    { id: 'llamaparse-premium', label: 'LlamaParse premium', run: (p, env, o) => runLlamaParse(p, { mode: 'premium', apiKey: env.LLAMAPARSE_API_KEY, invalidateCache: o?.invalidateCache }) },
    { id: 'mistral-ocr', label: 'Mistral OCR', run: (p, env) => runMistralOcr(p, { apiKey: env.MISTRAL_API_KEY }) },
    { id: 'gemini', label: 'Gemini Flash (tier Estándar)', run: (p, env) => runGemini(p, { apiKey: env.GEMINI_API_KEY }) },
];
