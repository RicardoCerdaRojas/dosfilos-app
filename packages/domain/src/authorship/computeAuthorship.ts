/**
 * Cuánto del sermón publicado lo escribió EL PASTOR.
 *
 * Implementa el principio P2 —"la IA desarrolla, no origina"— convirtiéndolo en
 * un número que el pastor ve antes de subir al púlpito.
 *
 * DECISIONES DE PRODUCTO (fundador, 2026-08-24), porque la spec de Fase 4 decía
 * "gate publish ≥50% verbatim" sin definir de quién, y "verbatim" admite las dos
 * lecturas opuestas:
 *
 * 1. SE MIDE LO QUE ES SUYO, no lo que quedó intacto de la máquina. Mismo dato,
 *    lectura invertida — pero un número que CRECE cuando el pastor trabaja menos
 *    se lee como acusación. Éste premia su trabajo.
 * 2. LA REFERENCIA ES LA ÚLTIMA GENERACIÓN, no la primera. Mide "desde lo último
 *    que recibí, ¿cuánto puse yo?". Regenerar resetea el contador, y eso es
 *    honesto: si pidió texto nuevo, su trabajo anterior sobre ese párrafo ya no
 *    está en el sermón.
 * 3. CONFRONTA, NO BLOQUEA. El gate avisa y pide nota; nunca impide publicar.
 *    Precedente directo: el contra-scan (ADR-033) y ADR-027.
 */

/** Piso por defecto: la mitad del sermón debería ser del pastor. */
export const AUTHORSHIP_FLOOR = 0.5;

/** Nota mínima cuando el pastor publica por debajo del piso. */
export const AUTHORSHIP_OVERRIDE_MIN_CHARS = 100;

export interface SectionAuthorship {
    sectionId: string;
    /** 0-1 — proporción del texto final que NO venía de la generación. */
    pastorRatio: number;
    /** Palabras del texto final. Da peso a la sección en el total. */
    words: number;
    /**
     * `true` cuando no hay generación de referencia: el pastor lo escribió desde
     * cero, o la sección es anterior a que se guardara la referencia. Cuenta
     * como suyo, pero se marca — un 100% sin referencia no es lo mismo que un
     * 100% medido.
     */
    withoutBaseline: boolean;
}

export interface AuthorshipReport {
    bySection: SectionAuthorship[];
    /** 0-1 ponderado por palabras: una sección larga pesa más que una corta. */
    overall: number;
    floor: number;
    /** `confront` cuando cae bajo el piso — nunca bloquea, sólo confronta. */
    gateStatus: 'pass' | 'confront';
}

/**
 * Palabras significativas, normalizadas.
 *
 * Se ignoran mayúsculas, acentos y puntuación: cambiar "Dios habla." por "dios
 * habla" no es autoría, es tipeo, y contarlo inflaría el número del pastor sin
 * que haya escrito nada. También se quita el marcado markdown, que el generador
 * pone y el pastor rara vez toca.
 */
function palabras(texto: string): string[] {
    return (texto ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[*_`#>\[\]()]/g, ' ')
        .toLowerCase()
        .split(/[^a-z0-9áéíóúñ]+/i)
        .filter((w) => w.length > 0);
}

/** Tope de celdas del DP. Por encima, no se marca y se degrada a conservador. */
const MAX_CELDAS = 25_000_000;

/**
 * MARCA, palabra por palabra, cuáles del final vienen de `base`.
 *
 * No basta con el LARGO de la subsecuencia común: para separar "esto lo trajo
 * el generador" de "esto es mío y el generador sólo lo transcribió" hay que
 * saber QUÉ palabras coinciden, no cuántas. Por eso el DP guarda direcciones y
 * se reconstruye el camino.
 *
 * Sobre el tope devuelve todo en `false`: preferimos NO marcar —y contar el
 * texto como del generador— antes que inventar una atribución. Un medidor que
 * regala autoría es peor que uno que la escatima.
 */
function marcarArrastradas(base: readonly string[], final: readonly string[]): boolean[] {
    const marcas = new Array<boolean>(final.length).fill(false);
    if (base.length === 0 || final.length === 0) return marcas;
    if (base.length * final.length > MAX_CELDAS) return marcas;

    const filas = base.length + 1;
    const cols = final.length + 1;
    const dp = new Int32Array(filas * cols);
    for (let i = 1; i < filas; i++) {
        for (let j = 1; j < cols; j++) {
            dp[i * cols + j] = base[i - 1] === final[j - 1]
                ? (dp[(i - 1) * cols + (j - 1)] ?? 0) + 1
                : Math.max(dp[(i - 1) * cols + j] ?? 0, dp[i * cols + (j - 1)] ?? 0);
        }
    }
    let i = base.length;
    let j = final.length;
    while (i > 0 && j > 0) {
        if (base[i - 1] === final[j - 1]) {
            marcas[j - 1] = true;
            i--;
            j--;
        } else if ((dp[(i - 1) * cols + j] ?? 0) >= (dp[i * cols + (j - 1)] ?? 0)) {
            i--;
        } else {
            j--;
        }
    }
    return marcas;
}

/**
 * Autoría de UNA sección.
 *
 * Sin referencia el texto es del pastor por construcción: no hubo generación de
 * la que copiar.
 */
export function computeSectionAuthorship(
    sectionId: string,
    baseline: string | undefined,
    final: string,
    pastorMaterial?: string,
): SectionAuthorship {
    const finales = palabras(final);
    if (finales.length === 0) {
        return { sectionId, pastorRatio: 0, words: 0, withoutBaseline: !baseline };
    }
    if (!baseline?.trim()) {
        return { sectionId, pastorRatio: 1, words: finales.length, withoutBaseline: true };
    }

    const delGenerador = marcarArrastradas(palabras(baseline), finales);
    // SU MATERIAL CUENTA COMO SUYO AUNQUE LO HAYA EMITIDO EL GENERADOR.
    //
    // El diseño original medía el final contra TODO lo generado, asumiendo que
    // el borrador no contenía nada del pastor. Esa suposición dejó de ser cierta
    // cuando el generador empezó a transcribir su ilustración verbatim, sus
    // aplicaciones, sus directivas, su proposición y sus títulos de puntos.
    //
    // El resultado era que un sermón construido sobre su estudio de ocho pasos
    // marcaba "0% tuyo" recién generado — desmoralizando justo cuando el pastor
    // hizo bien el trabajo. El generador no originó ese texto: lo transcribió.
    const deSuMaterial = pastorMaterial?.trim()
        ? marcarArrastradas(palabras(pastorMaterial), finales)
        : null;

    let suyas = 0;
    for (let i = 0; i < finales.length; i++) {
        // Suya si la escribió después (no viene del generador) o si el
        // generador la tomó de su propio material.
        if (!delGenerador[i] || deSuMaterial?.[i]) suyas++;
    }

    return {
        sectionId,
        pastorRatio: Math.max(0, Math.min(1, suyas / finales.length)),
        words: finales.length,
        withoutBaseline: false,
    };
}

/**
 * El informe del sermón completo.
 *
 * PONDERADO POR PALABRAS, no promedio simple: una conclusión de 40 palabras
 * reescrita entera no puede compensar un cuerpo de 2000 sin tocar. El promedio
 * simple daría 50% en ese caso, y sería una mentira favorable.
 *
 * Las secciones VACÍAS no entran: no aportan texto y arrastrarían el promedio.
 */
export function computeAuthorship(
    baselines: Readonly<Record<string, string>>,
    finals: Readonly<Record<string, string>>,
    floor: number = AUTHORSHIP_FLOOR,
    /** Todo lo que el pastor aportó en el estudio y la homilética. */
    pastorMaterial?: string,
): AuthorshipReport {
    const bySection = Object.keys(finals)
        .map((id) => computeSectionAuthorship(id, baselines[id], finals[id] ?? '', pastorMaterial))
        .filter((s) => s.words > 0);

    const total = bySection.reduce((n, s) => n + s.words, 0);
    const overall = total === 0
        ? 0
        : bySection.reduce((n, s) => n + s.pastorRatio * s.words, 0) / total;

    return {
        bySection,
        overall,
        floor,
        // Sin texto todavía no hay nada que confrontar.
        gateStatus: total === 0 || overall >= floor ? 'pass' : 'confront',
    };
}
