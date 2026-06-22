/**
 * ADR-035 — corpus dorado del perfil del pasaje (lado DETECCIÓN).
 *
 * Casos de referencia con su set de features esperado. Cumplen dos roles:
 *  1. Regresión de `assemblePassageProfile` + catálogo (corre en CI).
 *  2. Conjunto contra el que el shadow (PR1) mide la precisión del detector LLM
 *     antes del flip a enforce (corte 1: features `hard` con ancla válida ≥90 %).
 *
 * El lado ENGAGEMENT del corpus (fixture A/B/C/D de CA1, para `common-misreading`)
 * llega en PR2 con el detector de engagement.
 */

import type { LiteraryGenre } from '../../exegesis/expository/BookPanorama';
import type { RawPassageProfile } from '../PassageProfile';

export interface GoldenProfileCase {
    /** Nombre legible del caso. */
    name: string;
    passage: string;
    /** Géneros deterministas (los que daría `inferGenreFromBook`). */
    genres: LiteraryGenre[];
    /** Salida cruda esperada del detector (pre-filtro de anclas). */
    raw: RawPassageProfile;
    /** Cuántas features deberían SOBREVIVIR el filtro anti-alucinación. */
    expectedAnchoredFeatures: number;
    expectedMovements: number;
}

/**
 * Caso disparador del diseño. Epístola densa: alusiones AT (Balaam, perro/vómito
 * = Prov 26:11), 3 movimientos, lectura errónea "se pierde la salvación".
 */
const SECOND_PETER: GoldenProfileCase = {
    name: '2 Pedro 2:10-22 (epístola densa)',
    passage: '2 Pedro 2:10-22',
    genres: ['epistle'],
    raw: {
        passage: '2 Pedro 2:10-22',
        movements: [
            { reference: '2 Pedro 2:10-16', summary: 'acusación a los falsos maestros (Balaam)' },
            { reference: '2 Pedro 2:17-19', summary: 'su vacío: fuentes sin agua, falsa libertad' },
            { reference: '2 Pedro 2:20-22', summary: 'fin peor + proverbios (perro/cerda)' },
        ],
        features: [
            {
                typeKey: 'ot-allusion',
                hays: 'allusion',
                verseRef: 'v.15-16',
                summary: 'el camino de Balaam hijo de Beor, que amó el premio de la maldad',
                anchor: { reference: 'Números 22-24', note: 'Balaam y la asna que habló' },
            },
            {
                typeKey: 'ot-allusion',
                hays: 'allusion',
                verseRef: 'v.22',
                summary: 'el perro vuelve a su vómito',
                anchor: { reference: 'Proverbios 26:11' },
            },
            {
                typeKey: 'common-misreading',
                verseRef: 'v.20-22',
                claim: 'el pasaje enseña que un creyente puede perder la salvación',
                whyWrong:
                    'describe falsos maestros que apostatan; v.22 muestra que la naturaleza nunca cambió (perro/cerda)',
                correctiveAnchor: [
                    { reference: 'v.22', note: 'la naturaleza del animal nunca cambió' },
                    { reference: 'Juan 10:28-29' },
                ],
            },
            {
                typeKey: 'illustration',
                verseRef: 'v.17',
                summary: 'fuentes sin agua y nubes empujadas por la tormenta',
            },
            {
                typeKey: 'illustration',
                verseRef: 'v.22',
                summary: 'el perro vuelve a su vómito y la cerda lavada al lodo',
            },
        ],
    },
    expectedAnchoredFeatures: 5,
    expectedMovements: 3,
};

/**
 * Contraste: poesía corta. El perfil NO infla alusiones AT inexistentes; carga
 * el foco en otra parte (paralelismo/metáfora, features de v1.1). Aquí solo la
 * lectura errónea de prosperidad tiene ancla en v1.
 */
const PSALM_23: GoldenProfileCase = {
    name: 'Salmo 23 (poesía corta)',
    passage: 'Salmo 23',
    genres: ['poetry'],
    raw: {
        passage: 'Salmo 23',
        movements: [
            { reference: 'Salmo 23:1-4', summary: 'metáfora del pastor' },
            { reference: 'Salmo 23:5-6', summary: 'metáfora del anfitrión (mesa, copa, casa)' },
        ],
        features: [
            {
                typeKey: 'common-misreading',
                verseRef: 'v.1',
                claim: '"nada me faltará" promete prosperidad material',
                whyWrong: 'el pastor provee para el camino, que en v.4 pasa por el valle de muerte; no es opulencia',
                correctiveAnchor: [{ reference: 'v.4', note: 'valle de sombra de muerte' }],
            },
        ],
    },
    expectedAnchoredFeatures: 1,
    expectedMovements: 2,
};

/**
 * Caso CROSS-CHAPTER (cruza frontera de capítulo): Juan 1:43-2:11 (llamado de
 * Natanael → bodas de Caná). Prueba que el perfil trata un pasaje grande que
 * cruza capítulos — el canonical analyzer académico rechaza esto; el resolver
 * del perfil (RVR1960Repository.getVerses) lo lee. Movimientos a ambos lados de
 * la frontera 1→2.
 */
const JOHN_CROSS_CHAPTER: GoldenProfileCase = {
    name: 'Juan 1:43-2:11 (cruza frontera de capítulo)',
    passage: 'Juan 1:43-2:11',
    genres: ['gospel'],
    raw: {
        passage: 'Juan 1:43-2:11',
        movements: [
            { reference: 'Juan 1:43-51', summary: 'llamado de Felipe y Natanael' },
            { reference: 'Juan 2:1-11', summary: 'la primera señal: bodas de Caná' },
        ],
        features: [
            {
                typeKey: 'ot-allusion',
                hays: 'allusion',
                verseRef: 'v.1:51',
                summary: 'los ángeles que suben y descienden sobre el Hijo del Hombre',
                anchor: { reference: 'Génesis 28:12', note: 'la escalera de Jacob en Betel' },
            },
        ],
    },
    expectedAnchoredFeatures: 1,
    expectedMovements: 2,
};

export const GOLDEN_PASSAGE_PROFILES: readonly GoldenProfileCase[] = [
    SECOND_PETER,
    PSALM_23,
    JOHN_CROSS_CHAPTER,
];
