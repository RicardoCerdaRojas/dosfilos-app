/**
 * Repara lo que la lectura ingenua de un PDF le hace a las palabras.
 *
 * `pdf-parse` lee la página en el orden en que los objetos están en el
 * archivo, no en el orden en que se leen. En una página de aparato
 * crítico —texto al centro, números de versículo al margen,
 * referencias cruzadas en otra columna— eso produce dos daños que
 * dejan la palabra fuera de toda búsqueda:
 *
 *   1. La palabra cortada por el guion de fin de línea se queda
 *      partida: `ἔρ- χεται`. Buscar `ἔρχεται` no la encuentra.
 *   2. El número marginal se pega a la palabra siguiente: `3ΚΑΤΑ`,
 *      `6Καὶ`, `0Πολλὰ`.
 *
 * Medido sobre el NA28 recién ingresado: 869 palabras partidas y 2.445
 * pegadas a un número, sobre 33.638 palabras griegas de la muestra. Una
 * de cada diez apariciones perdida — y no por codificación, que estaba
 * sana, sino por maquetación.
 *
 * **Lo que NO hace, a propósito.** No toca los guiones que pertenecen a
 * la palabra: `Nestle-Aland`, `Hebreo-Arameo-Español`. La regla exige
 * que después del guion venga un espacio y que la continuación empiece
 * en minúscula, que es la firma del corte de línea y no la del
 * compuesto. Y separa dígitos sólo de letras GRIEGAS o HEBREAS: en el
 * aparato, `565s` y `f 1.13` son siglas donde meter un espacio cambia
 * el testimonio.
 */

export interface LayoutRepairReport {
    /** Palabras que estaban partidas por un guion de fin de línea. */
    hyphenJoins: number;
    /** Números que estaban pegados a una palabra griega o hebrea. */
    digitSplits: number;
}

export interface RepairedText {
    text: string;
    report: LayoutRepairReport;
}

/** Letras que pueden empezar la continuación de una palabra cortada. */
const CONTINUACION = 'a-záéíóúüñ\\u03b1-\\u03c9\\u1f00-\\u1fff';
/** Fin de la primera mitad: cualquier letra latina o griega. */
const ANTES_DEL_GUION = 'A-Za-záéíóúüñÁÉÍÓÚÜÑ\\u0370-\\u03ff\\u1f00-\\u1fff';

/**
 * Une la palabra cortada por el guion de fin de línea.
 *
 * Cubre también el caso en que un número marginal se coló EN MEDIO del
 * corte —`αὐ- 21 τοὺς`—: el número no se descarta, se mueve delante de
 * la palabra ya unida, porque es el número de versículo y perderlo
 * costaría la referencia.
 */
const PALABRA_PARTIDA = new RegExp(
    // La primera mitad se captura ENTERA (`+`, no un solo carácter): el
    // número marginal se antepone a la palabra reunida, y con un solo
    // carácter se colaba dentro —`αὐ- 21 τοὺς` daba `α 21 ὐτοὺς`—.
    `([${ANTES_DEL_GUION}]+)-[ \\t]*\\n?[ \\t]*(\\d+[ \\t]+)?([${CONTINUACION}])`,
    'gu',
);

/** Dígito pegado a letra griega o hebrea, en cualquiera de los dos órdenes. */
const DIGITO_PEGADO_ANTES = /(\d)([Ͱ-Ͽἀ-῿֐-׿])/gu;
const DIGITO_PEGADO_DESPUES = /([Ͱ-Ͽἀ-῿֐-׿])(\d)/gu;

export function repairExtractedLayout(input: string): RepairedText {
    if (!input) return { text: input ?? '', report: { hyphenJoins: 0, digitSplits: 0 } };

    let hyphenJoins = 0;
    let text = input.replace(PALABRA_PARTIDA, (_m, antes, numero, despues) => {
        hyphenJoins++;
        // El número marginal se antepone a la palabra reunida.
        return numero ? `${numero.trim()} ${antes}${despues}` : `${antes}${despues}`;
    });

    let digitSplits = 0;
    const contar = () => { digitSplits++; };
    text = text.replace(DIGITO_PEGADO_ANTES, (_m, d, letra) => { contar(); return `${d} ${letra}`; });
    text = text.replace(DIGITO_PEGADO_DESPUES, (_m, letra, d) => { contar(); return `${letra} ${d}`; });

    return { text, report: { hyphenJoins, digitSplits } };
}

/** Resumen de una línea para logs, o `null` si no hubo nada que reparar. */
export function describeLayoutRepair(report: LayoutRepairReport): string | null {
    const partes: string[] = [];
    if (report.hyphenJoins > 0) partes.push(`${report.hyphenJoins} palabra(s) reunida(s)`);
    if (report.digitSplits > 0) partes.push(`${report.digitSplits} número(s) despegado(s)`);
    return partes.length > 0 ? partes.join(' · ') : null;
}
