import type { SermonContent } from '@dosfilos/domain';
import { parseSermonCitations } from './sermonCitationParser';
import { verifyOne, type VerifiedSermonCitation } from './VerifySermonCitationsUseCase';

/**
 * Fidelidad de citas EN LA REDACCIÓN (opción B de la propuesta).
 *
 * Corre el mismo verificador determinista de citas que hoy vive en el gate de
 * publicación, pero sobre el borrador FRESCO (`SermonContent`) apenas se genera —
 * ANTES de mostrárselo al pastor. Reusa `verifyOne` + `parseSermonCitations`
 * (cero LLM, <50 ms). Detecta las citas atribuidas que NO están en el material
 * fuente (el manifiesto de citas del propio borrador) = las fabricadas.
 *
 * El corpus se arma del `citationManifest` del borrador (excerpts + autor + título
 * reales). No lee Firestore ni fuentes paper/faculty — para el chequeo in-draft
 * basta el manifiesto que el borrador ya trae. El gate de publicación (que sí
 * resuelve paper/faculty) permanece como red de seguridad.
 */

/** Corpus verificable del borrador: excerpts + autor + título del manifiesto. */
export function buildDraftCorpus(draft: Pick<SermonContent, 'citationManifest'>): string {
    const parts: string[] = [];
    for (const e of draft.citationManifest?.entries ?? []) {
        if (e.excerpt) parts.push(e.excerpt);
        if (e.author) parts.push(e.author);
        if (e.title) parts.push(e.title);
    }
    return parts.join('\n\n');
}

/** Prosa del borrador (donde viven las citas atribuidas). */
export function buildDraftMarkdown(
    draft: Pick<SermonContent, 'introduction' | 'body' | 'conclusion' | 'callToAction'>,
): string {
    const parts: string[] = [];
    if (draft.introduction) parts.push(draft.introduction);
    for (const b of draft.body ?? []) {
        if (b.content) parts.push(b.content);
        if (b.authorityQuote) parts.push(b.authorityQuote);
        if (b.illustration) parts.push(b.illustration);
    }
    if (draft.conclusion) parts.push(draft.conclusion);
    if (draft.callToAction) parts.push(draft.callToAction);
    return parts.join('\n\n');
}

export interface DraftCitationCheck {
    /** Todas las citas atribuidas encontradas en la prosa, con su veredicto. */
    citations: VerifiedSermonCitation[];
    /** Solo las `not-found` — las probablemente fabricadas. */
    notFound: VerifiedSermonCitation[];
    /** ¿El borrador trae manifiesto? (si no, no hay contra qué verificar). */
    hasManifest: boolean;
}

/** Verifica las citas del borrador fresco contra su propio manifiesto. PURO. */
export function verifyDraftCitations(draft: SermonContent): DraftCitationCheck {
    const corpus = buildDraftCorpus(draft);
    const markdown = buildDraftMarkdown(draft);
    const citations = parseSermonCitations(markdown).map((c) => verifyOne(c, corpus));
    return {
        citations,
        notFound: citations.filter((c) => c.status === 'not-found'),
        hasManifest: (draft.citationManifest?.entries?.length ?? 0) > 0,
    };
}

export interface SanitizeUntilCleanResult {
    content: SermonContent;
    /** Cuántas citas fabricadas se eliminaron (inicial − final). */
    removed: number;
    /** True si tras `maxRounds` aún quedaban not-found (el gate de publicación las caza). */
    residual: boolean;
}

/**
 * Verifica → sanitiza → RE-VERIFICA en loop hasta que no queden citas fabricadas
 * o se agoten las rondas. Converge a 0 (no a "casi"): reescribir un párrafo puede
 * dejar un residuo o rozar otra cita, así que se re-chequea. `sanitize` se inyecta
 * (la impl real llama la callable Sonnet) → esta función es testeable con un fake.
 *
 * Best-effort en el llamador: si `sanitize` falla, el gate de publicación queda
 * como red final. Nunca deja el borrador peor que como llegó.
 */
export async function sanitizeDraftUntilClean(
    content: SermonContent,
    sanitize: (draft: SermonContent, notFound: DraftCitationCheck['notFound']) => Promise<SermonContent>,
    maxRounds = 2,
): Promise<SanitizeUntilCleanResult> {
    const initial = verifyDraftCitations(content).notFound.length;
    let current = content;

    for (let round = 0; round < maxRounds; round++) {
        const check = verifyDraftCitations(current);
        if (check.notFound.length === 0) break;
        current = await sanitize(current, check.notFound);
    }
    const finalNotFound = verifyDraftCitations(current).notFound.length;

    return {
        content: current,
        removed: Math.max(0, initial - finalNotFound),
        residual: finalNotFound > 0,
    };
}
