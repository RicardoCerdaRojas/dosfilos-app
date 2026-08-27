import {
    buildJudgeCorpus,
    computeDeterministicDraftSignals,
    JudgeSermonDraftUseCase,
    sermonDraftShadowService,
} from '@dosfilos/application';
import {
    GENRE_COMPLIANCE_GENRES,
    normalizeHomileticalApproach,
    type LiteraryGenre,
    type SermonContent,
} from '@dosfilos/domain';
import { createProxyLlmClient } from '@dosfilos/infrastructure';
import { shouldJudgeSample } from './draftChecks';

export interface DraftShadowInput {
    draft: SermonContent;
    sermonId: string;
    passage: string;
    homileticalApproach: string | undefined;
    /** La semilla, ya enriquecida: de ahí salen género y principio atemporal. */
    principle: string | undefined;
    genre: string | undefined;
}

/**
 * Redacción v2 §8.5 — mide el borrador recién generado. DOS COLECTORES, y la
 * separación es deliberada.
 *
 * El DETERMINISTA es gratis y corre siempre. El JUEZ es una llamada LLM extra
 * sobre el sermón completo, así que va muestreado y su caída jamás puede
 * arrastrar al otro.
 *
 * NADA DE ESTO SE ESPERA. El pastor ya esperó su generación; sumarle la
 * latencia de una medición que él ni siquiera ve sería cobrarle el precio de
 * nuestra curiosidad. Todo error se traga con un `console.warn`: una medición
 * que rompe lo que mide no es una medición.
 *
 * Quien llama decide SI medir (el flag); esto decide CÓMO.
 */
export function recordDraftShadows(input: DraftShadowInput): void {
    const { draft, sermonId, passage, homileticalApproach, principle, genre } = input;

    try {
        void sermonDraftShadowService.record({
            sermonId,
            passage,
            approachType: homileticalApproach ?? '',
            principlePresent: Boolean(principle?.trim()),
            collector: 'deterministic',
            signals: computeDeterministicDraftSignals(draft, draft.citationManifest),
        });
    } catch (error) {
        console.warn('[draft] sombra determinista falló — no bloqueante', error);
    }

    const juzgado = normalizeHomileticalApproach(homileticalApproach);
    if (!juzgado.approach || !shouldJudgeSample(sermonId)) return;

    // El género se ESTRECHA contra el catálogo en vez de castearse: un valor
    // viejo o desconocido deja la vara sin piso de género —que es correcto— en
    // vez de fingir uno.
    const generoValido = genre && (GENRE_COMPLIANCE_GENRES as readonly string[]).includes(genre)
        ? (genre as LiteraryGenre)
        : undefined;

    void new JudgeSermonDraftUseCase(
        createProxyLlmClient('sermon.judgeCompliance'),
        sermonDraftShadowService,
    )
        .execute({
            sermonId,
            passage,
            approach: juzgado.approach,
            ...(generoValido ? { genre: generoValido } : {}),
            draftText: buildJudgeCorpus(draft),
        })
        .catch((error) => {
            console.warn('[draft] sombra del juez falló — no bloqueante', error);
        });
}
