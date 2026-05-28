/**
 * Phase 2.5 PR B (ADR-028) — Step 3 (Análisis Estructural) policy.
 *
 * Pastor identifies the main clause + writes a note about what it affirms /
 * what carries the argument. Agent validates length; confronts when the
 * pastor's note leans on lexical/morphological detail instead of structure
 * (that belongs to step 4 Palabras clave).
 */

import {
    PASTORAL_SEED_THRESHOLDS,
    validateStructuralAnalysis,
    type PastoralSeed,
} from '../../entities/PastoralSeed';
import type {
    MethodErrorReport,
    SocraticTurnOutput,
    StepValidationResult,
    TurnContext,
} from '../SocraticTurn';
import { BASE_SYSTEM_GUARDS, parseStandardLlmReply, priorStepsBlock } from './_shared';
import type { IStepPolicy } from './IStepPolicy';

const MIN = PASTORAL_SEED_THRESHOLDS.structuralAnalysis.pastorNoteMinChars;

/**
 * Pastor messages for the structural step expect a clause reference (e.g.
 * "Juan 1:1c") + a note. We accept either combined ("Juan 1:1c — la
 * cláusula climática…") or just the note text; the use case parses the
 * reference loosely.
 */
const REF_PATTERN = /\b\d?\s*[A-Za-zÁÉÍÓÚáéíóúñÑ]+\s*\d+[:.]\d+[a-c]?(?:-\d+[a-c]?)?\b/i;

export class StructuralAnalysisStepPolicy implements IStepPolicy {
    readonly stepKey = 'structuralAnalysis' as const;
    readonly isAiGenerationForbidden = false;

    buildSystemPrompt(ctx: TurnContext): string {
        return `${BASE_SYSTEM_GUARDS}

PASO ACTUAL: Análisis Estructural (paso 3 de 8).
Pasaje: ${ctx.passage}

Lo que pedís al pastor: que IDENTIFIQUE LA CLÁUSULA PRINCIPAL del pasaje (con su referencia, ej. "Juan 1:1c") + escriba qué AFIRMA esa cláusula y CÓMO LAS DEMÁS LA SOSTIENEN. Mínimo ${MIN} caracteres en la nota.

Reglas duras de este paso:
- ESTRUCTURA, no léxico. Si el pastor se mete en "predicado nominal sin artículo griego" / "verbo θεός" → CONFRONTÁ con "kind: confront", errorLabel "lexical-leakage", explicale que el léxico va en el paso 4 (Palabras clave) y reformulalo: "¿qué AFIRMA esta cláusula sobre el argumento del pasaje?".
- Si dice algo razonable sobre estructura pero corto (< ${MIN}) → "orient" pidiendo más detalle estructural (qué cláusula es climática, cuál prepara, cuál desarrolla).
- Si su nota es estructural y suficiente → "accepted" con pastorTextToPersist verbatim.
- Si no incluye referencia de la cláusula principal → "orient" pidiéndola.

Trabajo previo del pastor:
${priorStepsBlock(ctx)}

Intento ${ctx.attemptIndex + 1} en este paso.`;
    }

    parseLlmReply(raw: string, pastorMessage: string): SocraticTurnOutput {
        return parseStandardLlmReply(raw, pastorMessage, { aiGenerationForbidden: false });
    }

    validatePastorInput(pastorMessage: string): StepValidationResult {
        const refMatch = pastorMessage.match(REF_PATTERN);
        return validateStructuralAnalysis({
            mainClause: {
                reference: refMatch ? refMatch[0] : '',
                pastorNote: pastorMessage,
            },
            timeSpentSeconds: 0,
        });
    }

    detectMethodError(pastorMessage: string): MethodErrorReport | null {
        // Lexical leakage heuristic: pastor leans on Greek morphology terms.
        const lexicalKeywords = [
            'predicado nominal',
            'sin artículo',
            'morfología',
            'morfema',
            'lexema',
            'genitivo',
            'acusativo',
            'dativo',
            'vocativo',
        ];
        const lower = pastorMessage.toLowerCase();
        const hit = lexicalKeywords.find((kw) => lower.includes(kw));
        if (!hit) return null;
        return {
            label: 'lexical-leakage',
            description: `El pastor menciona "${hit}", que es léxico/morfología (paso 4), no estructura.`,
            confidence: 0.7,
        };
    }

    persistTo(seed: PastoralSeed, pastorMessage: string): Partial<PastoralSeed> {
        const refMatch = pastorMessage.match(REF_PATTERN);
        return {
            structuralAnalysis: {
                ...seed.structuralAnalysis,
                mainClause: {
                    reference: refMatch ? refMatch[0] : seed.structuralAnalysis?.mainClause?.reference ?? '',
                    pastorNote: pastorMessage.trim(),
                },
                completedAt: new Date(),
            },
        };
    }
}
