import { describe, it, expect, beforeEach } from 'vitest';
import { GeneratorChatService } from '../GeneratorChatService';

/** localStorage de mentira: el servicio lee `globalThis.localStorage`. */
function instalarStorage(): Map<string, string> {
    const datos = new Map<string, string>();
    (globalThis as any).localStorage = {
        getItem: (k: string) => datos.get(k) ?? null,
        setItem: (k: string, v: string) => void datos.set(k, v),
        removeItem: (k: string) => void datos.delete(k),
    };
    return datos;
}

const CLAVE = (id: string) => `generator_chat_history_${id}_exegesis`;

/** Deja una conversación guardada bajo `id`, como si el pastor la hubiera tenido. */
function sembrarConversacion(datos: Map<string, string>, id: string, texto: string) {
    datos.set(
        CLAVE(id),
        JSON.stringify({
            sermonId: id,
            phase: 'exegesis',
            messages: [{ role: 'user', content: texto, timestamp: new Date().toISOString() }],
            sourcesPerMessage: {},
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }),
    );
}

describe('la conversación viaja cuando el sermón nace', () => {
    let datos: Map<string, string>;
    let servicio: GeneratorChatService;

    beforeEach(() => {
        datos = instalarStorage();
        servicio = new GeneratorChatService();
    });

    it('adopta el historial de la clave provisional al aparecer el sermonId', () => {
        // EL BUG QUE CIERRA: en el Paso 1 el chat se guarda bajo el id de la
        // configuración; al generar la exégesis la clave pasa a ser el sermonId
        // y la conversación desaparecía de la pantalla en ese mismo instante,
        // sin recargar nada.
        sembrarConversacion(datos, 'config-abc', '¿Qué género es Jonás?');

        servicio.initializeForSermon('sermon-123', 'exegesis', {
            persistToFirestore: false,
            adoptFromKey: 'config-abc',
        });

        expect(servicio.getHistory()).toHaveLength(1);
        expect(servicio.getHistory()[0].content).toBe('¿Qué género es Jonás?');
    });

    it('deja el historial guardado bajo la clave NUEVA', () => {
        sembrarConversacion(datos, 'config-abc', 'hola');

        servicio.initializeForSermon('sermon-123', 'exegesis', {
            persistToFirestore: false,
            adoptFromKey: 'config-abc',
        });

        expect(datos.get(CLAVE('sermon-123'))).toBeDefined();
    });

    it('borra el rastro viejo, para que no reaparezca en otro sermón', () => {
        sembrarConversacion(datos, 'config-abc', 'hola');

        servicio.initializeForSermon('sermon-123', 'exegesis', {
            persistToFirestore: false,
            adoptFromKey: 'config-abc',
        });

        expect(datos.get(CLAVE('config-abc'))).toBeUndefined();
    });

    it('NUNCA pisa una conversación que el sermón ya tenía', () => {
        // Si el sermón ya tiene su historial, ése manda: adoptar encima
        // borraría trabajo real por rescatar un borrador provisional.
        sembrarConversacion(datos, 'config-abc', 'provisional');
        sembrarConversacion(datos, 'sermon-123', 'la de verdad');

        servicio.initializeForSermon('sermon-123', 'exegesis', {
            persistToFirestore: false,
            adoptFromKey: 'config-abc',
        });

        expect(servicio.getHistory()[0].content).toBe('la de verdad');
        // Y la provisional se queda donde estaba: no se toca lo que no se adopta.
        expect(datos.get(CLAVE('config-abc'))).toBeDefined();
    });

    it('sin clave anterior no inventa nada', () => {
        servicio.initializeForSermon('sermon-123', 'exegesis', { persistToFirestore: false });
        expect(servicio.getHistory()).toHaveLength(0);
    });

    it('la misma clave dos veces no se adopta a sí misma', () => {
        sembrarConversacion(datos, 'sermon-123', 'la suya');

        servicio.initializeForSermon('sermon-123', 'exegesis', {
            persistToFirestore: false,
            adoptFromKey: 'sermon-123',
        });

        expect(servicio.getHistory()).toHaveLength(1);
        expect(datos.get(CLAVE('sermon-123'))).toBeDefined();
    });

    it('una conversación vacía no cuenta como algo que rescatar', () => {
        datos.set(
            CLAVE('config-abc'),
            JSON.stringify({
                sermonId: 'config-abc', phase: 'exegesis', messages: [],
                sourcesPerMessage: {}, createdAt: Date.now(), updatedAt: Date.now(),
            }),
        );

        servicio.initializeForSermon('sermon-123', 'exegesis', {
            persistToFirestore: false,
            adoptFromKey: 'config-abc',
        });

        expect(servicio.getHistory()).toHaveLength(0);
        // No se borra el rastro vacío por las dudas: no había nada que mover.
        expect(datos.get(CLAVE('config-abc'))).toBeDefined();
    });
});
