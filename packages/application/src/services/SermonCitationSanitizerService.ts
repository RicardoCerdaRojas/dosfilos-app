import { getFunctions, httpsCallable } from 'firebase/functions';
import type { SermonContent } from '@dosfilos/domain';
import type { VerifiedSermonCitation } from '../use-cases/exegesis/VerifySermonCitationsUseCase';

/**
 * Fidelidad de citas en la redacción (opción B, parte 2) — aplica el sanitizado.
 *
 * Toma el borrador + las citas `not-found` (fabricadas, de verifyDraftCitations) y
 * devuelve un borrador LIMPIO: los `authorityQuote` fabricados se eliminan (→ null,
 * el renderer los omite) y los párrafos de prosa que contienen una cita fabricada
 * se reescriben vía la callable `sanitizeSermonCitations` (quita la atribución,
 * conserva la idea, NO inventa reemplazo). Fail-closed: nunca deja una cita sin
 * respaldo atribuida; ante fallo, cae al texto original (el gate de publicación lo
 * vuelve a marcar).
 */

interface SanitizeItem {
    text: string;
    fabricated: Array<{ author: string; quote: string }>;
}

/** ¿El texto contiene alguna de las citas fabricadas (por su substring `raw`)? */
function flaggedIn(text: string, notFound: VerifiedSermonCitation[]): VerifiedSermonCitation[] {
    if (!text) return [];
    return notFound.filter((c) => c.citation.raw && text.includes(c.citation.raw));
}

function toFabricated(cs: VerifiedSermonCitation[]): Array<{ author: string; quote: string }> {
    return cs.map((c) => ({ author: c.citation.author, quote: c.citation.quote }));
}

export class SermonCitationSanitizerService {
    /**
     * Devuelve un borrador nuevo sin las atribuciones fabricadas. Hace UNA llamada
     * a la callable con todos los párrafos de prosa a reescribir (orden estable).
     */
    async sanitize(draft: SermonContent, notFound: VerifiedSermonCitation[]): Promise<SermonContent> {
        if (notFound.length === 0) return draft;

        // 1) Junta los párrafos de PROSA a reescribir (intro, body.content,
        //    body.illustration, conclusión, CTA). authorityQuote se trata aparte.
        const items: SanitizeItem[] = [];
        const targets: Array<(text: string) => void> = [];
        const push = (text: string | undefined, apply: (t: string) => void) => {
            const flagged = flaggedIn(text ?? '', notFound);
            if (flagged.length > 0) {
                items.push({ text: text as string, fabricated: toFabricated(flagged) });
                targets.push(apply);
            }
        };

        // Clona el borrador (inmutable).
        const next: SermonContent = {
            ...draft,
            body: draft.body.map((b) => ({ ...b })),
        };

        push(next.introduction, (t) => { next.introduction = t; });
        next.body.forEach((b, i) => {
            push(b.content, (t) => { next.body[i].content = t; });
            if (b.illustration) push(b.illustration, (t) => { next.body[i].illustration = t; });
            // authorityQuote fabricado → se ELIMINA entero (no se reescribe).
            if (b.authorityQuote && flaggedIn(b.authorityQuote, notFound).length > 0) {
                next.body[i].authorityQuote = null;
            }
        });
        push(next.conclusion, (t) => { next.conclusion = t; });
        if (next.callToAction) push(next.callToAction, (t) => { next.callToAction = t; });

        if (items.length === 0) return next; // solo había authorityQuotes fabricados

        // 2) Reescribe los párrafos vía la callable (Sonnet).
        const fn = httpsCallable<{ items: SanitizeItem[] }, { texts: string[] }>(
            getFunctions(),
            'sanitizeSermonCitations',
        );
        const { data } = await fn({ items });
        const texts = data?.texts ?? [];

        // 3) Aplica los textos reescritos en orden.
        targets.forEach((apply, i) => {
            const rewritten = texts[i];
            if (rewritten && rewritten.trim()) apply(rewritten.trim());
        });

        return next;
    }
}

export const sermonCitationSanitizerService = new SermonCitationSanitizerService();
