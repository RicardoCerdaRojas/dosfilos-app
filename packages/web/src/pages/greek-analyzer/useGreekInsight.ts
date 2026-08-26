import { useCallback, useEffect, useRef, useState } from 'react';
import { FirestoreGreekInsightRepository, GreekInsightService } from '@dosfilos/infrastructure';
import type { GreekVerseInsight, GreekWordToken } from '@dosfilos/domain';

/**
 * El análisis del modelo para el versículo activo: caché global primero,
 * generación bajo demanda después.
 *
 * PULL, NO AUTO. Generar al navegar quemaría una llamada por cada versículo
 * visitado de pasada; el pastor que está LEYENDO morfología no pidió pagar un
 * análisis. El botón lo pide una vez y el caché lo vuelve gratis para todos —
 * el texto griego es el mismo para todo el mundo.
 */
export function useGreekInsight(reference: string, tokens: readonly GreekWordToken[] | undefined) {
    const repoRef = useRef<FirestoreGreekInsightRepository>();
    if (!repoRef.current) repoRef.current = new FirestoreGreekInsightRepository();
    const serviceRef = useRef<GreekInsightService>();
    if (!serviceRef.current) serviceRef.current = new GreekInsightService();

    const [insight, setInsight] = useState<GreekVerseInsight | null>(null);
    const [checking, setChecking] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let vivo = true;
        setInsight(null);
        setError(null);
        setChecking(true);
        repoRef.current!.get(reference).then((cached) => {
            if (!vivo) return;
            // EL CACHÉ TAMBIÉN SE VALIDA CONTRA LOS TOKENS: un análisis viejo
            // de otra edición del texto, desalineado, es peor que ninguno.
            if (cached && tokens && cached.words.length === tokens.length) setInsight(cached);
            setChecking(false);
        });
        return () => {
            vivo = false;
        };
    }, [reference, tokens]);

    const generate = useCallback(async () => {
        if (!tokens || tokens.length === 0) return;
        setGenerating(true);
        setError(null);
        try {
            const result = await serviceRef.current!.analyzeVerse({ reference, tokens });
            setInsight(result);
            void repoRef.current!.save(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        } finally {
            setGenerating(false);
        }
    }, [reference, tokens]);

    return { insight, checking, generating, error, generate };
}
