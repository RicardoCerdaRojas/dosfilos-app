/**
 * EL CATÁLOGO DE MODELOS — una sola verdad sobre qué modelos existen.
 *
 * POR QUÉ EXISTE: el id del modelo vivía como literal suelto en decenas de
 * sitios, y la pantalla de ajustes ofrecía su propia lista escrita a mano. Las
 * dos listas divergieron, y divergieron hacia el peor lado posible: el selector
 * ofrecía dos modelos que el servidor RECHAZA —porque no tienen precio en la
 * tabla— y elegir cualquiera de ellos rompía toda generación con "Modelo no
 * autorizado". El pastor no tenía forma de saber que la opción que le
 * ofrecíamos era la que le rompía la aplicación.
 *
 * LOS MODELOS SE NOMBRAN POR LO QUE HACEN, no por su versión. `FAST` y `DEEP`
 * son roles; el id concreto es un detalle que cambia cada pocos meses cuando el
 * proveedor retira una versión. Quien pide un modelo pide una CAPACIDAD, y por
 * eso cambiar de modelo —o de proveedor— se hace acá y en ningún otro lugar.
 *
 * COPIA EN `packages/functions/src/llm/modelCatalog.ts`. El paquete de
 * funciones no puede importar `@dosfilos/domain` (revienta el build con ~180
 * TS6059), así que se duplica a propósito, igual que el port `ILlmClient`. Un
 * test de paridad allá compara las dos listas y verifica que todo modelo
 * ofrecible tenga precio: es lo que impide que esto vuelva a divergir.
 */

export interface LlmModel {
    id: string;
    /** Cómo se le nombra al pastor. Sin jerga de versiones cuando se puede. */
    label: string;
    /**
     * ¿Se le ofrece para elegir en ajustes?
     *
     * Un modelo puede estar VIVO —con precio, aceptado por el servidor— y aun
     * así no ofrecerse: los de embeddings no son una elección del pastor.
     */
    selectable: boolean;
    /** Una línea sobre cuándo conviene. Vacío para los que no se ofrecen. */
    hint?: string;
}

/** El caballo de batalla: rápido y barato. La mayoría del trabajo pasa por acá. */
export const MODEL_FAST = 'gemini-2.5-flash';
/** Razonamiento largo, para lo que no cabe en una respuesta rápida. */
export const MODEL_DEEP = 'gemini-2.5-pro';
/** Vectores para la biblioteca. No es una elección del pastor. */
export const MODEL_EMBEDDING = 'gemini-embedding-001';

/**
 * Modelo por defecto y respaldo de todo lo que llegue roto.
 *
 * Es el rápido a propósito: si algo falla al resolver, el pastor termina en el
 * modelo recomendado y no en el caro.
 */
export const DEFAULT_MODEL = MODEL_FAST;

export const LLM_MODELS: readonly LlmModel[] = [
    {
        id: MODEL_FAST,
        label: 'Rápido',
        selectable: true,
        hint: 'Recomendado. Responde rápido y alcanza para casi todo.',
    },
    {
        id: MODEL_DEEP,
        label: 'Profundo',
        selectable: true,
        hint: 'Piensa más y tarda más. Útil en pasajes difíciles.',
    },
    { id: MODEL_EMBEDDING, label: 'Índice de biblioteca', selectable: false },
];

/** Los que el pastor puede elegir en ajustes. */
export function selectableModels(): LlmModel[] {
    return LLM_MODELS.filter((m) => m.selectable);
}

export function isKnownModel(id: string | undefined): boolean {
    return LLM_MODELS.some((m) => m.id === id);
}

/**
 * Devuelve el modelo que hay que usar a partir del que quedó guardado.
 *
 * SANEA LAS CONFIGURACIONES VIEJAS, y ésa es su razón de ser. Un pastor que
 * eligió "Gemini 1.5 Pro" hace meses tiene guardado un id que el servidor ya
 * rechaza: sin esto, su aplicación queda rota hasta que alguien adivine que la
 * causa está en una pantalla de ajustes que abrió una vez. No se le pide que
 * arregle nada — se le devuelve al modelo recomendado.
 *
 * Lo mismo para un modelo real pero no ofrecible: nadie debería estar generando
 * sermones con el modelo de embeddings.
 */
export function resolveUserModel(stored: string | undefined): string {
    if (!stored) return DEFAULT_MODEL;
    const found = LLM_MODELS.find((m) => m.id === stored);
    return found?.selectable ? found.id : DEFAULT_MODEL;
}
