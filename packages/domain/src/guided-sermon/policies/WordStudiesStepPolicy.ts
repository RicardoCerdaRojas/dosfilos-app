/**
 * Phase 2.5 PR B (ADR-028) — Step 4 (Estudio de Palabras) policy.
 *
 * Pastor produces ≥2 word studies, each with: original-language form,
 * reference, and his own discovery (≥30 chars). In conversational form,
 * the pastor types something like:
 *
 *   1. λόγος (Juan 1:1): el Verbo es agente personal, no idea abstracta.
 *      Resuena con Génesis 1.
 *   2. ἀρχή (Juan 1:1): inicio absoluto, ecos creacionales.
 *
 * The policy parses the structure loosely (numbered list or "word (ref):
 * discovery" pattern). Validator requires ≥2 entries with ≥30-char
 * discoveries.
 */

import {
    PASTORAL_SEED_THRESHOLDS,
    validateWordStudies,
    type PastoralSeed,
    type WordStudy,
} from '../../entities/PastoralSeed';
import type {
    MethodErrorReport,
    SocraticTurnOutput,
    StepValidationResult,
    TurnContext,
} from '../SocraticTurn';
import { BASE_SYSTEM_GUARDS, parseStandardLlmReply, priorStepsBlock } from './_shared';
import type { IStepPolicy } from './IStepPolicy';

const T = PASTORAL_SEED_THRESHOLDS.wordStudies;

/**
 * Parse pastor message into WordStudy entries. Loose grammar:
 *   - One per line.
 *   - Format: "<word> (<ref>): <discovery>" OR "<n>. <word> (<ref>) <discovery>".
 *   - Falls back: the whole message as a single entry without ref.
 */
export function parseWordStudiesFromMessage(message: string): WordStudy[] {
    const lines = message.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
    const entries: WordStudy[] = [];
    const pattern = /^(?:\d+[.)\s-]+)?(?<word>[^\s(:]+)\s*(?:\((?<ref>[^)]+)\))?\s*[:\-—]?\s*(?<rest>.*)$/u;
    for (const line of lines) {
        const m = line.match(pattern);
        if (!m || !m.groups) continue;
        const word = m.groups.word?.trim() ?? '';
        const reference = m.groups.ref?.trim() ?? '';
        const pastorDiscovery = m.groups.rest?.trim() ?? '';
        if (!word || !pastorDiscovery) continue;
        entries.push({ word, reference, pastorDiscovery });
    }
    return entries;
}

export class WordStudiesStepPolicy implements IStepPolicy {
    readonly stepKey = 'wordStudies' as const;
    readonly isAiGenerationForbidden = false;

    buildSystemPrompt(ctx: TurnContext): string {
        return `${BASE_SYSTEM_GUARDS}

PASO ACTUAL: Estudio de Palabras (paso 4 de 8).
Pasaje: ${ctx.passage}

Lo que pedís al pastor: que produzca ≥${T.minWordStudies} ESTUDIOS DE PALABRAS clave del pasaje. Cada uno con:
- Palabra original (griega/hebrea, transliterada está bien)
- Referencia (en qué versículo aparece)
- Descubrimiento PROPIO del pastor (≥${T.pastorDiscoveryMinChars} caracteres por estudio)

Reglas duras de este paso:
- Si el pastor entrega < ${T.minWordStudies} estudios o algún descubrimiento es < ${T.pastorDiscoveryMinChars} chars → "orient" pidiendo más.
- Confrontación de método: si copia definiciones genéricas de diccionario sin descubrimiento PASTORAL/EXEGÉTICO propio → "orient" pidiendo aplicación al pasaje en estudio. (No es "confront" hard porque el método no está mal, solo está superficial.)
- Si entrega ≥${T.minWordStudies} con descubrimientos sustanciales → "accepted" con pastorTextToPersist = su mensaje verbatim (el sistema parsea los estudios).
- NUNCA propongas qué palabras estudiar (sí podés sugerirle EN orient "considera ἀρχή y λόγος" como datos, nunca como redacción).

Trabajo previo del pastor:
${priorStepsBlock(ctx)}

Intento ${ctx.attemptIndex + 1} en este paso.`;
    }

    parseLlmReply(raw: string, pastorMessage: string): SocraticTurnOutput {
        return parseStandardLlmReply(raw, pastorMessage, { aiGenerationForbidden: false });
    }

    validatePastorInput(pastorMessage: string): StepValidationResult {
        const studies = parseWordStudiesFromMessage(pastorMessage);
        return validateWordStudies({ studies, timeSpentSeconds: 0 });
    }

    detectMethodError(): MethodErrorReport | null {
        return null;
    }

    persistTo(seed: PastoralSeed, pastorMessage: string): Partial<PastoralSeed> {
        const studies = parseWordStudiesFromMessage(pastorMessage);
        return {
            wordStudies: {
                ...seed.wordStudies,
                studies,
                completedAt: new Date(),
            },
        };
    }
}
