import type { GreekWordToken } from './morphGntToken';

/**
 * Una pista de reconocimiento: la MARCA visible en la forma y la clave i18n
 * que la explica. El id es estable; la UI traduce.
 */
export interface GreekRecognitionClue {
    readonly id: string;
    /** La marca tal como se cita ("-ειν", "ε-", "-σα-"). */
    readonly marker: string;
}

/** Sin acentos, espíritus ni puntuación: para buscar marcas en la forma. */
function normalizar(texto: string): string {
    return texto
        .normalize('NFD')
        .replace(/[̀-ͯ̓̔͂ͅ]/g, '')
        .replace(/[^Ͱ-Ͽἀ-῿]/gu, '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/ς/g, 'σ');
}

/**
 * CÓMO SE RECONOCE lo que MorphGNT ya determinó — las "pistas de
 * reconocimiento" del hebreo, para el griego.
 *
 * EXPLICA HACIA ATRÁS, NO ANALIZA HACIA ADELANTE. El análisis ya está (el
 * dataset lo anota palabra por palabra); este catálogo sólo CONFIRMA en la
 * superficie las marcas que ese análisis predice: la terminación -ειν del
 * infinitivo presente activo, el -σα- del aoristo sigmático, el aumento ε-.
 *
 * LA REGLA DE HONESTIDAD: si la marca esperada NO aparece en la forma (verbo
 * irregular, aoristo segundo sin σ), la pista SE OMITE en vez de inventarse.
 * Una pista falsa en pedagogía es veneno — el pastor la buscaría en el texto
 * y no estaría. Por eso esto es un catálogo determinista y no un modelo: un
 * modelo puede "ver" un aumento donde no lo hay.
 */
export function greekRecognitionClues(token: GreekWordToken): GreekRecognitionClue[] {
    if (token.pos !== 'V') return [];
    const { tag } = token;
    const forma = normalizar(token.text);
    const pistas: GreekRecognitionClue[] = [];
    const confirmar = (id: string, marker: string, presente: boolean) => {
        if (presente) pistas.push({ id, marker });
    };

    // ── Infinitivos: la terminación LO ES todo ─────────────────────────
    if (tag.mood === 'N') {
        if (tag.tense === 'P' && tag.voice === 'A') confirmar('infPresActive', '-ειν', forma.endsWith('ειν'));
        if (tag.tense === 'P' && tag.voice !== 'A') confirmar('infPresMedio', '-εσθαι', forma.endsWith('εσθαι'));
        if (tag.tense === 'A' && tag.voice === 'A') confirmar('infAorActive', '-σαι', forma.endsWith('σαι'));
        if (tag.tense === 'A' && tag.voice === 'M') confirmar('infAorMedio', '-σασθαι', forma.endsWith('σασθαι'));
        if (tag.tense === 'A' && tag.voice === 'P') confirmar('infAorPasivo', '-θῆναι', forma.endsWith('θηναι') || forma.endsWith('ηναι'));
        if (tag.tense === 'X' && tag.voice === 'A') confirmar('infPerfActive', '-κέναι', forma.endsWith('κεναι'));
    }

    // ── Marcadores de tiempo ───────────────────────────────────────────
    if (tag.tense === 'A' && tag.voice !== 'P') {
        confirmar('aoristoSigmatico', '-σα-', /σα/.test(forma));
    }
    if (tag.tense === 'A' && tag.voice === 'P') {
        confirmar('aoristoPasivo', '-θη-', /θη/.test(forma));
    }
    if (tag.tense === 'F') {
        confirmar('futuroSigma', '-σ-', /σ/.test(forma));
    }
    if (tag.tense === 'X' || tag.tense === 'Y') {
        // Reduplicación: primera consonante repetida con ε (λέλυκα, γέγονεν).
        const redup = forma.length > 2 && forma[1] === 'ε' && forma[0] === forma[2];
        confirmar('reduplicacion', `${token.text[0]}ε-`, redup);
        if (tag.voice === 'A') confirmar('perfectoKappa', '-κ-', /κ/.test(forma));
    }
    // Aumento: sólo en indicativo de tiempos secundarios.
    if (tag.mood === 'I' && (tag.tense === 'I' || tag.tense === 'A' || tag.tense === 'Y')) {
        confirmar('aumento', 'ε-', /^[εη]/.test(forma));
    }

    // ── Marcadores de modo ─────────────────────────────────────────────
    if (tag.mood === 'D' && tag.person === '2' && tag.number === 'P') {
        if (tag.voice === 'A') confirmar('impvActPl', '-τε', forma.endsWith('τε'));
        else confirmar('impvMedPl', '-σθε', forma.endsWith('σθε'));
    }
    if (tag.mood === 'S') {
        // La vocal temática ALARGADA (ω/η) es la firma del subjuntivo.
        confirmar('subjuntivoVocalLarga', 'ω/η', /(ω|η)(?:ς|τε|μεν|νται|ται|σι|σιν)?$/.test(forma));
    }
    if (tag.mood === 'P') {
        if (tag.voice !== 'A') confirmar('participioMedio', '-μεν-', /μεν/.test(forma));
        else if (tag.tense === 'A' && tag.voice === 'A') confirmar('participioAorAct', '-σα-/-ντ-', /σα|ντ/.test(forma));
        else confirmar('participioActivo', '-ντ-/-ων/-ουσα', /ντ|ων$|ουσ/.test(forma));
    }

    return pistas;
}
