import { useEffect, useState } from 'react';

let indice: Record<string, number> | null = null;
let cargando: Promise<Record<string, number>> | null = null;

/**
 * Frecuencia del lema en el NT — del índice PRECOMPUTADO
 * (`scripts/build-greek-lemma-index.mjs`): el texto es fijo, la respuesta no
 * cambia, y contarla en runtime obligaría a bajar los 27 libros. El JSON
 * (111 KB, 5.461 lemas) entra por import dinámico: quien nunca abre el
 * analizador no lo paga.
 */
export function useNtLemmaFrequency(lemma: string | undefined): number | null {
    const [freq, setFreq] = useState<number | null>(indice && lemma ? (indice[lemma] ?? 0) : null);

    useEffect(() => {
        if (!lemma) return;
        if (indice) {
            setFreq(indice[lemma] ?? 0);
            return;
        }
        let vivo = true;
        cargando ??= import('./ntLemmaFrequency.json').then((m) => (indice = m.default as Record<string, number>));
        cargando.then((idx) => {
            if (vivo) setFreq(idx[lemma] ?? 0);
        });
        return () => {
            vivo = false;
        };
    }, [lemma]);

    return freq;
}
