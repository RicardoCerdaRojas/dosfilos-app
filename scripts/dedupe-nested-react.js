/**
 * yarn 1 + workspaces con dos versiones de React (web=18, mobile/functions=19)
 * materializa copias anidadas de react/react-dom bajo paquetes que solo los
 * declaran como PEER (react-i18next, react-remove-scroll, use-sync-external-store,
 * zustand…). Dos instancias de React en un mismo grafo rompen los hooks en
 * runtime ("Invalid hook call" / useContext de null) aunque la versión coincida.
 *
 * Reglas:
 *   - Solo se borra una copia anidada si el paquete que la contiene NO declara
 *     react/react-dom en sus `dependencies` reales (peer no cuenta: un peer
 *     debe resolverse al React del consumidor, nunca a una copia propia).
 *   - Los symlinks de workspaces bajo node_modules de la raíz se saltan: son
 *     los propios packages/* y sus copias de react son legítimas.
 *
 * Corre como postinstall de la raíz. Ver memoria byblos
 * "packages/mobile va con nohoist total + postinstall dedupe-react".
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['react', 'react-dom'];

const roots = [path.join(ROOT, 'node_modules')];
const packagesDir = path.join(ROOT, 'packages');
if (fs.existsSync(packagesDir)) {
  for (const entry of fs.readdirSync(packagesDir)) {
    const nm = path.join(packagesDir, entry, 'node_modules');
    if (fs.existsSync(nm)) roots.push(nm);
  }
}

function isWorkspaceLink(dir) {
  let st;
  try {
    st = fs.lstatSync(dir);
  } catch {
    return false;
  }
  if (!st.isSymbolicLink()) return false;
  const real = fs.realpathSync(dir);
  return real.startsWith(fs.realpathSync(packagesDir) + path.sep);
}

function declaresAsRealDep(pkgDir, name) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
    return Boolean(pkg.dependencies && pkg.dependencies[name]);
  } catch {
    // Sin package.json legible: no borrar, mejor un duplicado que romper un install.
    return true;
  }
}

let removed = 0;

function sweep(nmDir, depth) {
  if (depth > 4) return;
  let entries;
  try {
    entries = fs.readdirSync(nmDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    const pkgDir = path.join(nmDir, e.name);
    if (e.name.startsWith('@')) {
      sweep(pkgDir, depth); // scope: baja un nivel sin contar profundidad
      continue;
    }
    if (isWorkspaceLink(pkgDir)) continue;
    const nested = path.join(pkgDir, 'node_modules');
    if (!fs.existsSync(nested)) continue;
    for (const t of TARGETS) {
      const bad = path.join(nested, t);
      if (fs.existsSync(bad) && !declaresAsRealDep(pkgDir, t)) {
        fs.rmSync(bad, { recursive: true, force: true });
        removed++;
        console.log(`[dedupe-nested-react] removed ${path.relative(ROOT, bad)}`);
      }
    }
    sweep(nested, depth + 1);
  }
}

for (const r of roots) sweep(r, 0);

if (removed === 0) {
  console.log('[dedupe-nested-react] sin copias anidadas de react/react-dom');
}
