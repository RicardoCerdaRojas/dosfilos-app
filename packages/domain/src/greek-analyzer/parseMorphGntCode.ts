import type {
    GreekMorphTag,
    GreekPos,
} from './morphGntToken';

const POS_VALIDOS = new Set(['N', 'V', 'A', 'D', 'P', 'C', 'X', 'I', 'RA', 'RP', 'RR', 'RD', 'RI']);

/**
 * La columna `pos` de MorphGNT: dos caracteres, el segundo suele ser `-`
 * ("N-", "V-") salvo en los pronombres y el artículo ("RA", "RP"…).
 */
export function parseMorphGntPos(raw: string): GreekPos | undefined {
    const limpio = raw.endsWith('-') ? raw.slice(0, -1) : raw;
    return POS_VALIDOS.has(limpio) ? (limpio as GreekPos) : undefined;
}

/**
 * El código de parsing de MorphGNT: OCHO posiciones fijas, `-` cuando no
 * aplica. En orden: persona, tiempo, voz, modo, caso, número, género, grado.
 *
 * Ejemplos reales de Santiago 1: `----NSM-` (Ἰάκωβος — nominativo singular
 * masculino), `2AMD-P--` (ἡγήσασθε — 2ª aoristo media imperativo plural),
 * `-PAN----` (χαίρειν — presente activa infinitivo).
 *
 * NO VALIDA COMBINACIONES: MorphGNT es la fuente de verdad y este parser sólo
 * la transcribe. Rechazar una combinación "imposible" acá sería corregirle la
 * plana al dataset con menos información que él.
 */
export function parseMorphGntParsing(raw: string): GreekMorphTag {
    const en = (i: number) => (raw[i] && raw[i] !== '-' ? raw[i] : undefined);
    return {
        person: en(0) as GreekMorphTag['person'],
        tense: en(1) as GreekMorphTag['tense'],
        voice: en(2) as GreekMorphTag['voice'],
        mood: en(3) as GreekMorphTag['mood'],
        case: en(4) as GreekMorphTag['case'],
        number: en(5) as GreekMorphTag['number'],
        gender: en(6) as GreekMorphTag['gender'],
        degree: en(7) as GreekMorphTag['degree'],
    };
}
