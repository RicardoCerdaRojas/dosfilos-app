#!/usr/bin/env node
/**
 * scripts/extraction-bakeoff/spike-fanout.mjs
 *
 * Prueba de que el fan-out FUNCIONA, antes de diseñarlo.
 *
 * Un libro de 425 páginas por Gemini tarda ~115 minutos en serie, contra un
 * timeout de función de 540 segundos. La salida es trocear el PDF, procesar
 * los trozos en paralelo y coserlos. Eso descansa en cuatro supuestos que
 * ningún diagrama valida:
 *
 *   1. Gemini aguanta N llamadas concurrentes sin rate-limit.
 *   2. Coser los trozos reproduce el documento entero, sin perder los bordes.
 *   3. La numeración de página queda global y consecutiva al coser.
 *   4. Existe un tamaño de trozo que no choca con el tope de salida.
 *
 * Este script los ataca a los cuatro y devuelve evidencia. Si alguno falla,
 * el diseño cambia ANTES de escribirse, no después de implementarse.
 *
 * USO
 *   node scripts/extraction-bakeoff/spike-fanout.mjs \
 *     --resource a4f8034b-... --pages 130-169 --chunk 10 --concurrency 4 --baseline
 *
 * OPCIONES
 *   --resource <id> | --file <ruta>
 *   --pages A-B       Rango COMPLETO a procesar (por defecto 1-40)
 *   --chunk N         Páginas por trozo (por defecto 10)
 *   --concurrency N   Trozos en vuelo a la vez (por defecto 4)
 *   --baseline        Además, una sola llamada sobre TODO el rango, para
 *                     comparar lo cosido contra lo íntegro. Cuesta el doble.
 *   --out <dir>
 *
 * COSTO. Procesa el rango una vez (o dos con --baseline). A las tarifas
 * medidas, 40 páginas por Gemini rondan un dólar. Empieza chico.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { runGemini, countEmittedPages } from './lib/engines.mjs';
import { fetchResourcePdf, pdfPageCount, slicePdf } from './lib/pdf.mjs';
import { scriptFidelity, pageIntegrity } from './lib/metrics.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
    const o = { pages: '1-40', chunk: 10, concurrency: 4 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i]; const next = () => argv[++i];
        if (a === '--resource') o.resource = next();
        else if (a === '--file') o.file = next();
        else if (a === '--pages') o.pages = next();
        else if (a === '--chunk') o.chunk = Number(next());
        else if (a === '--concurrency') o.concurrency = Number(next());
        else if (a === '--baseline') o.baseline = true;
        else if (a === '--out') o.out = next();
    }
    return o;
}
const args = parseArgs(process.argv.slice(2));

if (!process.env.GEMINI_API_KEY) {
    console.error('Falta GEMINI_API_KEY.');
    process.exit(1);
}
if (!args.resource && !args.file) {
    console.error('Falta --resource <id> o --file <ruta>.');
    process.exit(1);
}

const [from, to] = args.pages.split('-').map(Number);
const outDir = args.out ? path.resolve(args.out)
    : path.join(repoRoot, 'bakeoff-out', `fanout-${new Date().toISOString().replace(/[:.]/g, '-')}`);
await fs.mkdir(outDir, { recursive: true });
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'fanout-'));

// ── Documento ──────────────────────────────────────────────────────────────

let sourcePath; let title;
if (args.resource) {
    const admin = (await import('firebase-admin')).default;
    const { config } = await import('dotenv');
    config({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });
    const pid = process.env.VITE_FIREBASE_PROJECT_ID;
    if (!admin.apps.length) {
        admin.initializeApp({ projectId: pid, storageBucket: `${pid}.firebasestorage.app`, serviceAccountId: `${pid}@appspot.gserviceaccount.com` });
    }
    console.log(`↓ Descargando ${args.resource}…`);
    const f = await fetchResourcePdf(admin, args.resource, tmp);
    sourcePath = f.path; title = f.title;
} else {
    sourcePath = path.resolve(args.file); title = path.basename(sourcePath);
}
const totalPages = await pdfPageCount(sourcePath);
console.log(`  ${title} (${totalPages} págs)`);

// ── Trozos ─────────────────────────────────────────────────────────────────

const chunks = [];
for (let p = from; p <= to; p += args.chunk) {
    chunks.push({ from: p, to: Math.min(to, p + args.chunk - 1) });
}
console.log(`✂  rango ${from}–${to} → ${chunks.length} trozos de ${args.chunk} págs`);
console.log(`   concurrencia ${args.concurrency}\n`);

for (const c of chunks) {
    c.path = path.join(tmp, `c-${c.from}-${c.to}.pdf`);
    await slicePdf(sourcePath, c.path, c.from, c.to);
}

// ── Fan-out ────────────────────────────────────────────────────────────────

/**
 * Ejecuta con concurrencia acotada. Sin esto, 39 trozos salen todos a la vez
 * y lo que se mediría sería el rate-limit, no el diseño.
 */
async function pool(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        for (;;) {
            const i = next++;
            if (i >= items.length) return;
            out[i] = await fn(items[i], i);
        }
    });
    await Promise.all(workers);
    return out;
}

const MAX_RETRIES = Number(process.env.SPIKE_RETRIES ?? 3);

const wallStart = Date.now();
const results = await pool(chunks, args.concurrency, async (c, i) => {
    const t0 = Date.now();
    let r; let attempts = 0;
    // Reintento con backoff. Sin esto el spike mide la disponibilidad del
    // servicio en ese minuto, no la viabilidad del diseño: a concurrencia 4,
    // 2 de 4 trozos murieron con 503 "high demand", que el propio servicio
    // declara temporal.
    for (;;) {
        attempts++;
        r = await runGemini(c.path, {
            apiKey: process.env.GEMINI_API_KEY,
            // El desplazamiento es lo que decide si trocear es viable: cada
            // worker ve sólo su trozo, y sin esto todos numerarían desde 1.
            pageOffset: c.from,
        });
        // VERIFICACIÓN DE COBERTURA. Un trozo que devuelve menos páginas de
        // las pedidas es un trozo FALLIDO, aunque el proveedor lo dé por
        // exitoso. Sin esto el fan-out cose libros con agujeros y nada avisa.
        if (!r.skipped) {
            const want = c.to - c.from + 1;
            const got = countEmittedPages(r.markdown);
            if (got < want) {
                r = { skipped: true, retryable: true, shortOutput: { want, got },
                      reason: `cobertura incompleta: pidió ${want} páginas, devolvió ${got} (el proveedor la dio por exitosa)` };
            }
        }
        if (!r.skipped || !r.retryable || attempts > MAX_RETRIES) break;
        const waitMs = Math.min(30000, 2000 * 2 ** (attempts - 1));
        console.log(`  trozo ${String(i + 1).padStart(2)}/${chunks.length} reintento ${attempts}/${MAX_RETRIES} en ${waitMs / 1000}s — ${String(r.reason).slice(0, 60)}`);
        await new Promise(res => setTimeout(res, waitMs));
    }
    const elapsed = Date.now() - t0;
    const ok = !r.skipped;
    c.attempts = attempts;
    console.log(`  trozo ${String(i + 1).padStart(2)}/${chunks.length} págs ${c.from}-${c.to}  `
        + (ok ? `ok ${(elapsed / 1000).toFixed(0)}s  ${r.markdown.length} chars${attempts > 1 ? `  (${attempts} intentos)` : ''}${r.truncated ? '  ⚠ TRUNCADO' : ''}`
              : `FALLÓ — ${r.reason}`));
    return { ...c, ...r, elapsed, ok };
});
const wallMs = Date.now() - wallStart;

// ── Coser ──────────────────────────────────────────────────────────────────

const okChunks = results.filter(r => r.ok);
const stitched = okChunks.map(r => r.markdown.trim()).join('\n\n---\n\n');
await fs.writeFile(path.join(outDir, 'cosido.md'), stitched, 'utf8');

// ── Verificación de los cuatro supuestos ───────────────────────────────────

const line = s => console.log(s);
line('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
line('Supuestos');
line('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1 — concurrencia
const failed = results.filter(r => !r.ok);
const rateLimited = failed.filter(r => /429|rate|quota|RESOURCE_EXHAUSTED/i.test(r.reason ?? ''));
const seqMs = results.reduce((n, r) => n + r.elapsed, 0);
line(`\n1. CONCURRENCIA ${args.concurrency}`);
line(`   ${okChunks.length}/${chunks.length} trozos ok · ${failed.length} fallaron · ${rateLimited.length} por rate-limit`);
line(`   pared ${(wallMs / 1000).toFixed(0)}s  vs  serie ${(seqMs / 1000).toFixed(0)}s  →  aceleración ${(seqMs / wallMs).toFixed(1)}x`);
line(rateLimited.length
    ? '   ✗ HAY RATE-LIMIT: bajar concurrencia o añadir reintento con backoff'
    : (failed.length ? '   ⚠ fallos no atribuibles a rate-limit — revisar motivos' : '   ✓ sin rate-limit a esta concurrencia'));

// 2 — numeración global
const pages = [...stitched.matchAll(/<!--\s*page:\s*(\d+)\s*-->/g)].map(m => Number(m[1]));
// Sólo se evalúan las páginas de los trozos que CORRIERON. Contar como
// "faltantes" las de un trozo que murió por 503 mezcla dos preguntas
// distintas: si el servicio respondió y si la numeración cierra. La primera
// corrida lo hizo y concluyó que la numeración fallaba cuando en realidad el
// único trozo vivo numeró exactamente su rango global.
const expected = [];
for (const c of okChunks) for (let p = c.from; p <= c.to; p++) expected.push(p);
expected.sort((a, b) => a - b);
const missing = expected.filter(p => !pages.includes(p));
const dupes = pages.filter((p, i) => pages.indexOf(p) !== i);
const ascending = pages.every((p, i) => i === 0 || p > pages[i - 1]);
line(`\n2. NUMERACIÓN GLOBAL (se pidió desplazamiento por trozo)`);
line(`   evaluada sólo sobre los ${okChunks.length}/${chunks.length} trozos que corrieron`);
line(`   emitidas ${pages.length} · esperadas ${expected.length} · rango ${pages[0]}–${pages[pages.length - 1]}`);
line(`   faltantes ${missing.length ? missing.slice(0, 10).join(', ') : 'ninguna'} · duplicadas ${dupes.length} · ascendente ${ascending ? 'sí' : 'NO'}`);
// Numeración correcta y cobertura completa son fallas DISTINTAS. Un trozo
// puede numerar impecable y aun así devolver menos páginas: emitió 170-173
// —desplazamiento global perfecto— cuando se le habían dado 170-209.
// Reportarlo como "numeración rota" manda a arreglar el prompt cuando lo que
// falla es la cobertura.
const numberingSound = dupes.length === 0 && ascending
    && pages.every(p => p >= from && p <= to);
line(numberingSound
    ? '   ✓ numeración correcta: sistema global, sin duplicar ni desordenar'
    : '   ✗ NUMERACIÓN rota — las citas apuntarían mal');
if (missing.length) {
    line(`   ⚠ COBERTURA: faltan ${missing.length} páginas de trozos dados por exitosos.`);
    line('     Falla distinta de la numeración: el contenido no llegó.');
}

// 4 — tope de salida
const truncated = okChunks.filter(r => r.truncated);
const maxChars = Math.max(...okChunks.map(r => r.markdown.length), 0);
const charsPerPage = Math.round(maxChars / args.chunk);
line(`\n4. TOPE DE SALIDA con trozos de ${args.chunk} págs`);
line(`   mayor trozo ${maxChars} chars (~${charsPerPage}/pág) · truncados ${truncated.length}`);
line(truncated.length
    ? `   ✗ ${truncated.length} trozo(s) truncado(s): bajar --chunk`
    : '   ✓ ningún trozo chocó con el tope');

// tokens y costo
const inTok = okChunks.reduce((n, r) => n + (r.billing?.inputTokens ?? 0), 0);
const totTok = okChunks.reduce((n, r) => n + (r.billing?.totalTokens ?? 0), 0);
const outBillable = totTok - inTok;
line(`\n   tokens: ${inTok} entrada + ${outBillable} salida facturable (incluye pensamiento)`);

const report = {
    doc: { title, totalPages, range: [from, to], chunkSize: args.chunk, concurrency: args.concurrency },
    concurrency: { ok: okChunks.length, failed: failed.length, rateLimited: rateLimited.length, wallMs, seqMs },
    numbering: { emitted: pages.length, expected: expected.length, missing, dupes: dupes.length, ascending },
    outputCap: { maxChars, charsPerPage, truncated: truncated.length },
    tokens: { input: inTok, billableOutput: outBillable },
    chunks: results.map(r => ({ from: r.from, to: r.to, ok: r.ok, elapsed: r.elapsed, chars: r.markdown?.length ?? 0, reason: r.reason ?? null })),
};

// 3 — bordes: sólo con baseline, porque exige extraer el mismo rango entero
if (args.baseline && failed.length) {
    line('\n3. BORDES — NO EVALUABLE');
    line(`   ${failed.length} de ${chunks.length} trozos no corrieron, así que lo cosido está`);
    line('   incompleto por una razón que no tiene nada que ver con los bordes.');
    line('   Comparar contra la referencia mediría los trozos que faltan, no las uniones.');
    line('   Vuelve a correr cuando los cuatro trozos terminen.');
} else if (args.baseline) {
    line('\n3. BORDES — comparando lo cosido contra una sola pasada del rango entero');
    const wholePath = path.join(tmp, 'whole.pdf');
    await slicePdf(sourcePath, wholePath, from, to);
    const t0 = Date.now();
    const base = await runGemini(wholePath, { apiKey: process.env.GEMINI_API_KEY, pageOffset: from });
    if (base.skipped) {
        line(`   no se pudo obtener la referencia: ${base.reason}`);
        line('   (una sola pasada sobre todo el rango puede exceder el tope de salida —');
        line('    que es justamente la razón por la que existe el fan-out)');
    } else {
        await fs.writeFile(path.join(outDir, 'referencia.md'), base.markdown, 'utf8');
        const a = scriptFidelity(stitched); const b = scriptFidelity(base.markdown);
        const pct = (x, y) => (y ? `${Math.round((x / y) * 100)}%` : '—');
        line(`   una pasada: ${base.markdown.length} chars en ${((Date.now() - t0) / 1000).toFixed(0)}s${base.truncated ? '  ⚠ TRUNCADA' : ''}`);
        line(`   cosido:     ${stitched.length} chars  (${pct(stitched.length, base.markdown.length)} de la referencia)`);
        line(`   griego  cosido ${a.greekLetters} vs referencia ${b.greekLetters}  (${pct(a.greekLetters, b.greekLetters)})`);
        line(`   hebreo  cosido ${a.hebrewConsonants} vs referencia ${b.hebrewConsonants}  (${pct(a.hebrewConsonants, b.hebrewConsonants)})`);
        const ratio = stitched.length / Math.max(1, base.markdown.length);
        if (base.truncated) {
            // La referencia se cortó, así que no es referencia de nada. El
            // cosido salió con MÁS texto que ella y el chequeo de proporción
            // lo leyó como "los bordes están bien" — cuando lo que muestra es
            // que una sola pasada NO alcanza para este rango. Ese sí es un
            // resultado, pero es otro.
            line('   ✗ BORDES NO VALIDADOS: la referencia salió TRUNCADA.');
            line(`     El cosido tiene ${Math.round(ratio * 100)}% de ella, o sea MÁS — comparar contra`);
            line('     una referencia incompleta no dice nada sobre las uniones.');
            line('     Sí demuestra otra cosa: una sola pasada no alcanza para este rango,');
            line('     que es exactamente la razón de existir del fan-out.');
            line('     Para validar bordes: baja --pages a un rango que quepa de una pasada.');
        } else {
            line(ratio >= 0.97
                ? '   ✓ coser no pierde contenido apreciable en los bordes'
                : `   ⚠ el cosido tiene ${Math.round((1 - ratio) * 100)}% menos texto — revisar los bordes`);
        }
        report.boundaries = {
            baselineChars: base.markdown.length, stitchedChars: stitched.length,
            baselineTruncated: !!base.truncated,
            greek: [a.greekLetters, b.greekLetters], hebrew: [a.hebrewConsonants, b.hebrewConsonants],
        };
    }
} else {
    line('\n3. BORDES — no evaluado (pasa --baseline para compararlo con una sola pasada)');
}

// extrapolación
const perPageMs = wallMs / (to - from + 1);
line(`\n━━ Extrapolación a un libro de ${totalPages} páginas ━━`);
line(`   a esta concurrencia: ${((perPageMs * totalPages) / 60000).toFixed(0)} min de pared`);
line(`   trozos: ${Math.ceil(totalPages / args.chunk)} · cada uno bien dentro del timeout de 540s`);

await fs.writeFile(path.join(outDir, 'spike.json'), JSON.stringify(report, null, 2));
line(`\n→ ${outDir}`);
await fs.rm(tmp, { recursive: true, force: true });
