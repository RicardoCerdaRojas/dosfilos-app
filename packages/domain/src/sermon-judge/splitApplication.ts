/**
 * Parte la aplicación del pastor en las implicaciones que ÉL escribió.
 *
 * EL CONTEO ES SUYO, NO NUESTRO. La decisión de "una aplicación por punto"
 * (2026-08-23) resolvía un problema distinto: aplicaciones sueltas que no sabían
 * a qué punto pertenecían. Eso no cambia — sigue habiendo UN campo por punto,
 * aprobado por él. Lo que cambia es que si escribe dos bloques separados por una
 * línea en blanco, salen dos implicaciones; si escribe uno, sale una.
 *
 * POR QUÉ POR LÍNEA EN BLANCO Y NO POR SALTO SIMPLE: un salto simple es lo que
 * produce un textarea al ajustar el texto o cuando alguien parte una frase larga
 * para leerla mejor. Partir ahí trocearía una sola aplicación en pedazos sin
 * sentido. La línea en blanco es un acto deliberado: nadie la escribe sin
 * querer separar dos cosas.
 *
 * Función pura y en dominio porque es exactamente la clase de transformación que
 * se rompe en silencio: si parte de más, el sermón muestra media frase como si
 * fuera una implicación completa, y nadie lo nota hasta el púlpito.
 */
const MARCADOR = /^\s*(?:[-*•]|\d+[.)])\s+/;

export function splitApplication(application: string | undefined): string[] {
    if (!application?.trim()) return [];
    const lineas = application.split(/\r?\n/);

    // LA VIÑETA MANDA SOBRE LA LÍNEA EN BLANCO.
    //
    // Si el pastor marcó una lista, cada marca abre un ítem — no importa si
    // separó con línea en blanco o con un solo Enter. Una viñeta explícita es
    // una señal de estructura MÁS FUERTE que un espacio vertical: la escribió a
    // propósito, mientras que la línea en blanco puede ser hábito de tipeo.
    //
    // El fallo real (2026-08-23): el pastor escribió dos aplicaciones como
    // "* una\n* otra" y salieron fundidas en una sola frase corrida, porque
    // sólo se partía por línea en blanco. Elegir una convención y suponer que
    // es la del usuario es el error; hay que leer las dos.
    if (lineas.filter((l) => MARCADOR.test(l)).length >= 2) {
        const items: string[] = [];
        for (const linea of lineas) {
            const texto = linea.trim();
            if (!texto) continue;
            if (MARCADOR.test(linea)) items.push(texto.replace(MARCADOR, ''));
            // Una línea SIN marca continúa el ítem anterior: es un ítem largo
            // que se partió al escribir, no uno nuevo.
            else if (items.length > 0) items[items.length - 1] += ` ${texto}`;
            else items.push(texto);
        }
        return items.filter((i) => i.length > 0);
    }

    // Sin viñetas, la línea en blanco es el separador. Un salto SIMPLE no parte:
    // es lo que produce un textarea al ajustar el texto, o alguien que corta una
    // frase larga para leerla mejor. Partir ahí trocearía una sola aplicación.
    return application
        .split(/\n\s*\n+/)
        .map((bloque) =>
            bloque
                .replace(/\s*\n\s*/g, ' ')
                .replace(MARCADOR, '')
                .trim(),
        )
        .filter((bloque) => bloque.length > 0);
}
