import type { GreekCase } from './morphGntToken';

/**
 * LAS PREPOSICIONES Y EL CASO QUE RIGEN — catálogo determinista.
 *
 * Es la pedagogía más rentable del griego y no requiere modelo: EL SENTIDO DE
 * UNA PREPOSICIÓN CAMBIA SEGÚN EL CASO de su término. διά con genitivo es "a
 * través de"; con acusativo, "a causa de" — dos ideas distintas con la misma
 * palabra. Un pastor que no lo sabe lee "por" en ambas y pierde la
 * diferencia entre el medio y el motivo.
 *
 * El caso del término lo sabemos del dataset, así que la tabla se cierra
 * sola: la preposición dice qué casos admite, y el token siguiente dice cuál
 * es. Sin preguntarle nada a nadie.
 *
 * Glosas breves y en español latinoamericano — no reemplazan al léxico, pero
 * fijan la distinción que el caso introduce.
 */
export interface PrepositionSense {
    readonly case: GreekCase;
    /** Sentido que la preposición toma CON ese caso. */
    readonly gloss: string;
}

export const PREPOSITION_CASES: Record<string, readonly PrepositionSense[]> = {
    // Un solo caso.
    ἐν: [{ case: 'D', gloss: 'en, dentro de, por medio de' }],
    εἰς: [{ case: 'A', gloss: 'hacia, a, para (movimiento o finalidad)' }],
    ἐκ: [{ case: 'G', gloss: 'de dentro de, desde (origen)' }],
    ἀπό: [{ case: 'G', gloss: 'desde, de parte de (separación)' }],
    πρό: [{ case: 'G', gloss: 'antes de, delante de' }],
    σύν: [{ case: 'D', gloss: 'junto con' }],
    ἄνευ: [{ case: 'G', gloss: 'sin' }],
    ἐνώπιον: [{ case: 'G', gloss: 'delante de, en presencia de' }],
    ἕνεκα: [{ case: 'G', gloss: 'a causa de, por amor a' }],
    ἀντί: [{ case: 'G', gloss: 'en lugar de, a cambio de' }],
    // Dos o tres casos — acá está la lección.
    διά: [
        { case: 'G', gloss: 'a través de, por medio de (el MEDIO)' },
        { case: 'A', gloss: 'a causa de, por (el MOTIVO)' },
    ],
    κατά: [
        { case: 'G', gloss: 'contra, hacia abajo desde' },
        { case: 'A', gloss: 'según, conforme a, a lo largo de' },
    ],
    μετά: [
        { case: 'G', gloss: 'con, en compañía de' },
        { case: 'A', gloss: 'después de' },
    ],
    περί: [
        { case: 'G', gloss: 'acerca de, respecto a' },
        { case: 'A', gloss: 'alrededor de' },
    ],
    ὑπέρ: [
        { case: 'G', gloss: 'a favor de, en lugar de' },
        { case: 'A', gloss: 'por encima de, más que' },
    ],
    ὑπό: [
        { case: 'G', gloss: 'por (agente de la pasiva)' },
        { case: 'A', gloss: 'debajo de' },
    ],
    παρά: [
        { case: 'G', gloss: 'de parte de' },
        { case: 'D', gloss: 'junto a, en presencia de' },
        { case: 'A', gloss: 'al lado de, contra' },
    ],
    πρός: [
        { case: 'G', gloss: 'en favor de' },
        { case: 'D', gloss: 'cerca de, junto a' },
        { case: 'A', gloss: 'hacia, con miras a' },
    ],
    ἐπί: [
        { case: 'G', gloss: 'sobre, en tiempo de' },
        { case: 'D', gloss: 'sobre, con base en' },
        { case: 'A', gloss: 'sobre, hacia, contra' },
    ],
};

export interface PrepositionUsage {
    /** El sentido que aplica, según el caso del término. */
    readonly active?: PrepositionSense;
    /** Los otros casos que admite — la lección del contraste. */
    readonly alternatives: readonly PrepositionSense[];
}

/**
 * Qué sentido toma esta preposición con el caso de su término, y con qué
 * otros contrasta. `null` cuando el lema no está en el catálogo — mejor no
 * decir nada que inventar un régimen.
 */
export function prepositionUsage(lemma: string, objectCase?: GreekCase): PrepositionUsage | null {
    const sentidos = PREPOSITION_CASES[lemma.normalize('NFC')];
    if (!sentidos) return null;
    const active = objectCase ? sentidos.find((s) => s.case === objectCase) : undefined;
    return { active, alternatives: sentidos.filter((s) => s !== active) };
}
