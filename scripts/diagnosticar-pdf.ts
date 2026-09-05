/**
 * Diagnóstico de un PDF ANTES de subirlo. Gratis, en segundos.
 *
 *   npm run diagnosticar -- libro.pdf
 *   npm run diagnosticar -- carpeta/*.pdf
 *
 * Corre con el borrado de tipos nativo de Node (`--experimental-strip-types`),
 * que es lo que permite importar el módulo del dominio SIN duplicar la lógica
 * y sin depender de ts-node: el `tsconfig.json` de la raíz extiende
 * `expo/tsconfig.base` y rompe cualquier ts-node lanzado desde acá.
 *
 * Requiere poppler (`brew install poppler`): usa `pdfinfo`, `pdffonts` y
 * `pdftotext`. Este archivo sólo RECOGE los hechos; el veredicto lo
 * decide `diagnosePdfSource` en el dominio, que está probado contra seis
 * libros reales y lo reusará la interfaz cuando el informe pase a la app.
 */
import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { basename } from 'path';
import {
    diagnosePdfSource,
    sampleWindow,
    type PdfEvidence,
} from '../packages/domain/src/library/diagnosePdfSource.ts';

/** Trozo del cuerpo, para que el usuario JUZGUE con sus ojos. */
let muestraDeTexto = '';

function correr(cmd: string, args: string[]): string {
    try {
        // stderr al vacío: poppler escupe cientos de avisos de ligaduras
        // por libro y ninguno dice nada sobre si el PDF sirve.
        return execFileSync(cmd, args, {
            encoding: 'utf8',
            maxBuffer: 256 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'ignore'],
        });
    } catch {
        return '';
    }
}

/**
 * Palabras que no parecen lenguaje: letras mezcladas con dígitos o
 * signos, o sin una sola vocal. Es la firma de una codificación rota
 * leída como si fuera texto.
 */
function ratioDeBasura(texto: string): number {
    const tokens = texto.split(/\s+/).filter(x => x.length >= 2);
    if (tokens.length === 0) return 0;
    const esBasura = (x: string): boolean => {
        const nucleo = x.replace(/^[.,;:!?()[\]{}«»"'\u2014\u2013-]+|[.,;:!?()[\]{}«»"'\u2014\u2013-]+$/g, '');
        if (nucleo.length < 2) return false;
        if (/[A-Za-zÀ-ÿ][0-9"$%&*+/<=>@\\^_|~]|[0-9"$%&*+/<=>@\\^_|~][A-Za-zÀ-ÿ]/.test(nucleo)) return true;
        return /[A-Za-zÀ-ÿ]/.test(nucleo) && !/[aeiouáéíóúüAEIOUÁÉÍÓÚ]/.test(nucleo);
    };
    return tokens.filter(esBasura).length / tokens.length;
}

function contarEscritura(texto: string): { griego: number; hebreo: number; diacriticos: number } {
    const griego = [...texto].filter(c => /\p{Script=Greek}/u.test(c));
    const hebreo = [...texto].filter(c => /\p{Script=Hebrew}/u.test(c));
    const escritura = [...griego, ...hebreo].join('');
    const diacriticos = [...escritura.normalize('NFD')].filter(c => /\p{Mn}/u.test(c)).length;
    return { griego: griego.length, hebreo: hebreo.length, diacriticos };
}

function reunirEvidencia(archivo: string): PdfEvidence {
    const info = correr('pdfinfo', [archivo]);
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);

    // `pdffonts` imprime dos líneas de cabecera. Cero fuentes es la
    // firma de un escaneo: páginas que son imágenes.
    const fuentes = correr('pdffonts', [archivo]).split('\n').slice(2).filter(l => l.trim());

    const { from, to } = sampleWindow(pages || 30);
    const texto = correr('pdftotext', ['-f', String(from), '-l', String(to), archivo, '-']);
    const { griego, hebreo, diacriticos } = contarEscritura(texto);
    muestraDeTexto = texto.replace(/\s+/g, ' ').trim().slice(0, 220);

    return {
        pages,
        fontCount: fuentes.length,
        sampleFromPage: from,
        sampleToPage: to,
        sampleChars: texto.length,
        greekLetters: griego,
        hebrewLetters: hebreo,
        diacritics: diacriticos,
        garbledTokenRatio: ratioDeBasura(texto),
    };
}


const ICONO: Record<string, string> = {
    'apto': '✓',
    'sin-capa-de-texto': '✗',
    'escritura-ausente': '✗',
    'escritura-sin-diacriticos': '✗',
    'sin-escritura-original': '·',
};

const archivos = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (archivos.length === 0) {
    console.error('uso: npx ts-node --skipProject scripts/diagnosticar-pdf.ts <archivo.pdf> [...]');
    process.exit(2);
}

for (const archivo of archivos) {
    if (!existsSync(archivo)) {
        console.log(`\n── ${basename(archivo)}\n  no existe`);
        continue;
    }
    const evidencia = reunirEvidencia(archivo);
    const d = diagnosePdfSource(evidencia);

    console.log(`\n── ${basename(archivo)}`);
    console.log(`  ${ICONO[d.verdict] ?? '·'} ${d.verdict.toUpperCase().replace(/-/g, ' ')}  ·  ${evidencia.pages} páginas`);
    for (const r of d.reasons) console.log(`     ${r}`);
    for (const s of d.suggestions) console.log(`     → ${s}`);
    // La prueba definitiva la da el ojo: si esto no se entiende, el
    // libro entra mudo por más que los números parezcan normales.
    if (muestraDeTexto) console.log(`     ─ así se lee el cuerpo: «${muestraDeTexto}…»`);
}
console.log();
