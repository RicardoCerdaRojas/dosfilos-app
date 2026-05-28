/**
 * Phase 2.5 PR B (ADR-028) — Client-side `ILlmClient` adapter that proxies
 * LLM calls to the `runSocraticTurnLlm` Cloud Function.
 *
 * Why: the use case runs CLIENT-SIDE (application services depend on
 * `@dosfilos/infrastructure` Firestore adapters), but the LLM API key is
 * SERVER-ONLY (a Firebase secret). The agent's per-turn LLM call goes
 * through a thin opaque callable that holds the key and forwards the
 * options. App Check + auth enforced on the callable.
 *
 * Provider-agnostic: the callable picks the model. To swap providers later
 * (tech-debt: `tech_debt_llm_provider_abstraction`), only the callable's
 * adapter changes — this client and the use case stay intact.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import type { ILlmClient, LlmGenerateOptions } from '@dosfilos/domain';

export class CallableLlmClient implements ILlmClient {
    async generate(options: LlmGenerateOptions): Promise<string> {
        const callable = httpsCallable(getFunctions(), 'runSocraticTurnLlm');
        const response = await callable(options);
        const data = response.data as { text?: string };
        if (!data?.text || typeof data.text !== 'string') {
            throw new Error('runSocraticTurnLlm returned no text.');
        }
        return data.text;
    }
}
