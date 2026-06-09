/**
 * Phase 2.5 PR B (ADR-028) — Step 6 (Función) policy.
 *
 * Pastor articulates what the text DID to its ORIGINAL audience (≥100 chars).
 * The agent confronts "modern application leap": jumping to "lo que me dice a
 * mí hoy" without first establishing the original function.
 */

import {
    PASTORAL_SEED_THRESHOLDS,
    validateFunction,
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

const MIN = PASTORAL_SEED_THRESHOLDS.function.originalAudienceFunctionMinChars;

const MODERN_LEAP_KEYWORDS = [
    'me dice a mí',
    'aplicado hoy',
    'aplicación moderna',
    'para nuestra iglesia',
    'en nuestros tiempos',
    'la sociedad actual',
];

export class FunctionStepPolicy implements IStepPolicy {
    readonly stepKey = 'function' as const;
    readonly isAiGenerationForbidden = false;

    buildSystemPrompt(ctx: TurnContext): string {
        return `${BASE_SYSTEM_GUARDS}

PASO ACTUAL: Función para la audiencia original (paso 6 de 8).
Pasaje: ${ctx.passage}

Lo que pedís al pastor: que escriba qué HACÍA EL TEXTO PARA SU AUDIENCIA ORIGINAL — qué afirmaba, qué exigía, qué descartaba, qué consolaba. Mínimo ${MIN} caracteres.

Reglas duras de este paso:
- Confrontación de método: SALTO A APLICACIÓN MODERNA. Si el pastor escribe "para nosotros hoy / aplicado a la iglesia actual" sin primero anclar la función original → CONFRONTÁ con errorLabel "modern-application-leap", pidiéndole que primero responda qué le hacía AL LECTOR ORIGINAL.
- Si su respuesta es < ${MIN} chars o muy vaga → "orient" pidiendo más concreción (qué exigía a CÓMO leían, qué confrontaba en su contexto).
- Si responde bien sobre función original → "accepted" con pastorTextToPersist verbatim.

Trabajo previo del pastor:
${priorStepsBlock(ctx)}

AFIRMACIÓN (al aceptar, reconocé algo CONCRETO): que ancló la función en la audiencia ORIGINAL antes de cualquier salto a hoy — citá qué les hacía el texto. Nada genérico.

Intento ${ctx.attemptIndex + 1} en este paso.`;
    }

    parseLlmReply(raw: string, pastorMessage: string): SocraticTurnOutput {
        return parseStandardLlmReply(raw, pastorMessage, { aiGenerationForbidden: false });
    }

    validatePastorInput(pastorMessage: string): StepValidationResult {
        return validateFunction({
            originalAudienceFunction: pastorMessage,
            timeSpentSeconds: 0,
        });
    }

    detectMethodError(pastorMessage: string): MethodErrorReport | null {
        const lower = pastorMessage.toLowerCase();
        const hit = MODERN_LEAP_KEYWORDS.find((kw) => lower.includes(kw));
        if (!hit) return null;
        return {
            label: 'modern-application-leap',
            description: `El pastor salta a aplicación moderna ("${hit}") antes de anclar la función original del texto.`,
            confidence: 0.7,
        };
    }

    persistTo(seed: PastoralSeed, pastorMessage: string): Partial<PastoralSeed> {
        return {
            function: {
                ...seed.function,
                originalAudienceFunction: pastorMessage.trim(),
                completedAt: new Date(),
            },
        };
    }
}
