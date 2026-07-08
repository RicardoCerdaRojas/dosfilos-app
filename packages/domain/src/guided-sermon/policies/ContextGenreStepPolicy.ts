/**
 * Phase 2.5 PR B (ADR-028) — Step 2 (Contexto y Género) policy.
 *
 * Genre is determined by the assistant (BookPanorama / inferGenreFromBook
 * deterministic map) BEFORE this step; this policy validates the pastor's
 * INTERPRETIVE IMPLICATION of the genre. The agent CONFRONTS when the
 * pastor's writing reveals he is reading the passage as a different
 * genre (the UC3 scenario from the Phase 1.6 smoke).
 */

import { detectGenreInText } from '../../bible/inferGenreFromBook';
import {
    PASTORAL_SEED_THRESHOLDS,
    resolveGenreProvenance,
    validateContextGenre,
    type PastoralSeed,
} from '../../entities/PastoralSeed';
import type { LiteraryGenre } from '../../exegesis/expository/BookPanorama';
import type {
    MethodErrorReport,
    SocraticTurnOutput,
    StepValidationResult,
    TurnContext,
} from '../SocraticTurn';
import { BASE_SYSTEM_GUARDS, buildInformationalFeatureNudge, parseStandardLlmReply, priorStepsBlock } from './_shared';
import type { IStepPolicy } from './IStepPolicy';

const MIN = PASTORAL_SEED_THRESHOLDS.contextGenre.genreImplicationMinChars;

/**
 * Local heuristic for the UC3 case: pastor writes "es profecía" / "como
 * apocalipsis" while the passage is a Gospel/letter. Confidence is intentionally
 * conservative — the LLM confronts more broadly via the prompt.
 */
const GENRE_MISMATCH_KEYWORDS: Record<string, string[]> = {
    evangelio: ['profecía', 'profeta', 'apocalipsis', 'predice', 'predicción', 'cumplirá', 'tribulación'],
    carta: ['profecía', 'apocalipsis', 'narrativa histórica'],
    'sabiduría': ['profecía', 'predicción literal'],
    'poesía': ['cronología literal', 'narrativa histórica'],
};

export class ContextGenreStepPolicy implements IStepPolicy {
    readonly stepKey = 'contextGenre' as const;
    readonly isAiGenerationForbidden = false;

    buildSystemPrompt(ctx: TurnContext): string {
        return `${BASE_SYSTEM_GUARDS}

PASO ACTUAL: Contexto y Género (paso 2 de 8).
Pasaje: ${ctx.passage}
${ctx.genre ? `Género identificado por el sistema: ${ctx.genre}` : 'Género: aún por confirmar con el pastor.'}

Lo que pedís al pastor: que escriba LA IMPLICANCIA INTERPRETATIVA del género para su lectura del pasaje (mínimo ${MIN} caracteres). Ej. "es Evangelio → narración teológica, leo buscando lo que afirma de Jesús" (no para copiar — solo para que entiendas el espíritu).

Confrontación de método ALTA prioridad en este paso:
- Si el pastor escribe algo que asume un GÉNERO DISTINTO al identificado (ej. trata un Evangelio como profecía apocalíptica con "todo se cumplirá") → CONFRONTÁ con "kind: confront", errorLabel "genre-mismatch", nombrale el género real + preguntale cómo cambia su regla de lectura.
- Si el género no fue confirmado todavía y el pastor escribe la implicancia → aceptá si tiene sentido para el género real.
- Si lo que escribió es muy corto (< ${MIN}) → "orient" pidiendo que profundice.
- Si es satisfactorio → "accepted" con pastorTextToPersist = su mensaje verbatim (sin tu redacción).

Trabajo previo del pastor:
${priorStepsBlock(ctx)}

AFIRMACIÓN (al aceptar, reconocé algo CONCRETO): que conectó el género con una regla de lectura coherente — citá cómo cambia su forma de leer el pasaje. Nada genérico.
${buildInformationalFeatureNudge(
            ctx,
            'contextGenre',
            'named-entity',
            'DATO DEL PERFIL — personas/lugares que piden trasfondo:',
            (f) => (f.typeKey === 'named-entity' ? `- ${f.name} (${f.verseRef})${f.note ? `: ${f.note}` : ''}` : ''),
            'Si el pastor no los ubica, recordale consultar su trasfondo histórico-cultural; él escribe qué aportan.',
        )}
Intento ${ctx.attemptIndex + 1} en este paso.`;
    }

    parseLlmReply(raw: string, pastorMessage: string): SocraticTurnOutput {
        return parseStandardLlmReply(raw, pastorMessage, { aiGenerationForbidden: false });
    }

    validatePastorInput(pastorMessage: string, ctx: TurnContext): StepValidationResult {
        // Fix C: the deterministic book genre is authoritative when present;
        // when it is missing (unrecognized book / legacy seed) the pastor's own
        // prose IS the source — recognize the genre he names.
        const genre = resolveEffectiveGenre(ctx.genre, pastorMessage);
        if (!genre) {
            // Safety net (fix A): no genre anywhere — book inference failed AND
            // the prose names none. The guided flow has no genre-confirm UI, so
            // don't dead-end the step; gate on the implication length alone.
            const len = pastorMessage.trim().length;
            return len >= MIN
                ? { valid: true, reasons: [] }
                : { valid: false, reasons: [`Implicancia del género requiere ≥${MIN} caracteres (actual: ${len}).`] };
        }
        return validateContextGenre({
            genre,
            // Present genre (book-inferred or prose-named) counts as confirmed:
            // the guided flow has no genre-confirm UI to satisfy.
            genreConfirmed: true,
            genreImplication: pastorMessage,
            bookLocationNote: '',
            historicalContextConsulted: false,
            timeSpentSeconds: 0,
        });
    }

    detectMethodError(pastorMessage: string, ctx: TurnContext): MethodErrorReport | null {
        const genre = (ctx.genre ?? '').toLowerCase();
        if (!genre) return null;
        const keys = Object.keys(GENRE_MISMATCH_KEYWORDS);
        const matchedFamily = keys.find((k) => genre.includes(k));
        if (!matchedFamily) return null;
        const flagged = GENRE_MISMATCH_KEYWORDS[matchedFamily];
        const msgLower = pastorMessage.toLowerCase();
        const hit = flagged.find((kw) => msgLower.includes(kw));
        if (!hit) return null;
        return {
            label: 'genre-mismatch',
            description: `El pastor usa lenguaje propio de un género distinto (palabra detectada: "${hit}") mientras el pasaje es ${matchedFamily}.`,
            confidence: 0.75,
        };
    }

    persistTo(seed: PastoralSeed, pastorMessage: string): Partial<PastoralSeed> {
        const existingGenre = seed.contextGenre?.genre ?? '';
        // The genre the pastor's prose names, if unambiguous (conservative:
        // single-family match or null). Drives BOTH the resolved genre when the
        // book gave none AND the provenance below.
        const namedByPastor = detectGenreInText(pastorMessage) ?? '';
        // Fix C: if the seed had no book-inferred genre, persist the one the
        // pastor named in his prose so it sticks for downstream steps.
        // Redacción v2 (§4.4) shadow-first: when the book DID infer a genre we do
        // NOT swap it here even if the pastor names another — the override is
        // only MEASURED (provenance + reason); the actual swap waits for enforce.
        const namedGenre = existingGenre ? '' : namedByPastor;
        const resolvedGenre = existingGenre || namedGenre || '';
        // Provenance = how the confirmed genre came to be: proposed genre vs the
        // one the pastor pronounced. No pronouncement → aiProposed; same → kept;
        // different → override (registered, not acted on in shadow).
        const genreProvenance = resolveGenreProvenance(existingGenre, namedByPastor);
        return {
            contextGenre: {
                ...seed.contextGenre,
                genre: resolvedGenre,
                genreConfirmed: Boolean(resolvedGenre),
                genreProvenance,
                genreOverrideReason:
                    genreProvenance === 'userOverride'
                        ? pastorMessage.trim()
                        : seed.contextGenre?.genreOverrideReason,
                genreImplication: pastorMessage.trim(),
                completedAt: new Date(),
            },
        };
    }
}

/**
 * The genre to validate against: the deterministic book genre when the seed has
 * one, otherwise the genre the pastor names in his prose (fix C). Returns ''
 * when neither is available.
 */
function resolveEffectiveGenre(ctxGenre: string | undefined, pastorMessage: string): LiteraryGenre | '' {
    if (ctxGenre) return ctxGenre as LiteraryGenre;
    return detectGenreInText(pastorMessage) ?? '';
}
