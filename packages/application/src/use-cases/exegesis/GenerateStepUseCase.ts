import type {
    ExegeticalStep,
    ExegeticalStepKind,
    ExegeticalStepVersion,
    GenerateStepInput,
    IExegeticalPaperRepository,
    PassageReference,
} from '@dosfilos/domain';
import {
    EMPTY_VERIFICATION_SUMMARY,
    formatPassageReference,
} from '@dosfilos/domain';

/**
 * Generates content for a single step.
 *
 * **D.1 placeholder mode**: this use case currently produces deterministic
 * mock markdown so the entire state-machine flow (pending → generating
 * → awaiting-review → accepted, regeneration with hints, manual edits)
 * can be validated end-to-end without burning Gemini tokens. The
 * placeholder format mirrors what the real prompt template will
 * produce (Greek text, translation, morphology, syntax, sources,
 * conclusion) so the UI can be styled now and the swap to live
 * generation in D.2 is a one-spot change.
 *
 * The use case orchestrates:
 *   1. Read the paper + step (validating ownership, step exists, kind).
 *   2. State transition: pending|awaiting-review → generating
 *      (records intent so the UI shows a spinner).
 *   3. Produce markdown (mock for D.1; Gemini Pro 2.5 + retrieval for D.2).
 *   4. Append the new version + transition to awaiting-review.
 *
 * If step 3 throws, step 4 doesn't run — caller should reset state to
 * 'failed' via `setStepState`. v1 leaves that to the caller (web layer)
 * so failed states are visible in the UI.
 */
export class GenerateStepUseCase {
    constructor(private paperRepository: IExegeticalPaperRepository) { }

    async execute(input: GenerateStepInput): Promise<ExegeticalStepVersion> {
        if (!input.ownerId || !input.paperId || !input.stepId) {
            throw new Error('GenerateStepUseCase: ownerId, paperId and stepId required');
        }

        const paper = await this.paperRepository.getPaper(input.ownerId, input.paperId);
        if (!paper) {
            throw new Error(`Paper ${input.paperId} not found`);
        }
        const step = paper.steps.find(s => s.id === input.stepId);
        if (!step) {
            throw new Error(`Step ${input.stepId} not found`);
        }

        // Mark generating so the UI flips to a spinner immediately. The
        // version append below will flip back to awaiting-review.
        await this.paperRepository.setStepState(input.ownerId, input.paperId, input.stepId, 'generating');

        // ── PLACEHOLDER GENERATION ────────────────────────────────────
        // Replaced in D.2 with: retrieval (style guide chunks + project
        // source chunks scoped by role) → Gemini Pro 2.5 streaming with
        // the TMS prompt template → token accounting.
        const markdown = buildPlaceholderMarkdown({
            kind: step.kind,
            verseRef: step.verseRef,
            paperLanguage: paper.displayLanguage,
            hint: input.regenerationHint,
        });

        const parentVersionId = step.current?.id ?? null;
        const version = await this.paperRepository.appendStepVersion(
            input.ownerId,
            input.paperId,
            input.stepId,
            {
                markdown,
                origin: 'generated',
                parentVersionId,
                modelId: 'placeholder-d1',
                regenerationHint: input.regenerationHint ?? null,
                tokensUsed: null,
                verifications: { ...EMPTY_VERIFICATION_SUMMARY },
            }
        );

        return version;
    }
}

// ── Placeholder content ─────────────────────────────────────────────────
//
// Mocks the SHAPE of what the real generator will produce per step kind,
// so the UI is built against realistic-looking content. The real
// generation in D.2 swaps the body of the relevant branch without
// changing the use case structure.

function buildPlaceholderMarkdown(input: {
    kind: ExegeticalStepKind;
    verseRef: PassageReference | null;
    paperLanguage: 'es' | 'en';
    hint: string | undefined;
}): string {
    const lang = input.paperLanguage;
    const verseLabel = input.verseRef ? formatPassageReference(input.verseRef, lang) : '';
    const hintLine = input.hint
        ? (lang === 'en'
            ? `> _Regeneration hint applied: ${input.hint}_\n\n`
            : `> _Hint de regeneración aplicado: ${input.hint}_\n\n`)
        : '';
    const placeholderBanner = lang === 'en'
        ? `> ⚠️ **Placeholder content** — this is a deterministic mock so the wizard flow can be validated. Live Gemini generation lands in the next commit (D.2).\n\n`
        : `> ⚠️ **Contenido placeholder** — este es un mock determinístico para validar el flujo del wizard. La generación en vivo con Gemini llega en el próximo commit (D.2).\n\n`;

    switch (input.kind) {
        case 'verse':
            return placeholderBanner + hintLine + (lang === 'en'
                ? `## ${verseLabel}\n\n` +
                `**Greek text:** Πολυμερῶς καὶ πολυτρόπως πάλαι ὁ θεὸς λαλήσας τοῖς πατράσιν ἐν τοῖς προφήταις\n\n` +
                `**Translation:** _placeholder translation_\n\n` +
                `**Morphology:** _placeholder morphology of key forms_\n\n` +
                `**Syntax:** _placeholder syntactic analysis of clauses, participles, and modifiers_\n\n` +
                `**Sources:** _placeholder interaction with the configured corpus_\n\n` +
                `**Conclusion:** _placeholder conclusion explaining how this verse contributes to the passage's argument_`
                : `## ${verseLabel}\n\n` +
                `**Texto griego:** Πολυμερῶς καὶ πολυτρόπως πάλαι ὁ θεὸς λαλήσας τοῖς πατράσιν ἐν τοῖς προφήταις\n\n` +
                `**Traducción:** _traducción placeholder_\n\n` +
                `**Análisis morfológico:** _análisis placeholder de las formas relevantes_\n\n` +
                `**Análisis sintáctico:** _análisis placeholder de cláusulas, participios y modificadores_\n\n` +
                `**Interacción con fuentes:** _interacción placeholder con el corpus configurado_\n\n` +
                `**Conclusión:** _conclusión placeholder sobre cómo este verso contribuye al argumento del pasaje_`);

        case 'conclusion':
            return placeholderBanner + hintLine + (lang === 'en'
                ? `## Conclusion\n\nPlaceholder conclusion synthesizing the accepted verse-level analyses without introducing new arguments.`
                : `## Conclusión\n\nConclusión placeholder que sintetiza los análisis verso a verso aceptados, sin introducir argumentos nuevos.`);

        case 'introduction':
            return placeholderBanner + hintLine + (lang === 'en'
                ? `## Introduction\n\nPlaceholder introduction. Written last, placed first in the assembled paper. Carries the thesis the analysis actually demonstrated, plus a brief methodology statement.`
                : `## Introducción\n\nIntroducción placeholder. Escrita al final, ubicada primero en el documento ensamblado. Lleva la tesis que el análisis efectivamente demostró, más una breve declaración metodológica.`);

        case 'assembly':
            return placeholderBanner + hintLine + (lang === 'en'
                ? `## Assembled paper preview\n\nThis step concatenates introduction → verses (in canonical order) → conclusion → bibliography. The current implementation is mechanical (no TMS footnote formatter yet — that's v1.5).`
                : `## Vista previa del trabajo ensamblado\n\nEste paso concatena introducción → versos (en orden canónico) → conclusión → bibliografía. La implementación actual es mecánica (sin formateador TMS de notas al pie — eso va en v1.5).`);
    }
}
