import type { GreekWordToken } from './morphGntToken';
import { greekRecognitionClues } from './greekRecognitionClues';

/** La función del morfema, para la capa de color. */
export type GreekMorphLayer = 'stem' | 'caseEnding' | 'tenseMarker' | 'moodMarker' | 'augment';

export interface GreekWordSegment {
    readonly text: string;
    readonly layer: GreekMorphLayer;
}

/**
 * Qué capa pinta cada pista, y CÓMO se busca su marca en la forma.
 * Derivado de los ids de `greekRecognitionClues`: la detección vive allá —
 * acá sólo se segmenta lo que aquel motor YA confirmó.
 */
const SEGMENTACION: Record<string, { layer: GreekMorphLayer; how: 'suffix' | 'infix' | 'prefix'; find: string[] }> = {
    // Infinitivos: la terminación es marca de modo.
    infPresActive: { layer: 'moodMarker', how: 'suffix', find: ['ειν'] },
    infPresMedio: { layer: 'moodMarker', how: 'suffix', find: ['εσθαι'] },
    infAorActive: { layer: 'moodMarker', how: 'suffix', find: ['σαι'] },
    infAorMedio: { layer: 'moodMarker', how: 'suffix', find: ['σασθαι'] },
    infAorPasivo: { layer: 'moodMarker', how: 'suffix', find: ['θηναι', 'ηναι'] },
    infPerfActive: { layer: 'moodMarker', how: 'suffix', find: ['κεναι'] },
    // Tiempo.
    aoristoSigmatico: { layer: 'tenseMarker', how: 'infix', find: ['σα'] },
    aoristoPasivo: { layer: 'tenseMarker', how: 'infix', find: ['θη'] },
    futuroSigma: { layer: 'tenseMarker', how: 'infix', find: ['σ'] },
    perfectoKappa: { layer: 'tenseMarker', how: 'infix', find: ['κ'] },
    aumento: { layer: 'augment', how: 'prefix', find: ['ε', 'η'] },
    // Modo.
    impvActPl: { layer: 'moodMarker', how: 'suffix', find: ['τε'] },
    impvMedPl: { layer: 'moodMarker', how: 'suffix', find: ['σθε'] },
    participioMedio: { layer: 'moodMarker', how: 'infix', find: ['μεν'] },
    // Declinación nominal.
    nomSgOs: { layer: 'caseEnding', how: 'suffix', find: ['οσ'] },
    genSgOu: { layer: 'caseEnding', how: 'suffix', find: ['ου'] },
    genSg1: { layer: 'caseEnding', how: 'suffix', find: ['ησ', 'ασ'] },
    genPlOn: { layer: 'caseEnding', how: 'suffix', find: ['ων'] },
    datPl: { layer: 'caseEnding', how: 'suffix', find: ['αισ', 'οισ'] },
    accSgN: { layer: 'caseEnding', how: 'suffix', find: ['ον', 'αν', 'ην'] },
    accPl: { layer: 'caseEnding', how: 'suffix', find: ['ουσ', 'ασ'] },
    nomPl: { layer: 'caseEnding', how: 'suffix', find: ['οι', 'αι'] },
};

/** base sin diacríticos de UN carácter griego, para comparar posiciones. */
function baseDe(ch: string): string {
    return ch
        .normalize('NFD')
        .replace(/[̀-ͯ̓̔͂ͅ]/g, '')
        .normalize('NFC')
        .toLowerCase()
        .replace('ς', 'σ');
}

/**
 * SEGMENTA la palabra donde las pistas YA CONFIRMARON una marca — para la
 * capa visual de morfemas (χαίρ|ειν, θε|οῦ, ἡγή|σα|σθε).
 *
 * El reto es que la detección corre sin acentos y la pantalla los lleva:
 * se recorre la superficie carácter a carácter alineando por su base. Y la
 * honestidad heredada: una palabra irregular sin marca confirmada queda
 * ENTERA como raíz — jamás un segmento inventado.
 */
export function segmentGreekWord(token: GreekWordToken): GreekWordSegment[] {
    // Superficie sin puntuación final (se re-adjunta al último segmento).
    const m = token.text.match(/^(.*?)([.,·;:]*)$/u);
    const superficie = m?.[1] ?? token.text;
    const puntuacion = m?.[2] ?? '';
    const chars = [...superficie];
    const bases = chars.map(baseDe);

    // Marcas por posición (capas no solapadas; la primera en reclamar gana).
    const capaPorChar: (GreekMorphLayer | null)[] = chars.map(() => null);
    const reclamar = (desde: number, hasta: number, layer: GreekMorphLayer) => {
        for (let i = desde; i < hasta; i++) {
            if (capaPorChar[i] !== null) return false;
        }
        for (let i = desde; i < hasta; i++) capaPorChar[i] = layer;
        return true;
    };

    for (const pista of greekRecognitionClues(token)) {
        const seg = SEGMENTACION[pista.id];
        if (!seg) continue;
        for (const marca of seg.find) {
            const objetivo = [...marca];
            const n = objetivo.length;
            let desde = -1;
            if (seg.how === 'suffix') {
                if (bases.slice(-n).join('') === marca) desde = chars.length - n;
            } else if (seg.how === 'prefix') {
                if (bases.slice(0, n).join('') === marca) desde = 0;
            } else {
                // Infijo: la ÚLTIMA ocurrencia antes de la terminación — los
                // marcadores de tiempo viven pegados a ella (ἡγή-σα-σθε).
                for (let i = chars.length - n; i >= 0; i--) {
                    if (bases.slice(i, i + n).join('') === marca) {
                        desde = i;
                        break;
                    }
                }
            }
            if (desde >= 0 && reclamar(desde, desde + n, seg.layer)) break;
        }
    }

    // Compactar en segmentos contiguos.
    const out: GreekWordSegment[] = [];
    for (let i = 0; i < chars.length; i++) {
        const layer = capaPorChar[i] ?? 'stem';
        const prev = out[out.length - 1];
        if (prev && prev.layer === layer) {
            out[out.length - 1] = { text: prev.text + chars[i], layer };
        } else {
            out.push({ text: chars[i] ?? '', layer });
        }
    }
    const ultimo = out[out.length - 1];
    if (puntuacion && ultimo) {
        out[out.length - 1] = { text: ultimo.text + puntuacion, layer: ultimo.layer };
    }
    return out;
}
