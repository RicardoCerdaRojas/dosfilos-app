#!/usr/bin/env node
/**
 * scripts/extraction-bakeoff/run.mjs
 *
 * Runs every extraction engine over the SAME pages of the SAME document and
 * scores them on what this corpus actually needs: polytonic Greek, pointed
 * Hebrew, and page numbers you can cite.
 *
 * Why this exists: the Premium tier is sold as "tablas, multi-columna y
 * escaneados", and production calls LlamaParse in `fast` mode — the one mode
 * that skips OCR and layout reconstruction. That may be fine or may be
 * costing quality; the argument cannot be settled by reading price sheets.
 * This settles it with numbers from our own books.
 *
 * USO
 * ───
 *   # Un recurso de la biblioteca, 10 páginas desde la 120
 *   node scripts/extraction-bakeoff/run.mjs \
 *     --resource a4f8034b-e0d9-4bc0-8d45-a9a321da7657 \
 *     --pages 120-130 --greek
 *
 *   # Un PDF local
 *   node scripts/extraction-bakeoff/run.mjs --file ~/bhs-muestra.pdf --pages 1-8 --hebrew
 *
 *   # Sólo algunos motores
 *   node scripts/extraction-bakeoff/run.mjs --file x.pdf --pages 1-5 \
 *     --engines pdftotext,llamaparse-fast,mistral-ocr
 *
 * OPCIONES
 *   --resource <id>    Recurso de `library_resources` (descarga el PDF original)
 *   --file <ruta>      PDF local (alternativa a --resource)
 *   --pages A-B        Rango 1-based inclusivo. Por defecto 1-10.
 *   --greek            Espera griego: reprueba a quien pierda los diacríticos
 *   --hebrew           Espera hebreo: reprueba a quien pierda el niqqud
 *   --engines a,b,c    Subconjunto de motores (por defecto: todos)
 *   --probe "texto"    Pasaje a buscar en cada salida (repetible)
 *   --out <dir>        Dónde escribir (por defecto ./bakeoff-out/<timestamp>)
 *
 * CLAVES (por variable de entorno; ninguna se imprime)
 *   LLAMAPARSE_API_KEY   MISTRAL_API_KEY   GEMINI_API_KEY
 *   Las que falten hacen que su motor se marque NO EJECUTADO, sin abortar.
 *
 * COSTO
 *   Cada motor procesa sólo el recorte. Con 10 páginas la corrida completa
 *   cuesta centavos. Recortar es lo que hace que esto se pueda repetir.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { ENGINES } from './lib/engines.mjs';
import { fetchResourcePdf, pdfPageCount, slicePdf } from './lib/pdf.mjs';
import {
    scriptFidelity, pageIntegrity, structure, novelty, pageDrift, verdict, detectScripts,
} from './lib/metrics.mjs';
import { renderMarkdown, renderHtml } from './lib/report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

// ── CLI ────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
    const out = { pages: '1-10', probes: [], engines: null };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => argv[++i];
        if (a === '--resource') out.resource = next();
        else if (a === '--file') out.file = next();
        else if (a === '--pages') out.pages = next();
        else if (a === '--engines') out.engines = next().split(',').map(s => s.trim());
        else if (a === '--probe') out.probes.push(next());
        else if (a === '--out') out.out = next();
        else if (a === '--greek') out.greek = true;
        else if (a === '--hebrew') out.hebrew = true;
        else if (a === '--help' || a === '-h') out.help = true;
    }
    return out;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.resource && !args.file)) {
    console.log(await fs.readFile(fileURLToPath(import.meta.url), 'utf8')
        .then(s => s.slice(s.indexOf('/**'), s.indexOf(' */') + 3)));
    process.exit(args.help ? 0 : 1);
}

const [fromPage, toPage] = args.pages.split('-').map(Number);
if (!Number.isFinite(fromPage) || !Number.isFinite(toPage)) {
    console.error(`Rango de páginas inválido: "${args.pages}". Usa por ejemplo --pages 120-130`);
    process.exit(1);
}

const outDir = args.out
    ? path.resolve(args.out)
    : path.join(repoRoot, 'bakeoff-out', new Date().toISOString().replace(/[:.]/g, '-'));
await fs.mkdir(outDir, { recursive: true });

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bakeoff-'));

// ── Get the document ───────────────────────────────────────────────────────

let sourcePath;
let title;
let resourceId = null;

if (args.resource) {
    const admin = (await import('firebase-admin')).default;
    const { config } = await import('dotenv');
    config({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId) {
        console.error('Falta VITE_FIREBASE_PROJECT_ID (packages/web/.env.local)');
        process.exit(1);
    }
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId,
            storageBucket: `${projectId}.firebasestorage.app`,
            serviceAccountId: `${projectId}@appspot.gserviceaccount.com`,
        });
    }
    console.log(`↓ Descargando recurso ${args.resource}…`);
    const fetched = await fetchResourcePdf(admin, args.resource, tmpDir);
    sourcePath = fetched.path;
    title = fetched.title;
    resourceId = args.resource;
} else {
    sourcePath = path.resolve(args.file);
    title = path.basename(sourcePath);
}

const totalPages = await pdfPageCount(sourcePath);
console.log(`  documento: ${title} (${totalPages ?? '?'} páginas)`);

const slicePath = path.join(tmpDir, 'slice.pdf');
const slice = await slicePdf(sourcePath, slicePath, fromPage, toPage);
console.log(`✂  recorte: páginas ${slice.originalRange[0]}–${slice.originalRange[1]} → ${slice.pages} páginas\n`);

// ── Run the engines ────────────────────────────────────────────────────────

const selected = args.engines
    ? ENGINES.filter(e => args.engines.includes(e.id))
    : ENGINES;

if (selected.length === 0) {
    console.error(`Ningún motor coincide con --engines. Disponibles: ${ENGINES.map(e => e.id).join(', ')}`);
    process.exit(1);
}

const env = process.env;
const results = [];

for (const engine of selected) {
    process.stdout.write(`▶ ${engine.label} … `);
    let res;
    try {
        res = await engine.run(slicePath, env);
    } catch (err) {
        res = { skipped: true, reason: `excepción no controlada: ${err.message}` };
    }

    if (res.skipped) {
        console.log(`OMITIDO (${res.reason})`);
        results.push({ id: engine.id, label: engine.label, skipped: true, reason: res.reason });
        continue;
    }

    console.log(`ok — ${res.markdown.length} chars, ${(res.elapsedMs / 1000).toFixed(1)}s`);
    await fs.writeFile(path.join(outDir, `${engine.id}.md`), res.markdown, 'utf8');
    results.push({ id: engine.id, label: engine.label, ...res });
}

const ran = results.filter(r => !r.skipped);
if (ran.length === 0) {
    console.error('\nNingún motor pudo ejecutarse. Revisa las claves de API.');
    process.exit(1);
}

// ── Score ──────────────────────────────────────────────────────────────────

// The baseline decides whether the novelty metric means anything: on a scan
// pdftotext finds nothing, every engine is "novel", and the number is noise.
const baseline = ran.find(r => r.id === 'pdftotext');
const hasEmbeddedText = !!baseline && baseline.markdown.replace(/<!--[^>]*-->/g, '').trim().length > 200;

// La novedad compara a cada motor contra TODOS los demás. Con menos de tres
// que hayan corrido, degenera en una diferencia por pares: los dos salen con
// el mismo número alto y no distingue quién inventó de quién se comió texto.
// Reportarla así invita a concluir cualquier cosa, así que se calla.
const noveltyUsable = hasEmbeddedText && ran.length >= 3;

// Qué escrituras hay REALMENTE, según el motor que más encontró. Atrapa el
// error de operador más fácil: pedir --greek sobre páginas que están en
// hebreo. Sin esto el veredicto reprueba a todos por no traer un griego que
// nunca estuvo ahí, y el informe afirma algo falso con total seguridad.
const detected = detectScripts(ran.map(r => r.markdown));
const flagWarnings = [];
if (args.greek && !detected.hasGreek) {
    flagWarnings.push(
        `Pediste --greek pero ningún motor encontró griego (máximo ${detected.greek} letras). `
        + 'Revisa el rango de páginas o quita el flag: tal como está, el veredicto reprueba '
        + 'a todos por no recuperar algo que probablemente no está en estas páginas.');
}
if (args.hebrew && !detected.hasHebrew) {
    flagWarnings.push(
        `Pediste --hebrew pero ningún motor encontró hebreo (máximo ${detected.hebrew} consonantes). `
        + 'Revisa el rango de páginas o quita el flag.');
}
if (!args.greek && detected.hasGreek) {
    flagWarnings.push(
        `Hay griego en estas páginas (${detected.greek} letras) y NO pasaste --greek, `
        + 'así que nadie está siendo evaluado por conservar los diacríticos.');
}
if (!args.hebrew && detected.hasHebrew) {
    flagWarnings.push(
        `Hay hebreo en estas páginas (${detected.hebrew} consonantes) y NO pasaste --hebrew, `
        + 'así que nadie está siendo evaluado por conservar el niqqud.');
}

// Consenso: la mediana de lo que encontraron LOS DEMÁS. Es la vara contra la
// que se detecta fabricación — un motor que devuelve cien veces más griego que
// todos los otros juntos no está extrayendo mejor, está escribiendo.
const medianOf = xs => {
    if (xs.length === 0) return 0;
    const v = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
};

for (const r of ran) {
    const others = ran.filter(o => o.id !== r.id).map(o => o.markdown);
    const otherScripts = others.map(t => scriptFidelity(t));
    r.metrics = {
        consensus: {
            greekMedian: medianOf(otherScripts.map(s => s.greekLetters)),
            hebrewMedian: medianOf(otherScripts.map(s => s.hebrewConsonants)),
        },
        chars: r.markdown.length,
        script: scriptFidelity(r.markdown),
        page: pageIntegrity(r.markdown, slice.pages),
        structure: structure(r.markdown),
        novelty: noveltyUsable ? novelty(r.markdown, others) : { novelRatio: null, sampleNovel: [] },
        drift: baseline && r.id !== 'pdftotext' ? pageDrift(baseline.markdown, r.markdown) : null,
    };
    r.verdict = verdict(r.metrics, { expectGreek: !!args.greek, expectHebrew: !!args.hebrew });
}

// ── Report ─────────────────────────────────────────────────────────────────

const run = {
    generatedAt: new Date().toISOString(),
    doc: {
        title,
        resourceId,
        slicePages: slice.pages,
        originalRange: slice.originalRange,
        originalTotal: slice.originalTotal ?? totalPages,
        expectGreek: !!args.greek,
        expectHebrew: !!args.hebrew,
        hasEmbeddedText,
        noveltyUsable,
        detected,
        flagWarnings,
        enginesRan: ran.length,
    },
    results,
};

await fs.writeFile(path.join(outDir, 'informe.md'), renderMarkdown(run), 'utf8');
await fs.writeFile(path.join(outDir, 'comparar.html'), renderHtml(run, { probes: args.probes }), 'utf8');
await fs.writeFile(path.join(outDir, 'datos.json'), JSON.stringify(run, null, 2), 'utf8');

if (noveltyUsable) {
    const novelLines = ran.flatMap(r => [
        `── ${r.label} (novedad ${r.metrics.novelty.novelRatio?.toFixed(3)}) ──`,
        ...(r.metrics.novelty.sampleNovel.map(s => `  ${s}`)),
        '',
    ]);
    await fs.writeFile(path.join(outDir, 'novedad.txt'), novelLines.join('\n'), 'utf8');
}

// ── Console summary ────────────────────────────────────────────────────────

if (flagWarnings.length) {
    console.log('\n⚠  Advertencias sobre los flags');
    for (const w of flagWarnings) console.log(`   ${w}`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Veredicto');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const r of ran) {
    const mark = r.verdict.status === 'NO APTO' ? '✗' : '·';
    console.log(`${mark} ${r.label.padEnd(36)} ${r.verdict.status}`);
    for (const n of r.verdict.notes) console.log(`    ${n}`);
}
for (const r of results.filter(x => x.skipped)) {
    console.log(`- ${r.label.padEnd(36)} NO EJECUTADO (${r.reason})`);
}

console.log(`\n→ ${path.join(outDir, 'informe.md')}`);
console.log(`→ ${path.join(outDir, 'comparar.html')}   ← ábrelo: acá se decide`);
console.log('\nNingún motor está "aprobado" por los números. Mira el griego con tus ojos.');

await fs.rm(tmpDir, { recursive: true, force: true });
