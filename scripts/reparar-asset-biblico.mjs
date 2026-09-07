/**
 * Repara defectos verificados del asset `rvr1960.json`.
 *
 * Qué arregla, y por qué cada uno es seguro:
 *
 * 1. **El literal `/n`.** 4.738 versículos traen la secuencia `/n` —una
 *    barra y una ene— donde debería ir un salto de línea. Es un escape mal
 *    convertido en el origen del archivo, no texto bíblico: la RVR no
 *    contiene esa secuencia en ninguna parte. Hoy se ve literal en toda la
 *    app menos en el buscador, que lo limpia por su cuenta
 *    (`SearchSidebar.tsx`). Se reemplaza por un salto real, que el HTML
 *    colapsa a espacio y que deja la información disponible para cualquier
 *    superficie que quiera respetar los versos poéticos.
 *
 * 2. **Salmo 47.** El asset parte el versículo 9 en dos, y por eso el
 *    capítulo tiene 10 donde la RVR tiene 9. Se unen los dos pedazos que ya
 *    están en el archivo: no se escribe texto nuevo, se deshace un corte.
 *
 * 3. **Génesis 33:12.** Faltaba la invitación de Esaú. El texto lo aportó el
 *    fundador desde su RVR1960 impresa; no se escribió de memoria ni se
 *    tradujo de otra versión.
 *
 * Correr: node scripts/reparar-asset-biblico.mjs
 * Es idempotente: correrlo dos veces no cambia nada la segunda.
 */
import fs from 'fs';

/**
 * El mismo archivo vive TRES veces —web, infraestructura y mobile—, cada una
 * cargada por su paquete. Repararlo en una sola las hace divergir, que es
 * peor que el defecto original: dos superficies mostrando Biblias distintas
 * sin que nadie lo note. Se reparan las tres de una, y una prueba de paridad
 * exige que sigan idénticas.
 */
const RUTAS = [
    'packages/web/src/assets/bible/rvr1960.json',
    'packages/infrastructure/src/bible/data/rvr1960.json',
    'packages/mobile/assets/bible/rvr1960.json',
];

for (const RUTA of RUTAS) repararArchivo(RUTA);

function repararArchivo(RUTA) {
const biblia = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
const porId = Object.fromEntries(biblia.map(b => [b.id, b]));

// ── 1. El literal `/n` ────────────────────────────────────────────────
let tocados = 0;
for (const libro of biblia) {
    libro.chapters = libro.chapters.map(cap =>
        cap.map(v => {
            const texto = String(v ?? '');
            if (!texto.includes('/n')) return texto;
            tocados++;
            return texto
                .replace(/\/n/g, '\n')
                // El `/n` venía rodeado de espacios en el archivo original;
                // al convertirlo quedarían sangrías y espacios dobles que no
                // están en el texto bíblico. Se normaliza el espacio en
                // blanco alrededor del corte, sin tocar una sola letra.
                .replace(/[ \t]*\n[ \t]*/g, '\n')
                .replace(/[ \t]{2,}/g, ' ')
                .trim();
        }),
    );
}

// ── 2. El versículo perdido de Génesis 33 ─────────────────────────────
//
// Falta 33:12, la invitación de Esaú. El asset salta de «Acepta, te ruego, mi
// presente…» (v11) a la respuesta de Jacob sobre los niños tiernos, que es el
// 33:13 real — por eso la respuesta parecía venir de la nada.
//
// El texto lo aportó el fundador desde su RVR1960 impresa. NO se escribió de
// memoria ni se tradujo de otra versión: insertar Escritura inventada en una
// Biblia es la línea que no se cruza. Se verificó contra la ASV del propio
// repositorio, cuyo 33:12 dice «And he said, Let us take our journey, and let
// us go, and I will go before thee».
const GENESIS_33_12 = 'Y Esaú dijo: Anda, vamos; y yo iré delante de ti.';
const genesis = porId['gn'];
const genesis33 = genesis.chapters[32];
let insertado = false;
if (genesis33.length === 19 && !genesis33[11].startsWith('Y Esaú dijo: Anda')) {
    genesis.chapters[32] = [
        ...genesis33.slice(0, 11),
        GENESIS_33_12,
        ...genesis33.slice(11),
    ];
    insertado = true;
}

// ── 3. El corte de más en el Salmo 47 ─────────────────────────────────
const salmos = porId['ps'];
const salmo47 = salmos.chapters[46];
let unido = false;
if (salmo47.length === 10) {
    const [nueve, diez] = [salmo47[8], salmo47[9]];
    salmos.chapters[46] = [...salmo47.slice(0, 8), `${nueve}\n${diez}`.trim()];
    unido = true;
}

fs.writeFileSync(RUTA, JSON.stringify(biblia));

console.log(`${RUTA}`);
console.log(`   1. literal "/n" corregido en ${tocados} versículo(s).`);
console.log(`   2. Génesis 33:12: ${insertado ? 'restaurado (19 → 20)' : 'ya estaba, sin cambios'}.`);
console.log(`   3. Salmo 47: ${unido ? 'versículo 9 reunificado (10 → 9)' : 'ya estaba en 9, sin cambios'}.`);
}

console.log('\nSin pendientes.');
