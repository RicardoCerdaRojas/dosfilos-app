/**
 * Cuánto tiempo le queda a la extracción, y cómo se reparte.
 *
 * El trigger de Storage tiene un tope duro de 540 s —la plataforma no
 * admite más para ese tipo de disparador— y adentro se esperaba hasta
 * 600 s por cada cuenta de LlamaParse, en serie. El comentario del
 * código afirmaba que cabía. No cabe: 600 > 540 ya con una sola
 * cuenta.
 *
 * Medido dos veces con el mismo archivo (Adamson, 240 págs):
 *
 *   cuenta-1 → PENDING 492 s → failed: unknown
 *   cuenta-2 → PENDING 497 s → failed: unknown
 *   fallback de Gemini con 0 s restantes → 1 de 5 chunks
 *   Cloud Run: status 200 · latencia 540.001560289 s
 *
 * El fallback de Gemini está bien escrito y era INALCANZABLE POR
 * CONSTRUCCIÓN en el único escenario que justifica tenerlo. Un
 * presupuesto ciego no es un presupuesto: es una constante con nombre
 * de presupuesto.
 *
 * Acá se calcula contra el tiempo REMANENTE de la invocación, se
 * reserva lo que el fallback necesita para existir, y se reparte lo
 * que queda entre las cuentas que faltan por probar.
 */

/** Tope de la plataforma para triggers de Storage. No es configurable. */
export const EXTRACTION_TIMEOUT_SECONDS = 540;

/**
 * Lo que se le guarda al fallback y al cierre.
 *
 * Cubre la subida a Gemini de un libro mediano, su extracción por
 * lotes, el saneamiento, la escritura del `structured.md` y el update
 * de Firestore. Con dos cuentas y 540 s de tope quedan ~195 s por
 * cuenta, que es más de lo que tarda una extracción sana —las que
 * pasan de ahí son las que iban a fallar—.
 */
export const FALLBACK_RESERVE_SECONDS = 150;

/**
 * Debajo de esto no se intenta la cuenta.
 *
 * Arrancar un trabajo de LlamaParse con veinte segundos de vida no lo
 * gana ni lo pierde: lo deja colgado del lado de ellos y consume el
 * aire que necesita el fallback. Mejor no empezarlo y decirlo.
 */
export const MIN_ACCOUNT_POLL_SECONDS = 45;

export interface PollBudgetInput {
    /** Segundos consumidos por esta invocación hasta ahora. */
    elapsedSeconds: number;
    /** Cuentas que faltan por probar, contando la actual. */
    accountsRemaining: number;
    timeoutSeconds?: number;
    reserveSeconds?: number;
    minPollSeconds?: number;
}

/**
 * Segundos de espera para la cuenta que se va a probar ahora.
 *
 * Devuelve `0` cuando no alcanza: el llamador corta el recorrido de
 * cuentas y baja al fallback con el aire todavía en el bolsillo.
 */
export function pollBudgetForAccount(input: PollBudgetInput): number {
    const timeout = input.timeoutSeconds ?? EXTRACTION_TIMEOUT_SECONDS;
    const reserve = input.reserveSeconds ?? FALLBACK_RESERVE_SECONDS;
    const minPoll = input.minPollSeconds ?? MIN_ACCOUNT_POLL_SECONDS;
    const accounts = Math.max(1, Math.floor(input.accountsRemaining));

    const usable = timeout - Math.max(0, input.elapsedSeconds) - reserve;
    if (usable <= 0) return 0;

    const perAccount = Math.floor(usable / accounts);
    return perAccount >= minPoll ? perAccount : 0;
}
