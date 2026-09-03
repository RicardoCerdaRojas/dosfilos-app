import { formatPassageReference } from '../../bible/canon/passage-reference';
import { isCitableSourceType } from '../entities/SourceType';
import { serializeAnalysis } from './serializeAnalysis';
import type { ExegeticalPaper } from '../entities/ExegeticalPaper';

/**
 * Builds the context block a chat session prepends to the student's
 * message when the conversation is anchored on an exegetical paper.
 *
 * Why this exists: the session only carried `paperId`, and the block
 * built from it named the paper (title + passage + phase + brief) and
 * stopped there. So the tutor knew WHICH paper was open but not a
 * single thing the paper had concluded — the student could ask "why
 * did you translate it that way?" about an analysis sitting one click
 * away on screen, and the tutor had to guess. Every decision the
 * question is about lives in `step.accepted.canonicalAnalysis`, which
 * is already loaded: `getPaper` is a single document read and the
 * steps come embedded in it.
 *
 * What goes in, in order:
 *   1. Paper identity — title, passage, phase, assignment brief.
 *   2. Source roster — citation key → the work it stands for, so the
 *      tutor can say "Moo" means Moo's commentary instead of echoing
 *      an opaque key at the student. Non-citable types (the style
 *      template) are dropped: `SOURCE_TYPE_CATALOG` marks them
 *      `never-cite` and a tutor naming one would teach the student to
 *      cite it.
 *   3. Every accepted verse analysis, serialized with the same
 *      `serializeAnalysis` briefing the composers feed their prompts —
 *      one format for "here is what the analysis says", so the tutor
 *      reads exactly what the paper was written from.
 *
 * Only ACCEPTED versions are included. A generation the student hasn't
 * confirmed is not yet part of the paper, and a tutor defending an
 * un-accepted draft would be arguing for work its author hasn't
 * endorsed.
 *
 * The block is bounded by `analysisCharBudget`. Verses enter in step
 * order until the budget runs out; the rest are named but not
 * expanded, and the block says so, because a tutor that silently
 * received four of five verses would answer confidently about a paper
 * it half-read.
 *
 * Pure — no I/O, no clock, no formatting of user-facing copy. The
 * strings here are model-facing prompt scaffolding, not UI text.
 */
export interface PaperStudyContextOptions {
    language: 'es' | 'en';
    /**
     * Ceiling on the serialized-analysis section, in characters.
     *
     * Default 60 000 ≈ 15k tokens. Measured, not guessed: a real
     * five-verse paper (Santiago 1:1-5) serializes to ~9k chars per
     * verse, ~45k for the passage. An earlier 24 000 ceiling looked
     * generous and silently dropped three of its five verses — the
     * exact failure this whole block exists to end. The ceiling is
     * here to stop a very long passage from running away, not to
     * ration an ordinary one.
     */
    analysisCharBudget?: number;
}

export interface PaperStudyContext {
    /** The block to prepend, or null when the paper says nothing yet. */
    text: string | null;
    /** Verse references whose analysis was included, in step order. */
    includedVerses: string[];
    /** Verse references left out by the budget, in step order. */
    omittedVerses: string[];
}

const DEFAULT_ANALYSIS_CHAR_BUDGET = 60_000;

export function buildPaperStudyContext(
    paper: ExegeticalPaper,
    options: PaperStudyContextOptions,
): PaperStudyContext {
    const { language } = options;
    const budget = options.analysisCharBudget ?? DEFAULT_ANALYSIS_CHAR_BUDGET;
    const isSpanish = language === 'es';
    const passage = formatPassageReference(paper.passage, language);

    const lines: string[] = [];

    // ── 1. Paper identity ──────────────────────────────────────────
    lines.push(
        isSpanish
            ? `Paper exegético en curso: "${paper.title ?? passage}" (${passage}, fase: ${paper.phase}).`
            : `Active exegetical paper: "${paper.title ?? passage}" (${passage}, phase: ${paper.phase}).`,
    );
    if (paper.assignmentBrief?.trim()) {
        lines.push(
            isSpanish
                ? `Encuadre del paper: ${paper.assignmentBrief.trim()}`
                : `Paper framing: ${paper.assignmentBrief.trim()}`,
        );
    }

    // ── 2. Source roster ───────────────────────────────────────────
    const citableSources = paper.sources
        .filter(s => isCitableSourceType(s.sourceType))
        .slice()
        .sort((a, b) => a.order - b.order);
    if (citableSources.length > 0) {
        lines.push('');
        lines.push(
            isSpanish
                ? 'Fuentes configuradas en el trabajo (clave de cita → obra):'
                : 'Sources configured on the paper (citation key → work):',
        );
        for (const source of citableSources) {
            const key = source.citationKey?.trim() || source.displayLabel;
            lines.push(`- ${key} → ${source.displayLabel} [${source.sourceType}]`);
        }
    }

    // ── 3. Accepted verse analyses, budget-bounded ─────────────────
    // The verse the student has open goes first, so the budget can
    // never be the reason the tutor is blind to the one thing on
    // screen. Everything else follows in step order and fills what is
    // left. `currentStepId` is the paper's own cursor, so this needs
    // nothing threaded down from the UI.
    const analyzed = paper.steps
        .filter(s => s.kind === 'verse' && s.accepted?.canonicalAnalysis)
        .slice()
        .sort((a, b) => {
            if (a.id === paper.currentStepId) return -1;
            if (b.id === paper.currentStepId) return 1;
            return a.order - b.order;
        })
        .map(step => {
            const analysis = step.accepted!.canonicalAnalysis!;
            return {
                order: step.order,
                ref: formatPassageReference(
                    step.verseRef ?? analysis.reference,
                    language,
                ),
                briefing: serializeAnalysis(analysis, language),
            };
        });

    const included: Array<{ order: number; ref: string }> = [];
    const omitted: Array<{ order: number; ref: string }> = [];
    const kept: Array<{ order: number; briefing: string }> = [];
    let spent = 0;
    for (const entry of analyzed) {
        // +2 for the blank line that joins consecutive briefings.
        const cost = entry.briefing.length + 2;
        if (spent + cost > budget && included.length > 0) {
            omitted.push(entry);
            continue;
        }
        included.push(entry);
        kept.push(entry);
        spent += cost;
    }

    // Selection ran focus-first; presentation runs in reading order,
    // for the prompt and for the header that reports it.
    const byOrder = (a: { order: number }, b: { order: number }) => a.order - b.order;
    const includedVerses = included.slice().sort(byOrder).map(e => e.ref);
    const omittedVerses = omitted.slice().sort(byOrder).map(e => e.ref);
    const briefings = kept.slice().sort(byOrder).map(e => e.briefing);

    if (briefings.length > 0) {
        lines.push('');
        lines.push(
            isSpanish
                ? 'Análisis que el estudiante ya aceptó en este trabajo. Es la fuente autorizada para explicar qué se decidió y por qué: cita de aquí al responder, examina el razonamiento cuando el estudiante lo pida, y si algo no está en el análisis dilo en vez de suponerlo.\n'
                    + 'Cuando el estudiante pida la CITA EXACTA o el texto literal detrás de una atribución, búscala en el campo `verbatim:` de esa entrada y transcríbela tal cual, entre comillas. Si esa entrada no trae `verbatim:`, di exactamente eso —que el análisis registró la posición pero no guardó cita textual— y no la sustituyas por el texto de otra fuente ni por material recuperado de la biblioteca. Repetir el autor y la página NO es dar la cita: el estudiante ya los tiene, por eso pregunta.\n'
                    + 'Las citas de rango léxico (`general range = [...] (sources: ...)`) nunca llevan `verbatim:` — ese campo no existe para ellas. Cuando pregunten por una, di que el análisis no guardó texto literal Y transcribe las glosas que sí registró de esa fuente, aclarando que son el rango documentado y no una cita del libro. Es lo más cercano que hay, y callarlo deja al estudiante creyendo que no se guardó nada.'
                : "Analysis the student has already accepted on this paper. It is the authoritative source for what was decided and why: answer from it, examine its reasoning when the student asks, and when something is not in the analysis say so instead of assuming it.\n"
                    + "When the student asks for the EXACT quote or the literal wording behind an attribution, take it from that entry's `verbatim:` field and reproduce it as written, in quotes. If the entry carries no `verbatim:`, say precisely that — the analysis recorded the position but stored no quote — and do not substitute another source's text or material retrieved from the library. Repeating the author and page is NOT giving the quote: the student already has those, which is why they are asking.\n"
                    + "Lexical range citations (`general range = [...] (sources: ...)`) never carry `verbatim:` — the field does not exist for them. When asked about one, say the analysis stored no literal text AND transcribe the glosses it did record from that source, making clear they are the documented range and not a quotation from the book. It is the closest thing there is, and withholding it leaves the student believing nothing was recorded.",
        );
        if (omittedVerses.length > 0) {
            lines.push(
                isSpanish
                    ? `No caben aquí los versículos ${omittedVerses.join(', ')}: su análisis existe en el trabajo pero no está en este contexto. Dilo si la pregunta cae sobre ellos.`
                    : `The following verses did not fit: ${omittedVerses.join(', ')}. Their analysis exists on the paper but is not in this context. Say so if the question falls on them.`,
            );
        }
        lines.push('');
        lines.push(briefings.join('\n\n'));
    }

    return {
        text: lines.length > 0 ? lines.join('\n') : null,
        includedVerses,
        omittedVerses,
    };
}
