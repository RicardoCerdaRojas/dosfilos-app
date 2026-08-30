/**
 * Presupuesto de caracteres del prompt que se le manda al callable
 * `runLlmPrompt`.
 *
 * El servidor rechaza con `invalid-argument` todo `prompt` que pase de
 * `MAX_PROMPT_CHARS` (ver `packages/functions/src/llm/runLlmPrompt.ts`). Los
 * constructores de prompt de exégesis venían con presupuestos de fuentes de
 * 220.000 y 250.000 caracteres — por encima del tope. Con un corpus de
 * comentarios completos el prompt superaba el tope y la llamada moría con
 * `prompt excede 200000 caracteres`: la pantalla de exégesis quedaba trabada
 * sin poder generar ningún paso.
 *
 * La constante está DUPLICADA a propósito: `infrastructure` corre en el
 * navegador y `functions` en Cloud Functions; no hay paquete compartido entre
 * los dos. Si cambia allá, cambiá acá.
 */
export const MAX_PROMPT_CHARS = 200_000;

/**
 * Colchón entre el presupuesto calculado y el tope duro. Cubre lo que el
 * bloque variable agrega por encima del texto que se le presupuesta
 * (encabezados por fuente, el bloque de contrato de fuentes asignadas, los
 * marcadores de truncado) y los separadores del armado final.
 */
const SAFETY_MARGIN_CHARS = 4_000;

const PLACEHOLDER = ' __VARIABLE_BLOCK__ ';

/**
 * Arma un mensaje cuyo bloque más grande —el corpus de fuentes— se recorta a
 * lo que quede libre bajo el tope del servidor, en vez de a una constante fija
 * que lo ignora.
 *
 * Dos pasadas: la primera mide todo lo que NO es el bloque variable (las
 * instrucciones, el brief, los análisis previos, el hint de regeneración); la
 * segunda arma el bloque variable con el saldo. Así el recorte cae siempre en
 * las fuentes —que ya tienen truncado con marcador visible— y nunca en el hint
 * del usuario ni en las instrucciones metodológicas.
 *
 * @param render             arma el mensaje completo dado el bloque variable.
 * @param buildVariableBlock arma el bloque variable dado su presupuesto.
 * @param preferredBudget    tope deseado cuando hay lugar de sobra.
 * @param label              para el log cuando hay que recortar.
 */
export function fitPromptToCap(
    render: (variableBlock: string) => string,
    buildVariableBlock: (budgetChars: number) => string,
    preferredBudget: number,
    label: string,
): string {
    const skeleton = render(PLACEHOLDER);
    const overhead = skeleton.length - PLACEHOLDER.length;
    const available = Math.max(0, MAX_PROMPT_CHARS - SAFETY_MARGIN_CHARS - overhead);
    const budget = Math.min(preferredBudget, available);

    if (budget < preferredBudget) {
        console.log(`[${label}] recortando corpus para entrar en el tope del proxy`, {
            overhead,
            preferredBudget,
            budget,
            maxPromptChars: MAX_PROMPT_CHARS,
        });
    }

    const message = skeleton.replace(PLACEHOLDER, buildVariableBlock(budget));

    // Red de seguridad: si el texto FIJO solo ya pasa el tope (guía de estilo,
    // análisis previos y brief al máximo), no hay presupuesto que ajustar y la
    // llamada moriría en el servidor. Se recorta acá con un aviso fuerte, que
    // es peor que no llegar a este caso pero mejor que trabar la pantalla.
    if (message.length > MAX_PROMPT_CHARS) {
        console.warn(`[${label}] el prompt pasa el tope aun sin corpus; se recorta el final`, {
            length: message.length,
            maxPromptChars: MAX_PROMPT_CHARS,
        });
        return message.slice(0, MAX_PROMPT_CHARS);
    }

    return message;
}
