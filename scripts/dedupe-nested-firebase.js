/**
 * Normaliza el árbol de firebase JS en el node_modules de la RAÍZ.
 *
 * Desde que packages/mobile trae @react-native-firebase (que depende de un
 * firebase JS más nuevo para su soporte web), el grafo tiene DOS versiones de
 * @firebase/app. El hoister de yarn 1 resuelve el conflicto fragmentando: deja
 * la raíz SIN @firebase/app y anida copias por componente. Resultado en el
 * bundle web: dos instancias del registry de componentes y un crash al
 * arrancar ("Service storage is not available") — tumbó prod el 2026-08-27.
 *
 * Reglas:
 *   1. La copia canónica es la que `firebase` (el wrapper que usa web) trae
 *      anidada: node_modules/firebase/node_modules/@firebase/*. Se SUBE a
 *      node_modules/@firebase/<pkg> cuando el slot está vacío; si el slot
 *      existe con la MISMA versión, se borra la anidada; si difiere, ABORTA
 *      (mejor romper el install que empaquetar dos registries).
 *   2. Toda copia node_modules/@firebase/<pkg>/node_modules/@firebase/<sub>
 *      se dedupe contra la raíz con la misma regla.
 *   3. Solo toca el node_modules de la RAÍZ. Los árboles de packages/* no se
 *      tocan: mobile necesita SU set (versión distinta, nohoisted).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NM = path.join(ROOT, 'node_modules');
const SCOPE = path.join(NM, '@firebase');

function version(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
}

let moved = 0;
let removed = 0;

function reconcile(nestedDir, pkgName, context) {
  const rootSlot = path.join(SCOPE, pkgName);
  const nestedVersion = version(nestedDir);
  if (!fs.existsSync(rootSlot)) {
    fs.mkdirSync(SCOPE, { recursive: true });
    fs.renameSync(nestedDir, rootSlot);
    moved++;
    console.log(`[dedupe-firebase] hoisted @firebase/${pkgName}@${nestedVersion} (from ${context})`);
    return;
  }
  const rootVersion = version(rootSlot);
  if (rootVersion === nestedVersion) {
    fs.rmSync(nestedDir, { recursive: true, force: true });
    removed++;
    return;
  }
  console.error(
    `[dedupe-firebase] CONFLICTO: @firebase/${pkgName} raíz=${rootVersion} vs ${context}=${nestedVersion}. ` +
      'Dos versiones en el árbol de la raíz = dos registries en el bundle web. Resolver antes de instalar.',
  );
  process.exit(1);
}

function sweepNestedScope(ownerDir, context) {
  const nestedScope = path.join(ownerDir, 'node_modules', '@firebase');
  if (!fs.existsSync(nestedScope)) return;
  for (const pkg of fs.readdirSync(nestedScope)) {
    reconcile(path.join(nestedScope, pkg), pkg, context);
  }
  // limpia node_modules vacíos que deja el rename
  const nestedNm = path.join(ownerDir, 'node_modules');
  if (fs.existsSync(nestedScope) && fs.readdirSync(nestedScope).length === 0) fs.rmdirSync(nestedScope);
  if (fs.existsSync(nestedNm) && fs.readdirSync(nestedNm).length === 0) fs.rmdirSync(nestedNm);
}

// 1. las que trae el wrapper `firebase`
const firebaseDir = path.join(NM, 'firebase');
if (fs.existsSync(firebaseDir)) sweepNestedScope(firebaseDir, 'firebase');

// 2. las anidadas bajo cada componente raíz
if (fs.existsSync(SCOPE)) {
  for (const pkg of fs.readdirSync(SCOPE)) {
    sweepNestedScope(path.join(SCOPE, pkg), `@firebase/${pkg}`);
  }
}

if (moved || removed) {
  console.log(`[dedupe-firebase] hoisted ${moved}, deduped ${removed}`);
} else {
  console.log('[dedupe-firebase] árbol de @firebase ya normalizado');
}
