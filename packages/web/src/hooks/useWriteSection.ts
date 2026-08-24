import { useCallback, useState } from 'react';
import { createProxyLlmClient } from '@dosfilos/infrastructure';
import { buildSectionProsePrompt, type SectionProseInput } from '@dosfilos/domain';

/**
 * ADR-037 — escribe la prosa de una sección a partir de lo que el pastor decidió.
 *
 * Pull-first, como el proponedor: corre cuando él lo pide. Escribir solo al
 * abrir la sección gastaría una llamada por cada sección que mire, y peor,
 * pondría prosa donde él todavía no terminó de decidir.
 */
export function useWriteSection() {
    /** `sectionId` en curso, o null. Permite deshabilitar sólo el botón que corre. */
    const [writingId, setWritingId] = useState<string | null>(null);
    const [error, setError] = useState(false);

    const write = useCallback(async (input: SectionProseInput): Promise<string | null> => {
        setWritingId(input.section.id);
        setError(false);
        try {
            const out = await createProxyLlmClient('sermon.writeSection').generate({
                prompt: buildSectionProsePrompt(input),
                // Media-baja: la prosa tiene que sonar a él, no ser creativa. La
                // creatividad ya se gastó al decidir las ideas — acá inventar es
                // exactamente lo que el prompt prohíbe.
                temperature: 0.5,
            });
            const limpio = (out ?? '').trim();
            if (!limpio) {
                setError(true);
                return null;
            }
            return limpio;
        } catch (err) {
            // Un fallo NO puede perder sus decisiones: siguen guardadas, y lo
            // único que no ocurrió es la redacción. El mensaje lo dice así.
            console.warn('[redacción] no se pudo escribir la sección', err);
            setError(true);
            return null;
        } finally {
            setWritingId(null);
        }
    }, []);

    return { write, writingId, error };
}
