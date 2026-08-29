#!/usr/bin/env node
/**
 * scripts/extraction-bakeoff/audit-original-languages.mjs
 *
 * ¿Cuántos libros de la biblioteca están indexados SIN su griego ni su
 * hebreo?
 *
 * Se descubrió con un comentario a los Profetas Menores: 1.185 chunks
 * indexados, 1,4 millones de caracteres, y CERO consonantes hebreas —
 * mientras el PDF, visto con OCR, sí las traía. La extracción en modo `fast`
 * lee la capa de texto embebida, y en este tipo de libro las lenguas
 * originales no están ahí: están como glifos que sólo un OCR reconstruye.
 *
 * Un pastor que busque חֶסֶד en esos libros no encuentra nada. No porque el
 * libro no lo tenga, sino porque el índice nunca lo vio. Y el sistema los
 * reporta como "Listo".
 *
 * Esto mide cuántos son, antes de decidir cuánta ingeniería y cuánta
 * re-extracción justifica el problema.
 *
 * DOS NIVELES
 * ───────────
 * NIVEL 1 (por defecto, gratis): lee el `structured.md` YA indexado de cada
 *   recurso y cuenta griego y hebreo. Cruza con el tipo de recurso y con los
 *   libros bíblicos que declara cubrir, para separar "no tiene lenguas
 *   originales porque no le corresponde" de "debería tenerlas y no las
 *   tiene". No descarga ningún PDF ni gasta un centavo.
 *
 * NIVEL 2 (`--probe`, cuesta centavos): para los sospechosos, descarga el
 *   PDF, recorta unas páginas de muestra y las pasa por OCR. Si el OCR
 *   encuentra escritura que el índice no tiene, queda PROBADO — deja de ser
 *   sospecha. Requiere MISTRAL_API_KEY.
 *
 * USO
 *   node scripts/extraction-bakeoff/audit-original-languages.mjs
 *   node scripts/extraction-bakeoff/audit-original-languages.mjs --probe --limit 5
 *
 * OPCIONES
 *   --user <uid>    Biblioteca a auditar (por defecto, la del .env)
 *   --probe         Nivel 2: confirmar con OCR sobre muestras
 *   --sample N      Páginas a muestrear por libro en nivel 2 (por defecto 3)
 *   --limit N       Máximo de recursos a sondear en nivel 2 (por defecto 10)
 *   --json <ruta>   Volcar el resultado crudo
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';
import { config as loadEnv } from 'dotenv';

import { scriptFidelity } from './lib/metrics.mjs';
import { runMistralOcr } from './lib/engines.mjs';
import { slicePdf, parseStorageLocation } from './lib/pdf.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

const OT_BOOKS = new Set(['GEN', 'EXO', 'LEV', 'NUM', 'DEU', 'JOS', 'JDG', 'RUT', '1SA', '2SA', '1KI', '2KI', '1CH', '2CH', 'EZR', 'NEH', 'EST', 'JOB', 'PSA', 'PRO', 'ECC', 'SNG', 'ISA', 'JER', 'LAM', 'EZK', 'DAN', 'HOS', 'JOL', 'AMO', 'OBA', 'JON', 'MIC', 'NAM', 'HAB', 'ZEP', 'HAG', 'ZEC', 'MAL']);
const NT_BOOKS = new Set(['MAT', 'MRK', 'LUK', 'JHN', 'ACT', 'ROM', '1CO', '2CO', 'GAL', 'EPH', 'PHP', 'COL', '1TH', '2TH', '1TI', '2TI', 'TIT', 'PHM', 'HEB', 'JAS', '1PE', '2PE', '1JN', '2JN', '3JN', 'JUD', 'REV']);

/**
 * Tipos de recurso donde la ausencia de lenguas originales es un defecto y
 * no una característica. Un comentario expositivo puede legítimamente no
 * traer una palabra de hebreo; un comentario EXEGÉTICO, una gramática o un
 * léxico que no traen ninguna están rotos por definición.
 */
const EXPECTS_ORIGINAL = new Set([
    'exegetical-commentary',
    'critical-text',
    'grammar',
    'theological-dictionary',
    'bible-dictionary',
    'commentary',
]);

function parseArgs(argv) {
    const out = { sample: 3, limit: 10 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = () => argv[++i];
        if (a === '--user') out.user = next();
        else if (a === '--probe') out.probe = true;
        else if (a === '--sample') out.sample = Number(next());
        else if (a === '--limit') out.limit = Number(next());
        else if (a === '--json') out.json = next();
    }
    return out;
}

const args = parseArgs(process.argv.slice(2));

loadEnv({ path: path.join(repoRoot, 'packages', 'web', '.env.local') });
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error('Falta VITE_FIREBASE_PROJECT_ID (packages/web/.env.local)');
    process.exit(1);
}
const bucketName = `${projectId}.firebasestorage.app`;
if (!admin.apps.length) {
    admin.initializeApp({ projectId, storageBucket: bucketName, serviceAccountId: `${projectId}@appspot.gserviceaccount.com` });
}

const db = admin.firestore();
const bucket = admin.storage().bucket(bucketName);

// ── Nivel 1 ────────────────────────────────────────────────────────────────

let query = db.collection('library_resources');
if (args.user) query = query.where('userId', '==', args.user);
const snap = await query.get();

console.log(`Auditando ${snap.size} recursos…\n`);

const rows = [];
let read = 0;

for (const doc of snap.docs) {
    const d = doc.data();
    if (d.isSystemSource) continue;                 // entradas de catálogo: sin texto
    if (d.textExtractionStatus !== 'ready') continue;
    if (!d.structuredContentUrl) continue;

    const books = Array.isArray(d.coversBibleBooks) ? d.coversBibleBooks : [];
    const expectsHebrew = books.some(b => OT_BOOKS.has(b));
    const expectsGreek = books.some(b => NT_BOOKS.has(b));
    const typeExpects = EXPECTS_ORIGINAL.has(d.type);

    // Sin señal alguna de que deba traer lenguas originales, no hay defecto
    // que reportar: un libro de teología pastoral sin una palabra de griego
    // está perfecto.
    if (!expectsHebrew && !expectsGreek && !typeExpects) continue;

    let markdown = '';
    try {
        const { objectPath } = parseStorageLocation(d.structuredContentUrl, bucketName);
        const [buf] = await bucket.file(objectPath).download();
        markdown = buf.toString('utf8');
        read++;
    } catch (err) {
        rows.push({ id: doc.id, title: d.title, error: `no se pudo leer structured.md: ${err.message}` });
        continue;
    }

    const s = scriptFidelity(markdown);
    rows.push({
        id: doc.id,
        title: d.title ?? doc.id,
        userId: d.userId,
        type: d.type,
        extractionVersion: d.extractionVersion ?? '—',
        pageCount: d.pageCount ?? null,
        chars: markdown.length,
        greek: s.greekLetters,
        hebrew: s.hebrewConsonants,
        niqqudRatio: s.niqqudRatio,
        greekDiacriticRatio: s.greekDiacriticRatio,
        expectsHebrew, expectsGreek, typeExpects,
        storageUrl: d.storageUrl ?? null,
        // Sospechoso: se esperaba escritura original y el índice no tiene NADA.
        suspect: (expectsHebrew || expectsGreek || typeExpects) && s.greekLetters === 0 && s.hebrewConsonants === 0,
    });
}

const suspects = rows.filter(r => r.suspect);
const healthy = rows.filter(r => !r.suspect && !r.error);

// ── Informe nivel 1 ────────────────────────────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Recursos candidatos a tener lengua original: ${rows.length}   (leídos ${read})`);
console.log(`  con griego o hebreo en el índice: ${healthy.length}`);
console.log(`  SIN nada de griego ni hebreo:     ${suspects.length}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Por extractor: si el problema se concentra en uno, ese es el culpable.
const byVersion = new Map();
for (const r of rows) {
    const k = r.extractionVersion;
    const v = byVersion.get(k) ?? { total: 0, sinEscritura: 0 };
    v.total++;
    if (r.suspect) v.sinEscritura++;
    byVersion.set(k, v);
}
console.log('Por extractor');
console.log('  extractor                   total   sin escritura');
for (const [k, v] of [...byVersion.entries()].sort((a, b) => b[1].total - a[1].total)) {
    const pct = v.total ? Math.round((v.sinEscritura / v.total) * 100) : 0;
    console.log(`  ${k.padEnd(26)} ${String(v.total).padStart(5)}   ${String(v.sinEscritura).padStart(5)} (${pct}%)`);
}
console.log();

if (suspects.length) {
    console.log('Sospechosos — se esperaba lengua original, el índice no tiene ninguna');
    for (const r of suspects.sort((a, b) => (b.pageCount ?? 0) - (a.pageCount ?? 0))) {
        const why = [
            r.expectsHebrew ? 'cubre AT' : null,
            r.expectsGreek ? 'cubre NT' : null,
            r.typeExpects ? r.type : null,
        ].filter(Boolean).join(', ');
        console.log(`  ${(r.pageCount ?? '?').toString().padStart(4)} págs · ${r.title.slice(0, 58).padEnd(58)} [${why}]`);
        console.log(`         ${r.id}`);
    }
    console.log();
}

if (healthy.length) {
    console.log('Con escritura original en el índice (referencia de que sí se puede)');
    for (const r of healthy.slice(0, 10)) {
        console.log(`  ${r.title.slice(0, 52).padEnd(52)} griego ${String(r.greek).padStart(5)} · hebreo ${String(r.hebrew).padStart(5)} · niqqud ${r.niqqudRatio.toFixed(2)}`);
    }
    console.log();
}

// ── Nivel 2 ────────────────────────────────────────────────────────────────

if (args.probe && suspects.length) {
    if (!process.env.MISTRAL_API_KEY) {
        console.log('--probe pedido pero falta MISTRAL_API_KEY. Sin confirmación por OCR.\n');
    } else {
        console.log('━━ Confirmando con OCR sobre muestras ━━\n');
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-'));
        const targets = suspects.slice(0, args.limit);

        for (const r of targets) {
            if (!r.storageUrl) { console.log(`  ${r.title.slice(0, 50)} — sin storageUrl, no se puede sondear`); continue; }
            process.stdout.write(`  ${r.title.slice(0, 50).padEnd(52)} `);
            try {
                const { objectPath } = parseStorageLocation(r.storageUrl, bucketName);
                const pdfPath = path.join(tmp, `${r.id}.pdf`);
                await bucket.file(objectPath).download({ destination: pdfPath });

                // Muestra del medio del libro: el principio suele ser portada,
                // prólogo y bibliografía, donde no hay lengua original aunque
                // el libro esté lleno de ella más adelante.
                const mid = Math.max(1, Math.floor((r.pageCount ?? 40) / 2));
                const slicePath = path.join(tmp, `${r.id}-slice.pdf`);
                await slicePdf(pdfPath, slicePath, mid, mid + args.sample - 1);

                const res = await runMistralOcr(slicePath, { apiKey: process.env.MISTRAL_API_KEY });
                if (res.skipped) { console.log(`OCR omitido (${res.reason})`); continue; }

                const s = scriptFidelity(res.markdown);
                r.probe = { greek: s.greekLetters, hebrew: s.hebrewConsonants, pages: `${mid}-${mid + args.sample - 1}` };
                const found = s.greekLetters + s.hebrewConsonants;
                console.log(found > 0
                    ? `CONFIRMADO — OCR halló griego ${s.greekLetters}, hebreo ${s.hebrewConsonants} en págs ${r.probe.pages}; el índice tiene 0`
                    : `sin escritura original en la muestra (págs ${r.probe.pages}) — puede que el libro no la tenga`);
            } catch (err) {
                console.log(`error: ${err.message}`);
            }
        }
        await fs.rm(tmp, { recursive: true, force: true });

        const confirmed = targets.filter(r => r.probe && (r.probe.greek + r.probe.hebrew) > 0);
        console.log(`\n  Confirmados con evidencia: ${confirmed.length} de ${targets.length} sondeados.`);
    }
}

if (args.json) {
    await fs.writeFile(path.resolve(args.json), JSON.stringify({ rows, suspects: suspects.map(r => r.id) }, null, 2));
    console.log(`\n→ ${path.resolve(args.json)}`);
}

console.log('\nLos sospechosos están indexados y se reportan "Listos". Su griego y su');
console.log('hebreo no están en el índice, así que ninguna búsqueda los va a encontrar.');
