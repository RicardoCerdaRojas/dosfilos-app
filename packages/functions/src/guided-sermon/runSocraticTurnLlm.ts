import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { appCheckCallableOptions } from '../config/appCheckOptions';
import { GeminiLlmClient } from '../llm/GeminiLlmClient';
import type { ILlmClient } from '../llm/LlmClient';

/**
 * Phase 2.5 PR B (ADR-028) — Thin LLM proxy for the Faculty Socratic
 * Sermon Agent.
 *
 * The agent's orchestration (state machine, step policies, validators,
 * persistence) runs CLIENT-SIDE in the web application. This callable
 * exists ONLY to hold the LLM API key (server-only Firebase secret) and
 * forward the system prompt + user prompt that the client built from its
 * step policy. Opaque by design — the policy controls everything except
 * the key.
 *
 * Provider-swap point (memory: `tech_debt_llm_provider_abstraction`):
 * replace `GeminiLlmClient` with another `ILlmClient` adapter to change
 * provider. Client code is unaffected.
 *
 * Security: App Check enforced + auth required. The system prompt is
 * client-supplied — a rogue authenticated user could send arbitrary
 * prompts. Same risk surface as the other callables in this package
 * (`orientStudy`, `verifyTimelessPrinciple`). Rate limiting is a future
 * hardening item; for v1 the call cost is bounded per session by the
 * client-side state machine (one turn → one call).
 */

interface RequestPayload {
    system?: string;
    prompt?: string;
    temperature?: number;
    responseMimeType?: 'text/plain' | 'application/json';
    maxOutputTokens?: number;
}

export const runSocraticTurnLlm = onCall(
    { ...appCheckCallableOptions(), secrets: ['GEMINI_API_KEY'], timeoutSeconds: 60 },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new HttpsError('failed-precondition', 'GEMINI_API_KEY secret not configured');
        }

        const data = (request.data ?? {}) as RequestPayload;
        const prompt = String(data.prompt ?? '').trim();
        if (!prompt) {
            throw new HttpsError('invalid-argument', 'prompt is required.');
        }
        const system = data.system ? String(data.system) : undefined;
        const temperature = typeof data.temperature === 'number' ? data.temperature : undefined;
        const responseMimeType =
            data.responseMimeType === 'application/json' ? 'application/json' : 'text/plain';
        const maxOutputTokens =
            typeof data.maxOutputTokens === 'number' ? data.maxOutputTokens : undefined;

        try {
            const llm: ILlmClient = new GeminiLlmClient(apiKey);
            const text = await llm.generate({
                system,
                prompt,
                temperature,
                responseMimeType,
                maxOutputTokens,
            });
            return { text };
        } catch (err) {
            console.error('[runSocraticTurnLlm] llm failed', err);
            throw new HttpsError('internal', err instanceof Error ? err.message : 'LLM call failed');
        }
    },
);
