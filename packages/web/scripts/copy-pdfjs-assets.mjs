import { cp, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

/**
 * Copia a `public/pdfjs/` los recursos que pdf.js carga por URL en tiempo de
 * ejecución.
 *
 * No son opcionales, y su ausencia NO da error: la página simplemente sale en
 * blanco. Un comentario escaneado —que es la mitad de la biblioteca— guarda
 * cada página como imagen JPEG 2000 con máscara JBIG2, y pdf.js decodifica las
 * dos con WebAssembly que busca en `wasmUrl`. Sin esos archivos servidos, el
 * visor abre el documento, dibuja la página, y no pinta nada.
 *
 * Se copian sin hash a propósito: pdf.js recibe un directorio base y arma los
 * nombres de archivo por su cuenta, así que un nombre versionado por el bundler
 * no le sirve.
 *
 * También van los `cmaps` y las `standard_fonts`, por el mismo motivo con otra
 * cara: sin ellos, un PDF con tipografías no latinas —griego, hebreo, que es
 * justo lo que hay en estos comentarios— renderiza cajas vacías en vez de
 * letras.
 */

const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(require.resolve('pdfjs-dist/package.json'));
const target = resolve(import.meta.dirname, '../public/pdfjs');

const DIRECTORIES = ['wasm', 'cmaps', 'standard_fonts'];

await mkdir(target, { recursive: true });
for (const dir of DIRECTORIES) {
    await cp(resolve(pdfjsRoot, dir), resolve(target, dir), { recursive: true });
}

console.log(`[pdfjs] recursos copiados a public/pdfjs/ (${DIRECTORIES.join(', ')})`);
