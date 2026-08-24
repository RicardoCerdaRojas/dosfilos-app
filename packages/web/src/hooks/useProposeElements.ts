import { useCallback, useState } from 'react';
import { createProxyLlmClient } from '@dosfilos/infrastructure';
import { buildElementsPrompt, parseProposedElements, type ElementsPromptInput, type ProposedElement } from '@dosfilos/domain';

export type { ProposedElement };

/**
 * ADR-037 — pide ELEMENTOS para una sección. Pull-first: sólo corre cuando el
 * pastor lo pide, nunca al abrir el paso.
 */
export function useProposeElements() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const propose = useCallback(async (input: ElementsPromptInput): Promise<ProposedElement[]> => {
        setLoading(true);
        setError(null);
        try {
            const out = await createProxyLlmClient('sermon.proposeElements').generate({
                prompt: buildElementsPrompt(input),
                // Alta-media: proponer opciones DISTINTAS entre sí es el trabajo.
                // Con temperatura baja el "propónme otras" devuelve variaciones de
                // lo mismo, que es exactamente lo que hace inútil el botón.
                temperature: 0.8,
            });
            const elementos = parseProposedElements(out ?? '');
            if (elementos.length === 0) setError('empty');
            return elementos;
        } catch (err) {
            // Un fallo NO puede dejar al pastor sin camino: su propia idea sigue
            // siendo la vía principal, y el mensaje se lo recuerda.
            console.warn('[redacción] no se pudieron proponer elementos', err);
            setError('failed');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    return { propose, loading, error };
}
