#!/usr/bin/env node
/**
 * Precomputa la frecuencia de cada lema griego en el NT completo (MorphGNT).
 *
 * El dato "δίψυχος aparece sólo 2 veces en todo el NT" es determinista y no
 * cambia (el texto es fijo): se calcula UNA vez acá y se embarca como JSON en
 * el bundle del analizador — contarlo en runtime obligaría a bajar los 27
 * libros (~3 MB) para responder una pregunta cuya respuesta ya sabemos.
 *
 * Regenerar sólo si cambia la fuente: node scripts/build-greek-lemma-index.mjs
 */
import { writeFileSync } from 'node:fs';

const CDN = 'https://cdn.jsdelivr.net/gh/morphgnt/sblgnt@master';
const FILES = [
    '61-Mt', '62-Mk', '63-Lk', '64-Jn', '65-Ac', '66-Ro', '67-1Co', '68-2Co',
    '69-Ga', '70-Eph', '71-Php', '72-Col', '73-1Th', '74-2Th', '75-1Ti',
    '76-2Ti', '77-Tit', '78-Phm', '79-Heb', '80-Jas', '81-1Pe', '82-2Pe',
    '83-1Jn', '84-2Jn', '85-3Jn', '86-Jud', '87-Re',
];

const counts = new Map();
for (const f of FILES) {
    const res = await fetch(`${CDN}/${f}-morphgnt.txt`);
    if (!res.ok) throw new Error(`HTTP ${res.status} en ${f}`);
    const text = await res.text();
    for (const line of text.split('\n')) {
        const cols = line.trim().split(/\s+/);
        const lemma = cols[6];
        if (lemma) counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
    }
    process.stdout.write(`${f} ✓  `);
}
const out = Object.fromEntries([...counts.entries()].sort());
writeFileSync(
    'packages/web/src/pages/greek-analyzer/ntLemmaFrequency.json',
    JSON.stringify(out),
);
console.log(`\nlemas: ${counts.size}`);
