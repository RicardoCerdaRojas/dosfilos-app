/**
 * Redacción v2 — cohorte real por superficie de creación de sermón + contenido
 * sintético, con particiones POR USUARIO y filtro de la cuenta del fundador.
 * READ-ONLY. Correr: node cohorte-superficies-creacion.mjs (o adaptar a MCP).
 * Requiere credenciales admin del proyecto dosfilosapp.
 *
 * Los SEEDS ya traen campo `origin` (wizard | socratic): para ellos la superficie
 * es un hecho, no una inferencia. Los proxies quedan como fallback para los seeds
 * anteriores al campo. Los SERMONES siguen sin `origin` → ahí sí se infiere.
 * Ver caveats abajo.
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'dosfilosapp' });
const db = admin.firestore();

// ===================== PARÁMETROS (el fundador rellena) =====================
// UIDs (Firebase auth uid, NO el email) de las cuentas del fundador/admin que
// probaron todas las superficies. Son VARIAS: el fundador opera con más de una
// cuenta, así que filtrar por una sola deja la otra contaminando el cohorte.
// Lista vacía = sin filtro (conFundador == sinFundador).
const FOUNDER_UIDS = new Set([
    '1xSpGj0kYuZIGUzXHWBQZVVBgeZ2', // rdocerda@gmail.com
    '0bfl5lBk0UXwZGMkqUvQiYHgVPr1', // ricardo@dosfilos.com
]);
const isFounder = (uid) => FOUNDER_UIDS.has(uid);
// PR1 (que estrena genreProvenance) desplegó 2026-07-08. Seeds sin provenance
// creados antes → AMBIGUO (pre-instrumentación).
const PR1_DEPLOY = new Date('2026-07-08T00:00:00Z');
// ============================================================================

const bump = (m, uid) => m.set(uid, (m.get(uid) || 0) + 1);

/** Conteo con y sin las cuentas del fundador + usuarios distintos por versión. */
function summarize(map) {
    let total = 0, totalNoF = 0;
    const users = new Set(), usersNoF = new Set();
    for (const [uid, c] of map) {
        total += c; users.add(uid);
        if (!isFounder(uid)) { totalNoF += c; usersNoF.add(uid); }
    }
    return {
        conFundador: { total, usuariosDistintos: users.size },
        sinFundador: { total: totalNoF, usuariosDistintos: usersNoF.size },
    };
}

/** Distribución por usuario (sin fundador): concentración vs reparto. */
function distribution(map) {
    const arr = [...map.entries()].filter(([u]) => !isFounder(u)).sort((a, b) => b[1] - a[1]);
    const total = arr.reduce((s, [, c]) => s + c, 0);
    return {
        usuariosDistintos: arr.length,
        total,
        top3: arr.slice(0, 3).map(([u, c]) => ({ user: String(u).slice(0, 8) + '…', count: c })),
        // top1/top2 share alto (→1) = concentrado (experimentación); bajo = repartido (patrón).
        concentracion_top1: total ? +(((arr[0]?.[1]) || 0) / total).toFixed(2) : 0,
        concentracion_top2: total ? +((((arr[0]?.[1]) || 0) + ((arr[1]?.[1]) || 0)) / total).toFixed(2) : 0,
    };
}

// ============================ SEEDS (con estudio) ============================
const facultyByUser = new Map();                 // Spine B (instrumentado)
const facultyProvByUser = { aiProposed: new Map(), userConfirmed: new Map(), userOverride: new Map() };
const formWorkedByUser = new Map();              // Spine A form, trabajado
const formAbandonedByUser = new Map();           // Spine A form, abandonado
const legacyByUser = new Map();                  // sin provenance, pre-PR1 (ambiguo)
const seedSermonIds = new Set();

const seedsSnap = await db.collection('pastoralSeeds').get();
seedsSnap.forEach((doc) => {
    const s = doc.data();
    const uid = s?.userId || 'unknown';
    if (s?.sermonId) seedSermonIds.add(s.sermonId);
    const prov = s?.contextGenre?.genreProvenance;
    const createdAt = s?.createdAt?.toDate?.() ?? null;
    const worked = (s?.totalTimeSeconds ?? 0) > 0 || s?.completed === true ||
        (Array.isArray(s?.toolsConsulted) && s.toolsConsulted.length > 0);

    // CAMINO EXACTO: desde el campo `origin` (escrito por el creador) la superficie
    // es un HECHO, no una inferencia. Los proxies de abajo quedan SOLO para los
    // seeds anteriores al campo. El proxy ya mintió una vez — reportó "0 estudios
    // por el wizard" cuando el wizard sí se usaba y solo no instrumentaba.
    if (s?.origin === 'socratic') {
        bump(facultyByUser, uid);
        if (facultyProvByUser[prov]) bump(facultyProvByUser[prov], uid);
        return;
    }
    if (s?.origin === 'wizard') {
        bump(worked ? formWorkedByUser : formAbandonedByUser, uid);
        return;
    }

    if (prov) {
        bump(facultyByUser, uid);
        if (facultyProvByUser[prov]) bump(facultyProvByUser[prov], uid);
    } else if (createdAt && createdAt < PR1_DEPLOY) {
        bump(legacyByUser, uid);
    } else if (worked) {
        bump(formWorkedByUser, uid);
    } else {
        bump(formAbandonedByUser, uid);
    }
});

// ===================== SERMONS (contenido sintético) ========================
const synthByUser = new Map();
const synthPublishedByUser = new Map();
const synthDraftByUser = new Map();
const synthByStatus = { total: 0, published: 0, draft: 0, working: 0, archived: 0, otherStatus: 0 };
const noSeedNonSynthByUser = new Map();

const sermonsSnap = await db.collection('sermons').get();
sermonsSnap.forEach((doc) => {
    const sm = doc.data();
    const id = doc.id;
    const uid = sm?.userId || 'unknown';
    const tags = Array.isArray(sm?.tags) ? sm.tags : [];
    // (Ajuste previo) 'AI Generated' = marcador de CONTENIDO sintético (solo tutor.tsx:91,173 lo escribe).
    const isSynthetic = tags.includes('AI Generated');

    if (isSynthetic) {
        bump(synthByUser, uid);
        synthByStatus.total++;
        const st = sm?.status;
        if (st === 'published') { synthByStatus.published++; bump(synthPublishedByUser, uid); } // se predicó
        else if (st === 'draft') { synthByStatus.draft++; bump(synthDraftByUser, uid); }        // no se predicó
        else if (st === 'working') synthByStatus.working++;
        else if (st === 'archived') synthByStatus.archived++;
        else synthByStatus.otherStatus++;
    }
    if (!seedSermonIds.has(id) && !isSynthetic) bump(noSeedNonSynthByUser, uid); // blank / manual
});

console.log(JSON.stringify({
    PARAMS: {
        FOUNDER_UIDS: FOUNDER_UIDS.size ? [...FOUNDER_UIDS] : '(vacío — sin filtro)',
        PR1_DEPLOY: PR1_DEPLOY.toISOString(),
    },
    totals: { pastoralSeeds: seedsSnap.size, sermons: sermonsSnap.size },

    // Estudios socráticos (Faculty) — única superficie instrumentada:
    FACULTY_SOCRATICO_spineB_instrumentado: {
        ...summarize(facultyByUser),
        porProvenance: {
            aiProposed: summarize(facultyProvByUser.aiProposed),
            userConfirmed: summarize(facultyProvByUser.userConfirmed),
            userOverride: summarize(facultyProvByUser.userOverride),
        },
    },
    // Estudios form del menú (entry 2):
    ESTUDIO_GUIADO_8pasos_form_spineA: {
        trabajado: summarize(formWorkedByUser),
        abandonado: summarize(formAbandonedByUser),
    },
    AMBIGUO_legacy_preP1: summarize(legacyByUser),

    // Contenido sintético (tag AI Generated) × estado, + concentración por usuario:
    SINTETICO_ai_generated: {
        porEstado_crudo: synthByStatus,
        total: summarize(synthByUser),
        publicado_sePredico: summarize(synthPublishedByUser),
        borrador_noSePredico: summarize(synthDraftByUser),
        // (Ajuste 1) ¿SINTÉTICO+PUBLICADO concentrado en 1-2 users (experimentación)
        // o repartido (patrón)? — sin fundador:
        concentracion_publicado_sinFundador: distribution(synthPublishedByUser),
    },

    // Sermones sin estudio y sin tag sintético → blank / creado a mano:
    SIN_ESTUDIO_ni_sintetico: summarize(noSeedNonSynthByUser),

    CAVEATS: [
        'PARTICIÓN EXACTA cuando el seed trae `origin` (wizard | socratic): es el campo que escribe el creador, no una inferencia. Los proxies de abajo aplican SOLO a seeds anteriores a ese campo.',
        'genreProvenance solo existe post-PR1 (2026-07-08); seeds sin provenance pre-deploy → AMBIGUO_legacy_preP1 (Spine B pre-instrumentación o Spine A form).',
        "'AI Generated' es marcador de CONTENIDO sintético, no de superficie. Solo tutor.tsx (91,173) lo escribe → hoy sintético = tutor-producido; el conteo mide contenido sintético (la métrica buscada).",
        'FOUNDER_UIDS vacío → conFundador == sinFundador (sin filtro). El fundador opera con VARIAS cuentas; filtrar por una sola deja la otra contaminando el cohorte.',
        'Concentración: top1/top2 share alto (→1) = concentrado en pocos users (experimentación); bajo = repartido (patrón de uso).',
        'FIX de raiz para superficie exacta: campo seed.origin / sermon.origin en creación (separado de la métrica de contenido).',
    ],
}, null, 2));
process.exit(0);
