import { useCallback, useState } from 'react';
import { createProxyLlmClient } from '@dosfilos/infrastructure';
import { buildCitationTranslationPrompt, type ReaderLanguage } from '@dosfilos/domain';

/**
 * Caché por texto, viva mientras dure la pestaña.
 *
 * Alternar entre original y traducción no puede costar una llamada cada vez, y
 * la misma cita aparece en varias secciones del sermón. La clave es el texto +
 * idioma destino: dos citas idénticas comparten traducción legítimamente.
 */
const cache = new Map<string, string>();

export function useCitationTranslation() {
    const [translating, setTranslating] = useState(false);
    const [error, setError] = useState(false);

    /**
     * Traduce BAJO DEMANDA, nunca al generar.
     *
     * Traducir cada excerpt en la generación cuesta una llamada por cita y
     * retrasa el borrador completo — para citas que el pastor quizá ni abra.
     * Traducir la que pidió, cuando la pide, cuesta una.
     */
    const translate = useCallback(async (text: string, target: ReaderLanguage): Promise<string | null> => {
        const key = `${target}:${text}`;
        const hit = cache.get(key);
        if (hit) return hit;

        setTranslating(true);
        setError(false);
        try {
            const out = await createProxyLlmClient('sermon.translateCitation').generate({
                prompt: buildCitationTranslationPrompt(text, target),
                // Temperatura baja: una traducción fiel no es un ejercicio
                // creativo, y la variación acá se lee como inexactitud.
                temperature: 0.2,
            });
            const limpio = (out ?? '').trim();
            if (!limpio) {
                setError(true);
                return null;
            }
            cache.set(key, limpio);
            return limpio;
        } catch (err) {
            // Un fallo NO puede terminar en silencio ni romper la lectura: el
            // original sigue ahí, que es lo que de verdad importa.
            console.warn('[citas] no se pudo traducir la cita', err);
            setError(true);
            return null;
        } finally {
            setTranslating(false);
        }
    }, []);

    return { translate, translating, error };
}
