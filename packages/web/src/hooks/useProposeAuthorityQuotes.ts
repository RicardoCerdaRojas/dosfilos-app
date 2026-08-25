import { useCallback, useState } from 'react';
import { createProxyLlmClient } from '@dosfilos/infrastructure';
import {
    buildAuthorityQuotePrompt,
    parseProposedQuotes,
    type ProposedElement,
    type QuotableSource,
} from '@dosfilos/domain';
import { buildSermonCitationManifest } from '@/pages/sermons/generator/draft/buildSermonCitationManifest';

export type QuoteProposalOutcome =
    /** Se encontraron citas que respaldan el punto. */
    | { kind: 'ok'; quotes: ProposedElement[] }
    /** Su biblioteca no tiene nada sobre esto. NO es un error. */
    | { kind: 'sinFuentes' }
    /** Hay material, pero ninguno respalda lo que el punto afirma. */
    | { kind: 'sinCoincidencias' }
    | { kind: 'falló' };

/**
 * Propone citas de autoridad SELECCIONÁNDOLAS de la biblioteca del pastor.
 *
 * RECUPERA PRIMERO, PROPONE DESPUÉS. La sección usaba el proponedor genérico de
 * elementos, que pide "ideas" sin material: le estaba pidiendo a un modelo una
 * cita de autoridad sin nada de dónde sacarla, que es exactamente el mecanismo
 * por el que se fabrica una falsa atribuida a un autor real.
 *
 * SIN FUENTES NO SE LLAMA AL MODELO. No es una optimización: un prompt que pide
 * una cita con la lista de fragmentos vacía es la petición que fabrica. Se
 * devuelve `sinFuentes` y el pastor escribe la suya, que es lo correcto cuando
 * su biblioteca no cubre el punto.
 *
 * La consulta sale de la PROPOSICIÓN del punto: la cita debe respaldar lo que
 * él afirma ahí, no el pasaje en general.
 */
export function useProposeAuthorityQuotes() {
    const [loading, setLoading] = useState(false);

    const propose = useCallback(
        async (opts: {
            query: string;
            userId?: string;
            passage: string;
            pointTitle?: string;
            pointProposition?: string;
        }): Promise<QuoteProposalOutcome> => {
            setLoading(true);
            try {
                const manifest = await buildSermonCitationManifest({
                    query: opts.query,
                    userId: opts.userId,
                    topK: 8,
                });
                const sources: QuotableSource[] = (manifest?.entries ?? [])
                    .filter((e) => e.excerpt?.trim())
                    .map((e) => ({ excerpt: e.excerpt, title: e.title, author: e.author, page: e.page }));

                if (sources.length === 0) return { kind: 'sinFuentes' };

                const out = await createProxyLlmClient('sermon.proposeElements').generate({
                    prompt: buildAuthorityQuotePrompt({
                        sources,
                        passage: opts.passage,
                        pointTitle: opts.pointTitle,
                        pointProposition: opts.pointProposition,
                    }),
                    // Temperatura mínima: seleccionar y copiar no admite
                    // creatividad. Cualquier variación acá es una cita alterada.
                    temperature: 0.1,
                });

                // LA ATRIBUCIÓN LA PONEMOS NOSOTROS y se VERIFICA que la cita
                // esté en el fragmento que dice citar. El modelo sólo devuelve
                // qué fragmento usó y qué parte copió.
                const quotes = parseProposedQuotes(out ?? '', sources);
                // Lista vacía es una respuesta CORRECTA del prompt: ninguno de
                // los fragmentos respalda el punto.
                return quotes.length > 0 ? { kind: 'ok', quotes } : { kind: 'sinCoincidencias' };
            } catch (err) {
                console.warn('[redacción] no se pudieron proponer citas', err);
                return { kind: 'falló' };
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    return { propose, loading };
}
