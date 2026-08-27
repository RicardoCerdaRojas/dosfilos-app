/**
 * El nohoist de este workspace hace que yarn 1 materialice copias anidadas de
 * `react` (peer dep) bajo algunos paquetes. Dos instancias de React en el
 * bundle rompen los hooks en runtime, así que las borramos tras cada install.
 * La resolución de Node/Metro sube al `node_modules/react` del workspace.
 */
const fs = require('fs');
const path = require('path');

const nested = [
  'node_modules/react-remove-scroll/node_modules/react',
  'node_modules/use-sync-external-store/node_modules/react',
];

for (const rel of nested) {
  const target = path.join(__dirname, '..', rel);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[dedupe-react] removed ${rel}`);
  }
}

// Red de seguridad: si aparece cualquier otra copia anidada de react, fallar
// fuerte aquí y no en runtime.
const localReact = path.join(__dirname, '..', 'node_modules', 'react');
const nm = path.join(__dirname, '..', 'node_modules');
const extras = [];
function scan(dir, depth) {
  if (depth > 3) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = path.join(dir, e.name);
    if (e.name === 'node_modules') {
      const r = path.join(p, 'react');
      if (fs.existsSync(r) && r !== localReact) extras.push(r);
      scan(p, depth + 1);
    } else if (!e.name.startsWith('.')) {
      scan(p, depth + 1);
    }
  }
}
scan(nm, 0);
if (extras.length) {
  console.error('[dedupe-react] copias anidadas de react no previstas:');
  for (const e of extras) console.error('  ' + e);
  process.exit(1);
}
