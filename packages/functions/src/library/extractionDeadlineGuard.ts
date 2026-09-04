import { EXTRACTION_TIMEOUT_SECONDS } from './extractionBudget';

/**
 * Escribe `failed` ANTES de que la plataforma mate la invocación.
 *
 * Cuando la función muere en su timeout, Cloud Run la mata y nadie
 * escribe el estado. El recurso queda en `processing` con el
 * `updatedAt` del arranque, indefinidamente, y la tarjeta gira con un
 * contador de tiempo estimado que corre sobre un trabajo que ya no
 * existe.
 *
 * En producción: 83 recursos en `ready` y **cero** en `failed` en toda
 * la vida del producto. Cero no significa que nada falló: significa
 * que cuando falla, no lo dice.
 *
 * **A la muerte por timeout no se le pone `catch`.** El `catch` del
 * trigger cubre los errores que el código ve; el asesinato de la
 * plataforma no es uno de ellos. Por eso esto es un temporizador y no
 * un manejador de errores: se arma al empezar, dispara unos segundos
 * antes del tope y deja el motivo escrito mientras todavía hay proceso
 * vivo para escribirlo.
 *
 * Si la extracción termina bien después de que el guardia disparó, la
 * escritura de éxito pisa el `failed` — el orden es el correcto y el
 * usuario ve el resultado bueno.
 */

/**
 * Cuánto antes del tope dispara.
 *
 * Tiene que alcanzar para un update de Firestore con la red lenta y no
 * tanto como para declarar muerta una extracción que iba a entregar.
 */
export const DEADLINE_GUARD_MARGIN_SECONDS = 20;

export interface DeadlineGuard {
    /** Cancela el guardia. Se llama siempre, haya salido bien o mal. */
    disarm(): void;
}

export function armExtractionDeadlineGuard(
    onDeadline: () => Promise<void>,
    options: { timeoutSeconds?: number; marginSeconds?: number } = {},
): DeadlineGuard {
    const timeout = options.timeoutSeconds ?? EXTRACTION_TIMEOUT_SECONDS;
    const margin = options.marginSeconds ?? DEADLINE_GUARD_MARGIN_SECONDS;
    const delayMs = Math.max(0, (timeout - margin) * 1000);

    const timer = setTimeout(() => {
        // Un fallo del propio guardia no puede tumbar la extracción que
        // todavía podría entregar: se registra y se sigue.
        void onDeadline().catch(err => {
            console.error('[Extract] el guardia de tiempo no pudo escribir el estado:', err);
        });
    }, delayMs);

    // El guardia no debe ser motivo para mantener vivo el proceso.
    timer.unref?.();

    return {
        disarm() {
            clearTimeout(timer);
        },
    };
}
